import { DIA_COLORS } from "@my-website/ui/lib/dia-colors";
import { cn } from "@my-website/ui/lib/utils";
import { useInView, useReducedMotion } from "motion/react";
import type { UseInViewOptions } from "motion/react";
import { useEffect, useRef } from "react";

import { getTextSource, sweep } from "@/lib/pixel-sweep";

interface PixelatedTextRevealProps {
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
export const PixelatedTextReveal = ({
  text,
  colors = DIA_COLORS,
  duration = 1.5,
  delay = 0,
  startOnView = true,
  once = true,
  inViewMargin,
  className,
}: PixelatedTextRevealProps) => {
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
        ? sweep(textElement, canvas, {
            getSource: async () => await getTextSource(textElement, text),
            direction: "right",
            colors,
            duration,
            delay,
          })
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
