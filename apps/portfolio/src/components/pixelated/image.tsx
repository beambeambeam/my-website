import { cn } from "@my-website/ui/lib/utils";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { createPixelSweep } from "@/lib/pixel-sweep";
import type { PixelSweep, SweepSource } from "@/lib/pixel-sweep";

/** Base size of the pixel blocks, in px. */
const UNIT = 64;

/** Width of each pixel step zone, as a multiple of `UNIT`. */
const STEP_SIZE = 0.6;

/** The image fills its box, so the blocks cover the whole box. */
const FILL_SOURCE: SweepSource = {
  unit: UNIT,
  paint: (ctx, width, height) => {
    ctx.fillRect(0, 0, width, height);
  },
};

interface PixelatedImageProps {
  src: string;
  alt: string;
  /** Shows the image. */
  active: boolean;
  /** Time of a full sweep, in seconds. */
  duration?: number;
  className?: string;
}

/**
 * Covers its box with the image. When active, colored pixel blocks sweep up the box and sharpen
 * into the image. When inactive again, the sweep goes back from where it is.
 */
export const PixelatedImage = ({
  src,
  alt,
  active,
  duration = 0.6,
  className,
}: PixelatedImageProps) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progress = useMotionValue(0);
  const reduceMotion = useReducedMotion() === true;

  useEffect(() => {
    let pixelSweep: PixelSweep | null = null;

    // Rebuild the blocks when the box size changes. The observer also fires once at the start.
    const observer = new ResizeObserver(() => {
      const image = imageRef.current;
      const canvas = canvasRef.current;

      if (image === null || canvas === null) {
        return;
      }

      pixelSweep = createPixelSweep(image, canvas, FILL_SOURCE, {
        direction: "up",
        stepSize: STEP_SIZE,
      });
      pixelSweep?.render(progress.get());
    });

    if (imageRef.current !== null) {
      observer.observe(imageRef.current);
    }

    const unsubscribe = progress.on("change", (value) => {
      pixelSweep?.render(value);
    });

    return () => {
      observer.disconnect();
      unsubscribe();
      pixelSweep?.clear();
    };
  }, [progress]);

  useEffect(() => {
    const target = active ? 1 : 0;
    const remaining = Math.abs(target - progress.get());

    if (reduceMotion) {
      progress.jump(target);
    }

    const controls = reduceMotion
      ? null
      : animate(progress, target, { duration: duration * remaining, ease: "easeInOut" });

    return () => {
      controls?.stop();
    };
  }, [active, reduceMotion, duration, progress]);

  return (
    <div className={cn("relative", className)}>
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className="size-full object-cover [clip-path:inset(100%_0_0_0)]"
        loading="lazy"
        decoding="async"
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      />
    </div>
  );
};
