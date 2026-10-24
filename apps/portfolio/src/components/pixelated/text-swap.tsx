import { cn } from "@my-website/ui/lib/utils";
import { usePresence, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { getTextSource, sweep } from "@/lib/pixel-sweep";

/** Duration of the pixel sweep in, in seconds. */
const IN_DURATION = 0.3;

/** Duration of the pixel sweep out, in seconds. */
const OUT_DURATION = 0.2;

/** Width of each pixel step zone, as a multiple of the font size. */
const STEP_SIZE = 0.35;

interface PixelatedTextSwapProps {
  text: string;
  color?: string;
  className?: string;
}

/**
 * Builds the text up from bottom to top in colored pixel blocks. Inside `AnimatePresence`, it also
 * breaks the text into pixels from bottom to top on exit.
 */
export const PixelatedTextSwap = ({ text, color, className }: PixelatedTextSwapProps) => {
  const [isPresent, safeToRemove] = usePresence();
  const safeToRemoveRef = useRef(safeToRemove);
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion() === true;

  useEffect(() => {
    safeToRemoveRef.current = safeToRemove;
  });

  useEffect(() => {
    const textElement = textRef.current;
    const canvas = canvasRef.current;

    const remove = () => {
      safeToRemoveRef.current?.();
    };

    if (!isPresent && (reduceMotion || textElement === null || canvas === null)) {
      remove();
    }

    const stop =
      !reduceMotion && textElement !== null && canvas !== null
        ? sweep(textElement, canvas, {
            getSource: async () => await getTextSource(textElement, text),
            direction: isPresent ? "up" : "down",
            reverse: !isPresent,
            duration: isPresent ? IN_DURATION : OUT_DURATION,
            stepSize: STEP_SIZE,
            onComplete: isPresent ? undefined : remove,
          })
        : null;

    return () => {
      stop?.();
    };
  }, [isPresent, reduceMotion, text]);

  return (
    <span className={cn("relative inline-block align-top", className)}>
      <span
        ref={textRef}
        className="inline-block motion-safe:[clip-path:inset(100%_0_0_0)]"
        style={{ color }}
      >
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
