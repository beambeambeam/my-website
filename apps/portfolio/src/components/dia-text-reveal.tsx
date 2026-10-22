import { cn } from "@my-website/ui/lib/utils";
import { animate, useInView, useReducedMotion } from "motion/react";
import type { AnimationPlaybackControls, UseInViewOptions } from "motion/react";
import { useEffect, useRef } from "react";

const DEFAULT_COLORS = ["#f0abfc", "#f472b6", "#fb923c", "#facc15", "#a3e635"];

/** Pixel block sizes of the steps, from coarse to fine, as a fraction of the font size. */
const STEPS = [0.3, 0.15, 0.075];

/** Width of each step zone, as a multiple of the font size. */
const STEP_WIDTH = 1.2;

/** Maximum random delay of a cell, as a fraction of the step width. */
const CELL_JITTER = 0.6;

/** Minimum cell alpha (0–255) to count as part of the text. */
const ALPHA_THRESHOLD = 64;

interface Cell {
  x: number;
  y: number;
  size: number;
  jitter: number;
}

interface Layout {
  width: number;
  height: number;
  stepWidth: number;
  /** Cells of each step, from coarse to fine. */
  steps: Cell[][];
}

const measure = (element: HTMLElement, text: string): Layout => {
  const style = getComputedStyle(element);
  const { width, height } = element.getBoundingClientRect();
  const fontSize = Number(style.fontSize.replace("px", ""));
  const stepWidth = fontSize * STEP_WIDTH;

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
    const metrics = ctx.measureText(text);
    const ascent = metrics.fontBoundingBoxAscent;
    const descent = metrics.fontBoundingBoxDescent;
    ctx.fillText(text, 0, (height - ascent - descent) / 2 + ascent);

    const { data } = ctx.getImageData(0, 0, columns, rows);
    const cells: Cell[] = [];

    for (let cell = 0; cell < columns * rows; cell += 1) {
      if (data[cell * 4 + 3] >= ALPHA_THRESHOLD) {
        cells.push({
          x: (cell % columns) * size,
          y: Math.floor(cell / columns) * size,
          size,
          jitter: Math.random() * CELL_JITTER * stepWidth,
        });
      }
    }

    return cells;
  });

  return { width, height, stepWidth, steps };
};

/** Draws the pixel zone behind `front` and returns the x where sharp text starts. */
const draw = (ctx: CanvasRenderingContext2D, layout: Layout, front: number, colors: string[]) => {
  const { width, height, stepWidth, steps } = layout;
  const sharp = front - stepWidth * steps.length;
  const gradient = ctx.createLinearGradient(front, 0, sharp, 0);

  for (const [index, color] of colors.entries()) {
    gradient.addColorStop(index / Math.max(colors.length - 1, 1), color);
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = gradient;

  for (const [index, cells] of steps.entries()) {
    const start = front - (index + 1) * stepWidth;
    const end = front - index * stepWidth;

    for (const cell of cells) {
      const position = cell.x + cell.size / 2 + cell.jitter;

      if (position >= start && position < end) {
        ctx.fillRect(cell.x, cell.y, cell.size, cell.size);
      }
    }
  }

  return sharp;
};

interface SweepOptions {
  text: string;
  colors: string[];
  duration: number;
  delay: number;
}

/** Runs the pixel sweep over the text element and returns a cleanup function. */
const sweep = (
  textElement: HTMLElement,
  canvas: HTMLCanvasElement,
  { text, colors, duration, delay }: SweepOptions,
) => {
  const ctx = canvas.getContext("2d");
  let cancelled = false;
  let controls: AnimationPlaybackControls | undefined;

  const run = async (context: CanvasRenderingContext2D) => {
    await document.fonts.ready;

    if (cancelled) {
      return;
    }

    const layout = measure(textElement, text);
    const ratio = window.devicePixelRatio;
    canvas.width = Math.ceil(layout.width * ratio);
    canvas.height = Math.ceil(layout.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const zone = layout.stepWidth * (layout.steps.length + CELL_JITTER);

    controls = animate(0, layout.width + zone, {
      duration,
      delay,
      ease: "easeInOut",
      onUpdate: (front) => {
        const sharp = draw(context, layout, front, colors);
        textElement.style.clipPath = `inset(0 ${Math.max(0, layout.width - sharp)}px 0 0)`;
      },
      onComplete: () => {
        context.clearRect(0, 0, layout.width, layout.height);
        textElement.style.clipPath = "none";
      },
    });
  };

  if (ctx !== null) {
    void run(ctx);
  }

  return () => {
    cancelled = true;
    controls?.stop();
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    textElement.style.clipPath = "";
  };
};

interface DiaTextRevealProps {
  text: string;
  /** Gradient stop colors of the pixel zone, from the leading edge back. */
  colors?: string[];
  /** Sweep duration in seconds. */
  duration?: number;
  /** Delay before the sweep starts, in seconds. */
  delay?: number;
  startOnView?: boolean;
  once?: boolean;
  inViewMargin?: UseInViewOptions["margin"];
  className?: string;
}

/** Sweeps the text in from left to right: colored pixel blocks sharpen into the text. */
export const DiaTextReveal = ({
  text,
  colors = DEFAULT_COLORS,
  duration = 1.5,
  delay = 0,
  startOnView = true,
  once = true,
  inViewMargin,
  className,
}: DiaTextRevealProps) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(textRef, { once, margin: inViewMargin });
  const reduceMotion = useReducedMotion() === true;
  const active = !startOnView || inView;

  useEffect(() => {
    const textElement = textRef.current;
    const canvas = canvasRef.current;

    const stop =
      active && !reduceMotion && textElement !== null && canvas !== null
        ? sweep(textElement, canvas, { text, colors, duration, delay })
        : null;

    return () => {
      stop?.();
    };
  }, [active, reduceMotion, text, colors, duration, delay]);

  return (
    <span className={cn("relative inline-block", className)}>
      <span ref={textRef} className="inline-block motion-safe:[clip-path:inset(0_100%_0_0)]">
        {text}
      </span>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      />
    </span>
  );
};
