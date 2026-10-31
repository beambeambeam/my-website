// Twist, a texture by Textures (https://textures.dev/s/twist). Free to use.
import { DIA_COLORS } from "@my-website/ui/lib/dia-colors";
import { cn } from "@my-website/ui/lib/utils";
import { useEffect, useRef } from "react";

/** Size of the SVG view box. The texture covers its box like `object-fit: cover`. */
const W = 732;
const H = 516;

const COLS = 25;
const ROWS = 18;
const CELL_W = 27;
const CELL_H = 26;
const X0 = 17;
const Y0 = 17;
const PITCH_X = (714 - X0 - CELL_W) / (COLS - 1);
const PITCH_Y = (498 - Y0 - CELL_H) / (ROWS - 1);

/** Bar width at rest, the widest bar, and the bar length. */
const T_MIN = 3.75;
const T_MAX = 26.5;
const BAR_LEN = 44;
const STRETCH_MAX = T_MAX / T_MIN;

/** Below this size in px the texture stays at rest. */
const MIN_W = 160;
const MIN_H = 112;

/** On touch screens the pointer follows a loop instead. */
const AMBIENT_SPEED = 1.5;
const AMBIENT_W = (2 * Math.PI) / 4.5;

/** How sharply bars widen when they face the pointer. */
const ALIGN = 3;

/** Bars ease faster near the pointer, and slower on the way home. In seconds. */
const REACH = 260;
const TAU_NEAR = 0.035;
const TAU_FAR = 0.06;
const TAU_HOME = 0.16;

/** Snap to the target inside these limits, and skip style writes for smaller changes. */
const DEAD_A = 0.6;
const DEAD_S = 0.04;
const WRITE_A = 0.2;
const WRITE_S = 0.01;

interface Point {
  x: number;
  y: number;
}

/** Pointer in view box units. `active` eases from 0 at rest to 1 while the pointer is in. */
interface Pointer extends Point {
  active: number;
  reduced: boolean;
}

interface Bar {
  angle: number;
  stretch: number;
  writtenAngle: number;
  writtenStretch: number;
}

/** Where the view box sits inside the SVG box, in px. */
interface Box {
  left: number;
  top: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Top-left corner of a cell, and the Dia color its bar turns as it widens. */
interface Cell extends Point {
  color: string;
}

/** Color at `t` from 0 to 1 along the Dia colors, from pink to lime. */
const diaAt = (t: number) => {
  const scaled = t * (DIA_COLORS.length - 1);
  const index = Math.min(Math.floor(scaled), DIA_COLORS.length - 2);
  const from = DIA_COLORS[index] ?? "";
  const to = DIA_COLORS[index + 1] ?? from;

  return `color-mix(in oklab, ${from}, ${to} ${Math.round((scaled - index) * 100)}%)`;
};

/** Row by row. The Dia colors run from the top-left corner to the bottom-right corner. */
const CELLS: Cell[] = Array.from({ length: ROWS * COLS }, (_, index) => {
  const col = index % COLS;
  const row = Math.floor(index / COLS);

  return {
    x: Math.round((X0 + col * PITCH_X) * 100) / 100,
    y: Math.round((Y0 + row * PITCH_Y) * 100) / 100,
    color: diaAt((col / (COLS - 1) + row / (ROWS - 1)) / 2),
  };
});

/** Wraps an angle in degrees to -90..90, because a bar looks the same turned by 180°. */
const arc = (deg: number) => (((deg % 180) + 270) % 180) - 90;

const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(update: slow)").matches;

/** A slow loop over the whole view box. */
const ambientPoint = (time: number, phase: number): Point => ({
  x:
    W / 2 +
    (W / 2) *
      (0.76 * Math.sin(AMBIENT_W * time + phase) +
        0.2 * Math.sin(1.93 * AMBIENT_W * time + 1.2 + phase)),
  y:
    H / 2 +
    (H / 2) *
      (0.72 * Math.sin(0.75 * AMBIENT_W * time + 0.8 + phase) +
        0.2 * Math.sin(1.37 * AMBIENT_W * time + 2.1 + phase)),
});

/** One step of a critically damped spring toward `target`. */
const spring = (value: number, velocity: number, target: number, dt: number) => {
  const decay = Math.exp(-30 * dt);
  const offset = value - target;
  const lead = velocity + 30 * offset;

  return {
    value: target + (offset + lead * dt) * decay,
    velocity: (velocity - 30 * lead * dt) * decay,
  };
};

/** Turns one bar toward the pointer and widens it. Returns true while the bar still moves. */
const stepBar = (bar: Bar, cell: Point, { x, y, active, reduced }: Pointer, dt: number) => {
  const dx = x - (cell.x + CELL_W / 2);
  const dy = y - (cell.y + CELL_H / 2);
  const distance = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);
  const facing = distance < 1 ? 1 : Math.abs(Math.cos(2 * theta)) ** ALIGN;
  const angle = active > 0 ? arc((theta * 180) / Math.PI - 90) * active : 0;
  const stretch = 1 + (STRETCH_MAX - 1) * facing * active;

