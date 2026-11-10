import { readPalette } from "./palette";
import { AsciiRenderer } from "./renderer";
import { World } from "./world";

const STEP = 1 / 60;
const MAX_STEPS = 4;

/** Sim time that runs before a still frame, so the schools have formed. */
const SETTLE_TIME = 4;

/**
 * Connects a World and an AsciiRenderer to a canvas: a fixed-timestep loop, resize, pointer input
 * on the canvas, theme changes, a pause while off screen or in a hidden tab, and a still frame for
 * reduced motion. Sets `data-ready` on the canvas after the first frame.
 */
export class OceanEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly world: World;
  private readonly renderer: AsciiRenderer;
  private readonly reducedMotion: MediaQueryList;
  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private readonly themeObserver: MutationObserver;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private onScreen = false;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, swimmerScale: number) {
    this.canvas = canvas;
    this.world = new World(swimmerScale);
    this.renderer = new AsciiRenderer(canvas, readPalette(canvas));
    this.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.intersectionObserver = new IntersectionObserver((entries) => {
      this.onScreen = entries.some((entry) => entry.isIntersecting);
      this.schedule();
    });
    // The theme is a class on the root element.
    this.themeObserver = new MutationObserver(() => {
      this.renderer.setPalette(readPalette(canvas));
      this.drawStillIfPaused();
    });

    this.resizeObserver.observe(canvas);
    this.intersectionObserver.observe(canvas);
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    this.reducedMotion.addEventListener("change", this.schedule);
    document.addEventListener("visibilitychange", this.schedule);
    canvas.addEventListener("pointermove", this.onPointerMove, { passive: true });
    canvas.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("pointercancel", this.onPointerLeave);

    this.resize();
    void this.loadFont();
  }

  /** Canvas text can't start a webfont load, so redraw once the mono face is in. */
  private async loadFont() {
    try {
      await document.fonts.load(`600 16px ${getComputedStyle(this.canvas).fontFamily}`);
    } catch {
      return;
    }

    this.drawStillIfPaused();
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.themeObserver.disconnect();
    this.reducedMotion.removeEventListener("change", this.schedule);
    document.removeEventListener("visibilitychange", this.schedule);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    this.canvas.removeEventListener("pointercancel", this.onPointerLeave);
  }

  private get animating() {
    return !this.disposed && this.onScreen && !document.hidden && !this.reducedMotion.matches;
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();

    if (rect.width < 1 || rect.height < 1) {
      return;
    }

    const dpr = Math.min(devicePixelRatio || 1, 2);

    this.renderer.resize(rect.width, rect.height, dpr);
    this.world.resize(rect.width, rect.height, this.renderer.cellWidth, this.renderer.cellHeight);
    this.drawStillIfPaused();
  }

  private readonly schedule = () => {
    cancelAnimationFrame(this.raf);
    this.raf = 0;

    if (this.animating) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.drawStillIfPaused();
    }
  };

  private readonly frame = (now: number) => {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    let steps = 0;

    this.last = now;
    this.acc += dt;

    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.world.step(STEP);
      this.acc -= STEP;
      steps += 1;
    }

    if (steps === MAX_STEPS) {
      this.acc = 0;
    }

    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw() {
    this.renderer.render(this.world);
    this.canvas.dataset.ready = "";
  }

  /**
   * With reduced motion, lets the schools form and then shows one frame. Also redraws a paused
   * canvas after a resize or a theme change.
   */
  private drawStillIfPaused() {
    if (this.disposed || this.raf !== 0 || this.world.width === 0) {
      return;
    }

    while (this.world.time < SETTLE_TIME) {
      this.world.step(STEP);
    }

    this.draw();
  }

  private toLocal(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();

    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const { x, y } = this.toLocal(event);
    const { pointer } = this.world;

    pointer.x = x;
    pointer.y = y;
    pointer.active = event.pointerType !== "touch";
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    if (this.animating) {
      const { x, y } = this.toLocal(event);

      this.world.splash(x, y);
    }
  };

  private readonly onPointerLeave = () => {
    this.world.pointer.active = false;
  };
}
