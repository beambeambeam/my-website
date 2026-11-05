import { cn } from "@my-website/ui/lib/utils";
import { useEffect, useRef } from "react";

export interface GradientGlow {
  /** Hex color in `#rrggbb` form. The glow fades to this color at zero alpha. */
  color: string;
  /** Center as fractions of the width and height. */
  x: number;
  y: number;
  /** Radius as a fraction of the longer side. */
  radius: number;
}

interface PixelatedGradientProps {
  /** Fill under the glows. */
  base: string;
  glows: GradientGlow[];
  /** Pixel block size in px. */
  cell?: number;
  className?: string;
}

/** 4×4 Bayer matrix. Each entry is the threshold rank of that pixel in its tile. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Channel step between the colors that remain. Larger steps give wider bands. */
const STEP = 16;

/**
 * Snaps every channel to a multiple of `STEP` with ordered dithering. The soft glows become flat
 * bands, and a fixed checker pattern blends each band into the next, like pixel art.
 */
const dither = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = ((BAYER[(y % 4) * 4 + (x % 4)] ?? 0) + 0.5) / 16 - 0.5;
      const index = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        const value = data[index + channel] ?? 0;

        data[index + channel] = Math.min(255, Math.round(value / STEP + offset) * STEP);
      }
    }
  }

  ctx.putImageData(image, 0, 0);
};

/** Draws one canvas pixel per `cell` CSS pixels of the canvas box. */
const paint = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  { base, glows, cell = 8 }: PixelatedGradientProps,
) => {
  const width = Math.max(1, Math.ceil(canvas.clientWidth / cell));
  const height = Math.max(1, Math.ceil(canvas.clientHeight / cell));
  const size = Math.max(width, height);

  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  for (const glow of glows) {
    const x = glow.x * width;
    const y = glow.y * height;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, glow.radius * size);

    // Fade to the same color, because `transparent` fades through black and leaves a grey edge.
    gradient.addColorStop(0, glow.color);
    gradient.addColorStop(1, `${glow.color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  dither(ctx, width, height);
};

/**
 * Paints soft radial glows over a base color at low resolution, then scales them up without
 * smoothing, so the gradient shows as square pixel blocks. Fills its positioned parent.
 */
export const PixelatedGradient = ({ base, glows, cell, className }: PixelatedGradientProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;

    const observer =
      canvas !== null && ctx !== null
        ? new ResizeObserver(() => {
            paint(canvas, ctx, { base, glows, cell });
          })
        : null;

    if (canvas !== null) {
      observer?.observe(canvas);
    }

    return () => {
      observer?.disconnect();
    };
  }, [base, glows, cell]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 size-full [image-rendering:pixelated]",
        className,
      )}
    />
  );
};
