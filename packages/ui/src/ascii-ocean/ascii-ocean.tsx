import { cn } from "@my-website/ui/lib/utils";
import { useCallback } from "react";

import { OceanEngine } from "./engine";
import type { SharkSpec } from "./world";

/** A classic, a hammerhead, and a mako at three depths. */
const DEFAULT_SHARKS: readonly SharkSpec[] = [
  { kind: "classic", size: 1 },
  { kind: "hammerhead", size: 0.8 },
  { kind: "mako", size: 0.68 },
];

export interface AsciiOceanProps {
  /**
   * Sharks in the water. The roster is read once, so pass a constant. A new array restarts the
   * ocean.
   */
  sharks?: readonly SharkSpec[];
  className?: string;
}

/**
 * An ASCII ocean: fish schools and the sharks that hunt them, kept inside the canvas. Fills its
 * parent, which must have a size. Fish flee the pointer. A click makes a splash, and the sharks
 * come to look. Draws in the text color over the `--background` color, and holds one frame with
 * reduced motion.
 */
export const AsciiOcean = ({ sharks = DEFAULT_SHARKS, className }: AsciiOceanProps) => {
  // A callback ref with cleanup runs once per mounted canvas.
  const canvasRef = useCallback(
    (canvas: HTMLCanvasElement) => {
      const engine = new OceanEngine(canvas, sharks);

      return () => {
        engine.destroy();
      };
    },
    [sharks],
  );

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-slot="ascii-ocean"
      className={cn(
        "block size-full font-mono text-foreground opacity-0 transition-opacity duration-700 data-ready:opacity-100",
        className,
      )}
    />
  );
};
