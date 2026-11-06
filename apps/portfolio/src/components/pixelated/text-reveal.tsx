import { DIA_COLORS } from "@my-website/ui/lib/dia-colors";
import { cn } from "@my-website/ui/lib/utils";
import { useInView, usePresence, useReducedMotion } from "motion/react";
import type { UseInViewOptions } from "motion/react";
import { useEffect, useRef } from "react";

import { getTextSource, sweep } from "@/lib/pixel-sweep";

/** Duration of the pixel sweep out, in seconds. */
const EXIT_DURATION = 0.6;

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

/**
 * Sweeps the text in from left to right: colored pixel blocks sharpen into the text. Inside
 * `AnimatePresence`, it also breaks the text into pixels from right to left on exit.
 */
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
  const [isPresent, safeToRemove] = usePresence();
  const safeToRemoveRef = useRef(safeToRemove);
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(textRef, { once, margin: inViewMargin });
  const reduceMotion = useReducedMotion() === true;
  const active = !startOnView || inView;

  useEffect(() => {
    safeToRemoveRef.current = safeToRemove;
  });

  useEffect(() => {
    const textElement = textRef.current;
    const canvas = canvasRef.current;
    const canSweep = active && !reduceMotion && textElement !== null && canvas !== null;

    const remove = () => {
      safeToRemoveRef.current?.();
    };

    if (!isPresent && !canSweep) {
      remove();
    }

    const stop = canSweep
      ? sweep(textElement, canvas, {
          getSource: async () => await getTextSource(textElement, text),
          direction: "right",
          reverse: !isPresent,
          colors,
          duration: isPresent ? duration : EXIT_DURATION,
          delay: isPresent ? delay : 0,
          onComplete: isPresent ? undefined : remove,
        })
      : null;

    return () => {
      stop?.();
    };
  }, [isPresent, active, reduceMotion, text, colors, duration, delay]);

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