  if (reduced) {
    bar.angle = angle;
    bar.stretch = stretch;

    return false;
  }

  const tau =
    active > 0 ? TAU_NEAR + (TAU_FAR - TAU_NEAR) * Math.min(1, distance / REACH) : TAU_HOME;

  const k = 1 - Math.exp(-dt / tau);

  bar.angle += arc(angle - bar.angle) * k;
  bar.stretch += (stretch - bar.stretch) * k;

  if (Math.abs(arc(angle - bar.angle)) < DEAD_A) {
    bar.angle = angle;
  }

  if (Math.abs(stretch - bar.stretch) < DEAD_S) {
    bar.stretch = stretch;
  }

  return bar.angle !== angle || bar.stretch !== stretch;
};

/**
 * Writes the bar transform and fill only when they changed enough to see. A resting bar keeps the
 * text color. A widening bar mixes in its Dia color, all of it at the widest.
 */
const writeBar = (bar: Bar, cell: Cell, element: SVGRectElement | null) => {
  const atRest = bar.angle === 0 && bar.stretch === 1;

  const changed =
    Math.abs(bar.angle - bar.writtenAngle) > WRITE_A ||
    Math.abs(bar.stretch - bar.writtenStretch) > WRITE_S ||
    (atRest && (bar.writtenAngle !== 0 || bar.writtenStretch !== 1));

  if (!changed || element === null) {
    return;
  }

  bar.writtenAngle = bar.angle;
  bar.writtenStretch = bar.stretch;
  const mix = Math.round(Math.min(Math.max((bar.stretch - 1) / (STRETCH_MAX - 1), 0), 1) * 100);

  element.style.transform = atRest
    ? ""
    : `rotate(${bar.angle.toFixed(2)}deg) scaleX(${bar.stretch.toFixed(3)})`;
  element.style.fill = mix === 0 ? "" : `color-mix(in oklab, currentColor, ${cell.color} ${mix}%)`;
};

/**
 * Tracks the pointer over `root` and calls `draw` each frame until everything rests. On touch
 * screens it follows a slow loop while the texture is on screen. Returns a cleanup function.
 */
