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
