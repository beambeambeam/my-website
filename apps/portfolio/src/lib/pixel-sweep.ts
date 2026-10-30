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

const getImage = async (src: string) => {
  let image = imageCache.get(src);

  if (image === undefined) {
    image = loadImage(src);
    imageCache.set(src, image);
  }

  return await image;
};

/** Draws `image` contained and centered in the box. */
const drawContained = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
};

/** Returns a source that paints the image at `src`, contained and centered. */
export const getImageSource = async (src: string | null): Promise<SweepSource> => {
  const image = src === null ? null : await getImage(src);

  if (image === null) {
    return {};
  }

  return {
    paint: (ctx, width, height) => {
      drawContained(ctx, image, 0, 0, width, height);
    },
  };
};

type Painter = (ctx: CanvasRenderingContext2D) => void;

const toPx = (value: string) => Number(value.replace("px", ""));

const getFont = (style: CSSStyleDeclaration) =>
  `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

const isShown = (node: Element) =>
  node.closest("[data-pixel-ignore]") === null &&
  node.checkVisibility({ visibilityProperty: true });

/** Returns the source of the image an element shows, or null. */
const getImageSrc = (node: Element, width: number, height: number) => {
  if (node instanceof HTMLImageElement) {
    return node.currentSrc;
  }

  if (node instanceof SVGSVGElement) {
    const clone = node.cloneNode(true);

    if (!(clone instanceof SVGSVGElement)) {
      return null;
    }

    clone.setAttribute("width", `${width}`);
    clone.setAttribute("height", `${height}`);

    return `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  }

  return (
    /url\(["']?(?<src>.+?)["']?\)/u.exec(getComputedStyle(node).maskImage)?.groups?.src ?? null
  );
};

/**
 * Returns a source that traces what `element` shows: text glyphs, images, inline SVGs, masked
 * images, and borders. Skips subtrees marked with `data-pixel-ignore`.
 */
export const getElementSource = async (
  element: HTMLElement,
  unit: number,
): Promise<SweepSource> => {
  await document.fonts.ready;

  const origin = element.getBoundingClientRect();
  const painters: Painter[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const parent = node.parentElement;
    const text = node.textContent ?? "";

    const parentRect = parent?.getBoundingClientRect();

    // Screen-reader-only text sits in a 1px box, so skip text in boxes that small.
    if (parent !== null && isShown(parent) && parentRect !== undefined && parentRect.width > 1) {
      const style = getComputedStyle(parent);
      const font = getFont(style);

      for (let index = 0; index < text.length; index += 1) {
        const char = transformText(text[index], style.textTransform);
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rect = range.getBoundingClientRect();

        if (char.trim() !== "" && rect.width > 1 && rect.height > 1) {
          const x = rect.left - origin.left;
          const y = rect.top - origin.top;

          painters.push((ctx) => {
            ctx.font = font;
            const metrics = ctx.measureText(char);
            const ascent = metrics.fontBoundingBoxAscent;
            const descent = metrics.fontBoundingBoxDescent;
            ctx.fillText(char, x, y + (rect.height - ascent - descent) / 2 + ascent);
          });
        }
      }
    }
  }

  const images = element.querySelectorAll("img, svg, [style*='mask-image']");

  await Promise.all(
    [...images].map(async (node) => {
      const rect = node.getBoundingClientRect();
      const src = isShown(node) ? getImageSrc(node, rect.width, rect.height) : null;
      const image = src === null ? null : await getImage(src);

      if (image !== null) {
        painters.push((ctx) => {
          drawContained(
            ctx,
            image,
            rect.left - origin.left,
            rect.top - origin.top,
            rect.width,
            rect.height,
          );
        });
      }
    }),
  );

  for (const node of [element, ...element.querySelectorAll("*")]) {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const x = rect.left - origin.left;
    const y = rect.top - origin.top;
    const top = style.borderTopStyle === "none" ? 0 : toPx(style.borderTopWidth);
    const right = style.borderRightStyle === "none" ? 0 : toPx(style.borderRightWidth);
    const bottom = style.borderBottomStyle === "none" ? 0 : toPx(style.borderBottomWidth);
    const left = style.borderLeftStyle === "none" ? 0 : toPx(style.borderLeftWidth);

    if (top + right + bottom + left > 0 && isShown(node)) {
      painters.push((ctx) => {
        ctx.fillRect(x, y, rect.width, top);
        ctx.fillRect(x + rect.width - right, y, right, rect.height);
        ctx.fillRect(x, y + rect.height - bottom, rect.width, bottom);
        ctx.fillRect(x, y, left, rect.height);
      });
    }
  }

  return {
    unit,
    paint: (ctx) => {
      for (const painter of painters) {
        painter(ctx);
      }
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

/** Returns the clip path that shows only the part that `getClipPath` hides. */
const getReplacedClipPath = (direction: SweepDirection, hidden: string) => {
  const shown = `calc(100% - ${hidden})`;

  if (direction === "right") {
    return `inset(0 0 0 ${shown})`;
  }

  return direction === "down" ? `inset(${shown} 0 0 0)` : `inset(0 0 ${shown} 0)`;
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
  /** Element in the same box that `element` replaces. It shows only where `element` is hidden. */
  replaced?: HTMLElement;
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
  { direction, colors = DIA_COLORS, stepSize = 1.2, replaced }: PixelSweepOptions,
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

  const setHidden = (hidden: string) => {
    element.style.clipPath = getClipPath(direction, hidden);

    if (replaced !== undefined) {
      replaced.style.clipPath = getReplacedClipPath(direction, hidden);
    }
  };

  const render = (progress: number) => {
    if (progress <= 0 || progress >= 1) {
      clear();
      setHidden(progress <= 0 ? "100%" : "0%");

      return;
    }

    const sharp = draw(ctx, direction, layout, progress * end, colors);
    const hidden = Math.min(layout.length, Math.max(0, layout.length - sharp));
    setHidden(`${hidden}px`);
  };

  return { render, clear };
};

export interface SweepOptions extends PixelSweepOptions {
  /** Returns the shape that the pixel blocks follow. */
  getSource: () => Promise<SweepSource>;
  /** Plays the sweep backward: the sharp element breaks into pixels and goes away. */
  reverse?: boolean;
  /** Duration in seconds. */
  duration: number;
  /** Delay before the sweep starts, in seconds. */
  delay?: number;
  onComplete?: () => void;
}

/** Plays a pixel sweep over the element once. Returns a function that stops it. */
export const sweep = (
  element: HTMLElement,
  canvas: HTMLCanvasElement,
  { getSource, reverse = false, duration, delay = 0, onComplete, ...options }: SweepOptions,
) => {
  let cancelled = false;
  let pixelSweep: PixelSweep | null = null;
  let controls: AnimationPlaybackControls | undefined;

  element.style.clipPath = reverse ? "none" : getClipPath(options.direction, "100%");

  const run = async () => {
    const source = await getSource();

    if (cancelled) {
      return;
    }

    pixelSweep = createPixelSweep(element, canvas, source, options);

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
