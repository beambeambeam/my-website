import { animate } from "motion/react";
import type { AnimationPlaybackControls } from "motion/react";

export const DIA_COLORS = ["#f0abfc", "#f472b6", "#fb923c", "#facc15", "#a3e635"];

/** Pixel block sizes of the steps, from coarse to fine, as a fraction of the font size. */
const STEPS = [0.3, 0.15, 0.075];

/** Maximum random delay of a cell, as a fraction of the step width. */
const CELL_JITTER = 0.6;

/** Minimum cell alpha (0–255) to count as part of the text. */
const ALPHA_THRESHOLD = 64;

/** Direction the sweep front moves in. */
export type SweepDirection = "right" | "up" | "down";

interface Cell {
  x: number;
  y: number;
  size: number;
  /** Distance of the cell center along the sweep direction. */
  position: number;
}

interface Layout {
  width: number;
  height: number;
  /** Distance the front travels across the text. */
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

const measure = (
  element: HTMLElement,
  text: string,
  direction: SweepDirection,
  stepSize: number,
): Layout => {
  const style = getComputedStyle(element);
  const { width, height } = element.getBoundingClientRect();
  const fontSize = Number(style.fontSize.replace("px", ""));
  const stepWidth = fontSize * stepSize;
  const shownText = transformText(text, style.textTransform);

  const getPosition = (x: number, y: number) => {
    if (direction === "right") {
      return x;
    }

    return direction === "down" ? y : height - y;
  };

  const steps = STEPS.map((ratio) => {
    const size = Math.max(1, Math.round(fontSize * ratio));
    const columns = Math.ceil(width / size);
    const rows = Math.ceil(height / size);
    const canvas = document.createElement("canvas");
    canvas.width = columns;
    canvas.height = rows;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (ctx === null) {
      return [];
    }

    ctx.scale(1 / size, 1 / size);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
    const metrics = ctx.measureText(shownText);
    const ascent = metrics.fontBoundingBoxAscent;
    const descent = metrics.fontBoundingBoxDescent;
    ctx.fillText(shownText, 0, (height - ascent - descent) / 2 + ascent);

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

/** Returns the clip path that hides `hidden` of the text, from the end of the sweep back. */
const getClipPath = (direction: SweepDirection, hidden: string) => {
  if (direction === "right") {
    return `inset(0 ${hidden} 0 0)`;
  }

  return direction === "down" ? `inset(0 0 ${hidden} 0)` : `inset(${hidden} 0 0 0)`;
};

/** Returns the clip path that shows the text where the position is below `sharp`. */
const getSharpClipPath = (direction: SweepDirection, layout: Layout, sharp: number) =>
  getClipPath(direction, `${Math.min(layout.length, Math.max(0, layout.length - sharp))}px`);

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

/** Draws the pixel zone behind `front` and returns the position where sharp text starts. */
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

export interface SweepOptions {
  text: string;
  direction: SweepDirection;
  /** Plays the sweep backward: the sharp text breaks into pixels and goes away. */
  reverse?: boolean;
  colors?: string[];
  /** Duration in seconds. */
  duration: number;
  /** Delay before the sweep starts, in seconds. */
  delay?: number;
  /** Width of each pixel step zone, as a multiple of the font size. */
  stepSize?: number;
  onComplete?: () => void;
}

/**
 * Sweeps colored pixel blocks over the text element and sharpens them into the text. Draws on
 * `canvas`, which must cover the text element. Returns a function that stops the sweep.
 */
export const sweep = (
  textElement: HTMLElement,
  canvas: HTMLCanvasElement,
  {
    text,
    direction,
    reverse = false,
    colors = DIA_COLORS,
    duration,
    delay = 0,
    stepSize = 1.2,
    onComplete,
  }: SweepOptions,
) => {
  const ctx = canvas.getContext("2d");
  let cancelled = false;
  let controls: AnimationPlaybackControls | undefined;

  textElement.style.clipPath = reverse ? "none" : getClipPath(direction, "100%");

  const run = async (context: CanvasRenderingContext2D) => {
    await document.fonts.ready;

    if (cancelled) {
      return;
    }

    const layout = measure(textElement, text, direction, stepSize);
    const ratio = window.devicePixelRatio;
    canvas.width = Math.ceil(layout.width * ratio);
    canvas.height = Math.ceil(layout.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const end = layout.length + layout.stepWidth * (layout.steps.length + CELL_JITTER);

    controls = animate(reverse ? end : 0, reverse ? 0 : end, {
      duration,
      delay,
      ease: "easeInOut",
      onUpdate: (front) => {
        const sharp = draw(context, direction, layout, front, colors);
        textElement.style.clipPath = getSharpClipPath(direction, layout, sharp);
      },
      onComplete: () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        textElement.style.clipPath = reverse ? getClipPath(direction, "100%") : "none";
        onComplete?.();
      },
    });
  };

  if (ctx === null) {
    onComplete?.();
  } else {
    void run(ctx);
  }

  return () => {
    cancelled = true;
    controls?.stop();
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };
};
