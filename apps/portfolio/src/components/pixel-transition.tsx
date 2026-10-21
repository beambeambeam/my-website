import { cn } from "@my-website/ui/lib/utils";
import { useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useId } from "react";
import type { ReactNode } from "react";

interface PixelTransitionProps {
  /** Content shown at rest. */
  first: ReactNode;
  /** Content shown while `active` is true. */
  second: ReactNode;
  active: boolean;
  /** Pixels per row and per column. */
  gridSize?: number;
  /** Time of the hover-in reveal, in seconds. */
  duration?: number;
  className?: string;
}

const PIXEL = "[data-pixel]";

export const PixelTransition = ({
  first,
  second,
  active,
  gridSize = 8,
  duration = 0.3,
  className,
}: PixelTransitionProps) => {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion() === true;
  const clipId = useId();
  const pixels = Array.from({ length: gridSize * gridSize }, (_, i) => i);

  useEffect(() => {
    const animation =
      active && !reduceMotion
        ? animate(PIXEL, { scale: [0, 1] }, { duration: 0, delay: () => Math.random() * duration })
        : null;

    return () => {
      animation?.stop();
    };
  }, [active, animate, duration, reduceMotion]);

  return (
    <div ref={scope} className={cn("relative overflow-hidden", className)}>
      {/* Reset the clip cells before each hover-in. */}
      <svg key={String(active)} aria-hidden="true" className="absolute size-0">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            {pixels.map((pixel) => (
              <rect
                key={pixel}
                data-pixel
                x={(pixel % gridSize) / gridSize}
                y={Math.floor(pixel / gridSize) / gridSize}
                width={1 / gridSize}
                height={1 / gridSize}
                style={{ transform: "scale(0)" }}
              />
            ))}
          </clipPath>
        </defs>
      </svg>
      <div className="size-full">{first}</div>
      <div
        aria-hidden="true"
        data-second
        className="absolute inset-0"
        style={{
          opacity: active ? 1 : 0,
          clipPath: reduceMotion ? undefined : `url(#${clipId})`,
        }}
      >
        {second}
      </div>
    </div>
  );
};
