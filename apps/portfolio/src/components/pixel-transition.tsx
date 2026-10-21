import { cn } from "@my-website/ui/lib/utils";
import { useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface PixelTransitionProps {
  /** Content shown at rest. */
  first: ReactNode;
  /** Content shown while `active` is true. */
  second: ReactNode;
  active: boolean;
  /** Pixels per row and per column. */
  gridSize?: number;
  /** Time of one transition, in seconds. */
  duration?: number;
  /** Any CSS color. */
  pixelColor?: string;
  className?: string;
}

const PIXEL = "[data-pixel]";
const SECOND = "[data-second]";

export const PixelTransition = ({
  first,
  second,
  active,
  gridSize = 8,
  duration = 0.3,
  pixelColor = "currentColor",
  className,
}: PixelTransitionProps) => {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion() === true;
  const shown = useRef(false);
  const pixels = Array.from({ length: gridSize * gridSize }, (_, i) => i);

  useEffect(() => {
    let cancelled = false;
    const randomDelay = () => Math.random() * (duration / 2);

    const run = async () => {
      if (shown.current === active) {
        return;
      }

      shown.current = active;

      if (!reduceMotion) {
        await animate(PIXEL, { opacity: 1 }, { duration: 0, delay: randomDelay });
      }

      if (cancelled) {
        return;
      }

      await animate(SECOND, { opacity: active ? 1 : 0 }, { duration: 0 });

      if (cancelled || reduceMotion) {
        return;
      }

      await animate(PIXEL, { opacity: 0 }, { duration: 0, delay: randomDelay });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [active, animate, duration, reduceMotion]);

  return (
    <div ref={scope} className={cn("relative overflow-hidden", className)}>
      <div className="size-full">{first}</div>
      <div data-second className="absolute inset-0 opacity-0">
        {second}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {pixels.map((pixel) => (
          <div key={pixel} data-pixel className="opacity-0" style={{ background: pixelColor }} />
        ))}
      </div>
    </div>
  );
};
