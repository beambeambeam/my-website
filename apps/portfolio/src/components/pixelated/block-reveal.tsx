import { cn } from "@my-website/ui/lib/utils";
import { useInView, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { getElementSource, sweep } from "@/lib/pixel-sweep";

/** Base pixel block size in px. */
const UNIT = 20;

/** Height of each pixel step zone, as a multiple of `UNIT`. */
const STEP_SIZE = 1.5;

interface PixelatedBlockRevealProps {
  children: ReactNode;
  /** Sweep duration in seconds. */
  duration?: number;
  /** Delay before the sweep starts, in seconds. */
  delay?: number;
  className?: string;
}

/**
 * Shows its content from top to bottom when it scrolls into view. Colored pixel blocks trace the
 * text, icons, and borders of the content, then sharpen into the content. Pull the block over page
 * grid lines with negative margins to reveal its borders in place of those lines.
 */
export const PixelatedBlockReveal = ({
  children,
  duration = 1.2,
  delay = 0,
  className,
}: PixelatedBlockRevealProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(contentRef, { once: true, margin: "0px 0px -10% 0px" });
  const reduceMotion = useReducedMotion() === true;

  useEffect(() => {
    const content = contentRef.current;
    const canvas = canvasRef.current;

    const stop =
      inView && !reduceMotion && content !== null && canvas !== null
        ? sweep(content, canvas, {
            getSource: async () => await getElementSource(content, UNIT),
            direction: "down",
            duration,
            delay,
            stepSize: STEP_SIZE,
          })
        : null;

    return () => {
      stop?.();
    };
  }, [inView, reduceMotion, duration, delay]);

  return (
    <div className={cn("relative", className)}>
      {/* Hides page grid lines behind the block, so the block's own borders reveal over them. */}
      <div aria-hidden="true" data-pixel-ignore className="absolute inset-0 bg-background" />
      <div ref={contentRef} className="relative motion-safe:[clip-path:inset(0_0_100%_0)]">
        {children}
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-pixel-ignore
        className="pointer-events-none absolute inset-0 size-full"
      />
    </div>
  );
};