const runEngine = (
  root: HTMLElement,
  svg: SVGSVGElement,
  draw: (pointer: Pointer, dt: number) => boolean,
) => {
  const touchMq = matchMedia("(hover: none), (pointer: coarse)");
  const reducedMq = matchMedia("(prefers-reduced-motion: reduce)");
  const phase = Math.random() * 2 * Math.PI;
  let onScreen = false;
  let ambient = false;
  let clock = 0;
  let hold = 0;
  let box: Box | null = null;
  let point: Point = { x: W / 2, y: H / 2 };
  let client: Point = { x: 0, y: 0 };
  let active = 0;
  let target = 0;
  let velocity = 0;
  let frame = 0;
  let last = 0;
  let lastMoveAt = 0;

  const measure = () => {
    const rect = svg.getBoundingClientRect();

    if (rect.width < MIN_W || rect.height < MIN_H) {
      box = null;

      return box;
    }

    const scale = Math.max(rect.width / W, rect.height / H);

    box = {
      left: rect.left,
      top: rect.top,
      scale,
      offsetX: (rect.width - W * scale) / 2,
      offsetY: (rect.height - H * scale) / 2,
    };

    return box;
  };

  const aim = (at: Box) => {
    point = {
      x: (client.x - at.left - at.offsetX) / at.scale,
      y: (client.y - at.top - at.offsetY) / at.scale,
    };
  };

  const tick = (now: number) => {
    const dt = Math.min(last === 0 ? 1 / 60 : (now - last) / 1000, 1 / 30);
    const reduced = prefersReducedMotion();
    let moving = false;

    last = now;

    if (ambient && now > hold) {
      if (reduced) {
        target = 0;
      } else {
        clock += dt * AMBIENT_SPEED;
        point = ambientPoint(clock, phase);
        target = 1;
        moving = true;
      }
    }

    if (reduced) {
      active = target;
      velocity = 0;
    } else {
      ({ value: active, velocity } = spring(active, velocity, target, dt));

      if (Math.abs(velocity) < 0.02 && Math.abs(active - target) < 0.02) {
        active = target;
        velocity = 0;
      } else {
        moving = true;
      }
    }

    const more = draw({ ...point, active, reduced }, dt);

    if (moving || more) {
      frame = requestAnimationFrame(tick);
    } else {
      frame = 0;
      last = 0;
    }
  };

  const wake = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(tick);
    }
  };

  const settle = () => {
    const next = onScreen && !document.hidden && touchMq.matches;

    if (next === ambient) {
      return;
    }

    ambient = next && measure() !== null;

    if (!ambient) {
      target = 0;
    }

    wake();
  };

  /** Touch screens use the loop, so touch input does not move the pointer. */
  const isAmbientTouch = (event: Event) =>
    event instanceof PointerEvent && event.pointerType === "touch" && touchMq.matches;

  const onEnter = (event: PointerEvent) => {
    if (!isAmbientTouch(event)) {
      measure();
    }
  };

  const onMove = (event: PointerEvent) => {
    if (isAmbientTouch(event)) {
      return;
    }

    const now = performance.now();
    const at = box === null || now - lastMoveAt > 250 ? measure() : box;

    lastMoveAt = now;

    if (at === null) {
      return;
    }

    if (!event.isTrusted) {
      hold = now + 1000;
    }

    client = { x: event.clientX, y: event.clientY };
    aim(at);
    target = 1;
    wake();
  };

  const onLeave = (event: Event) => {
    if (isAmbientTouch(event)) {
      return;
    }

    if (!event.isTrusted) {
      hold = 0;
    }

    if (ambient && performance.now() > hold) {
      return;
    }

    target = 0;
    wake();
  };

  const onFocus = () => {
    if (measure() === null) {
      return;
    }

    point = { x: W / 2, y: H / 2 };
    target = 1;
    wake();
  };

  const onResize = () => {
    if (box !== null || ambient) {
      measure();
    }

    if (ambient && box === null) {
      ambient = false;
    }

    settle();
  };

  const onScroll = () => {
    if (box === null || target !== 1 || (ambient && performance.now() > hold)) {
      return;
    }

    const at = measure();

    if (at !== null) {
      aim(at);
      wake();
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      settle();
    },
    { threshold: 0.2 },
  );

  const host = root.closest("a, button, [tabindex]") ?? root.parentElement ?? root;

  observer.observe(svg);
  document.addEventListener("visibilitychange", settle);
  touchMq.addEventListener("change", settle);
  reducedMq.addEventListener("change", wake);
  root.addEventListener("pointerenter", onEnter);
  root.addEventListener("pointermove", onMove, { passive: true });
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("pointercancel", onLeave);
  host.addEventListener("focusin", onFocus);
  host.addEventListener("focusout", onLeave);
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });

  return () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", settle);
    touchMq.removeEventListener("change", settle);
    reducedMq.removeEventListener("change", wake);
    root.removeEventListener("pointerenter", onEnter);
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerleave", onLeave);
    root.removeEventListener("pointercancel", onLeave);
    host.removeEventListener("focusin", onFocus);
    host.removeEventListener("focusout", onLeave);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll, { capture: true });
    cancelAnimationFrame(frame);
  };
};

interface TwistProps {
  className?: string;
}

/**
 * A grid of short bars that turn toward the pointer and widen when they face it. Fills its parent,
 * which must have a size. Draws in the foreground color on the background color.
 */
export const Twist = ({ className }: TwistProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const barRefs = useRef<(SVGRectElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;

    const bars: Bar[] = CELLS.map(() => ({
      angle: 0,
      stretch: 1,
      writtenAngle: 0,
      writtenStretch: 1,
    }));

    const draw = (pointer: Pointer, dt: number) => {
      let moving = false;

      for (const [index, bar] of bars.entries()) {
        const cell = CELLS[index];

        if (cell !== undefined) {
          moving = stepBar(bar, cell, pointer, dt) || moving;
          writeBar(bar, cell, barRefs.current[index] ?? null);
        }
      }

      return moving;
    };

    const stop = root !== null && svg !== null ? runEngine(root, svg, draw) : null;

    return () => {
      stop?.();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-texture="twist"
      className={cn(
        "relative isolate size-full overflow-clip bg-background text-foreground contain-layout contain-paint contain-style",
        className,
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
        fill="currentColor"
        className="absolute inset-0 block size-full"
      >
        {CELLS.map(({ x, y }, index) => (
          <svg
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={CELL_W}
            height={CELL_H}
            viewBox={`0 0 ${CELL_W} ${CELL_H}`}
            overflow="hidden"
          >
            <rect
              ref={(element) => {
                barRefs.current[index] = element;
              }}
              x={(CELL_W - T_MIN) / 2}
              y={(CELL_H - BAR_LEN) / 2}
              width={T_MIN}
              height={BAR_LEN}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          </svg>
        ))}
      </svg>
    </div>
  );
};
