import { animate } from "motion/react";
import type { AnimationPlaybackControls } from "motion/react";

export const DIA_COLORS = ["#f0abfc", "#f472b6", "#fb923c", "#facc15", "#a3e635"];

/** Pixel block sizes of the steps, from coarse to fine, as a fraction of the source unit. */
const STEPS = [0.3, 0.15, 0.075];

/** Maximum random delay of a cell, as a fraction of the step width. */
const CELL_JITTER = 0.6;

/** Minimum cell alpha (0–255) to count as part of the shape. */
const ALPHA_THRESHOLD = 64;

/** Direction the sweep front moves in. */
export type SweepDirection = "right" | "up" | "down";

/** Shape that the pixel blocks follow. */
export interface SweepSource {
  /** Base size in px for the pixel blocks and step zones. Defaults to the shorter element side. */
  unit?: number;
  /** Paints the shape in an opaque color, in element coordinates. */
  paint?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

interface Cell {
  x: number;
  y: number;
  size: number;
  /** Distance of the cell center along the sweep direction, plus a random delay. */
  position: number;
}

interface Layout {
  width: number;
  height: number;
  /** Distance the front travels across the element. */
  length: number;
  stepWidth: number;
  /** Cells of each step, from coarse to fine. */
  steps: Cell[][];
}

const transformText = (text: string, transform: string) => {
  if (transform === "uppercase") {
    return text.toUpperCase();
  }

  if (transform === "lowercase") {
    return text.toLowerCase();
  }

  return text;
};

/** Returns a source that paints `text` with the font of `element`. */
export const getTextSource = async (element: HTMLElement, text: string): Promise<SweepSource> => {
  await document.fonts.ready;

  const style = getComputedStyle(element);
  const shownText = transformText(text, style.textTransform);

  return {
    unit: Number(style.fontSize.replace("px", "")),
    paint: (ctx, _width, height) => {
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
      const metrics = ctx.measureText(shownText);
      const ascent = metrics.fontBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent;
      ctx.fillText(shownText, 0, (height - ascent - descent) / 2 + ascent);
    },
  };
};

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

const loadImage = async (src: string) => {
  const image = new Image();
  image.src = src;

  try {
    await image.decode();

    return image;
  } catch {
    return null;
  }
};

/** Returns a source that paints the image at `src`, contained and centered. */
export const getImageSource = async (src: string | null): Promise<SweepSource> => {
  if (src === null) {
    return {};
  }

  let image = imageCache.get(src);

  if (image === undefined) {
    image = loadImage(src);
    imageCache.set(src, image);
  }

  const loaded = await image;

  if (loaded === null) {
    return {};
  }

  return {
    paint: (ctx, width, height) => {
      const scale = Math.min(width / loaded.naturalWidth, height / loaded.naturalHeight);
      const drawWidth = loaded.naturalWidth * scale;
      const drawHeight = loaded.naturalHeight * scale;
      ctx.drawImage(
        loaded,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    },
  };
};

const measure = (
  element: HTMLElement,
  source: SweepSource,
  direction: SweepDirection,
  stepSize: number,
): Layout => {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const unit = source.unit ?? Math.min(width, height);
  const stepWidth = unit * stepSize;

  const getPosition = (x: number, y: number) => {
    if (direction === "right") {
      return x;
    }

    return direction === "down" ? y : height - y;
  };

  const steps = STEPS.map((ratio) => {
    const size = Math.max(1, Math.round(unit * ratio));
    const columns = Math.ceil(width / size);
    const rows = Math.ceil(height / size);
    const canvas = document.createElement("canvas");
    canvas.width = columns;
    canvas.height = rows;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (ctx === null || source.paint === undefined) {
      return [];
    }

    ctx.scale(1 / size, 1 / size);
    source.paint(ctx, width, height);

    const { data } = ctx.getImageData(0, 0, columns, rows);
    const cells: Cell[] = [];

    for (let cell = 0; cell < columns * rows; cell += 1) {
      if (data[cell * 4 + 3] >= ALPHA_THRESHOLD) {
        const x = (cell % columns) * size;
        const y = Math.floor(cell / columns) * size;
        const jitter = Math.random() * CELL_JITTER * stepWidth;

        cells.push({ x, y, size, position: getPosition(x + size / 2, y + size / 2) + jitter });
      }
    }

    return cells;
  });

  return { width, height, length: direction === "right" ? width : height, stepWidth, steps };
};

/** Returns the clip path that hides `hidden` of the element, from the end of the sweep back. */
const getClipPath = (direction: SweepDirection, hidden: string) => {
  if (direction === "right") {
    return `inset(0 ${hidden} 0 0)`;
  }

  return direction === "down" ? `inset(0 0 ${hidden} 0)` : `inset(${hidden} 0 0 0)`;
};

const createGradient = (
  ctx: CanvasRenderingContext2D,
  direction: SweepDirection,
  layout: Layout,
  front: number,
  sharp: number,
) => {
  if (direction === "right") {
    return ctx.createLinearGradient(front, 0, sharp, 0);
  }

  return direction === "down"
    ? ctx.createLinearGradient(0, front, 0, sharp)
    : ctx.createLinearGradient(0, layout.height - front, 0, layout.height - sharp);
};

/** Draws the pixel zone behind `front` and returns the position where the sharp element starts. */
const draw = (
  ctx: CanvasRenderingContext2D,
  direction: SweepDirection,
  layout: Layout,
  front: number,
  colors: string[],
) => {
  const { stepWidth, steps } = layout;
  const sharp = front - stepWidth * steps.length;
  const gradient = createGradient(ctx, direction, layout, front, sharp);

  for (const [index, color] of colors.entries()) {
    gradient.addColorStop(index / Math.max(colors.length - 1, 1), color);
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = gradient;

  for (const [index, cells] of steps.entries()) {
    const start = front - (index + 1) * stepWidth;
    const end = front - index * stepWidth;

    for (const cell of cells) {
      if (cell.position >= start && cell.position < end) {
        ctx.fillRect(cell.x, cell.y, cell.size, cell.size);
      }
    }
  }

  return sharp;
};

export interface PixelSweepOptions {
  direction: SweepDirection;
  colors?: string[];
  /** Width of each pixel step zone, as a multiple of the source unit. */
  stepSize?: number;
}

export interface PixelSweep {
  /** Shows the sweep at `progress`: 0 hides the element, 1 shows all of it. */
  render: (progress: number) => void;
  clear: () => void;
}

/**
 * Prepares a sweep of colored pixel blocks that sharpen into `element`. `canvas` must cover
 * `element`.
 */
export const createPixelSweep = (
  element: HTMLElement,
  canvas: HTMLCanvasElement,
  source: SweepSource,
  { direction, colors = DIA_COLORS, stepSize = 1.2 }: PixelSweepOptions,
): PixelSweep | null => {
  const ctx = canvas.getContext("2d");

  if (ctx === null) {
    return null;
  }

  const layout = measure(element, source, direction, stepSize);
  const ratio = window.devicePixelRatio;
  canvas.width = Math.ceil(layout.width * ratio);
  canvas.height = Math.ceil(layout.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const end = layout.length + layout.stepWidth * (layout.steps.length + CELL_JITTER);

  const clear = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const render = (progress: number) => {
    if (progress <= 0 || progress >= 1) {
      clear();
      element.style.clipPath = progress <= 0 ? getClipPath(direction, "100%") : "none";

      return;
    }

    const sharp = draw(ctx, direction, layout, progress * end, colors);
    const hidden = Math.min(layout.length, Math.max(0, layout.length - sharp));
    element.style.clipPath = getClipPath(direction, `${hidden}px`);
  };

  return { render, clear };
};

export interface SweepOptions extends PixelSweepOptions {
  text: string;
  /** Plays the sweep backward: the sharp text breaks into pixels and goes away. */
  reverse?: boolean;
  /** Duration in seconds. */
  duration: number;
  /** Delay before the sweep starts, in seconds. */
  delay?: number;
  onComplete?: () => void;
}

/** Plays a pixel sweep over the text element once. Returns a function that stops it. */
export const sweep = (
  textElement: HTMLElement,
  canvas: HTMLCanvasElement,
  { text, reverse = false, duration, delay = 0, onComplete, ...options }: SweepOptions,
) => {
  let cancelled = false;
  let pixelSweep: PixelSweep | null = null;
  let controls: AnimationPlaybackControls | undefined;

  textElement.style.clipPath = reverse ? "none" : getClipPath(options.direction, "100%");

  const run = async () => {
    const source = await getTextSource(textElement, text);

    if (cancelled) {
      return;
    }

    pixelSweep = createPixelSweep(textElement, canvas, source, options);

    if (pixelSweep === null) {
      onComplete?.();

      return;
    }

    controls = animate(reverse ? 1 : 0, reverse ? 0 : 1, {
      duration,
      delay,
      ease: "easeInOut",
      onUpdate: pixelSweep.render,
      onComplete,
    });
  };

  void run();

  return () => {
    cancelled = true;
    controls?.stop();
    pixelSweep?.clear();
  };
};
