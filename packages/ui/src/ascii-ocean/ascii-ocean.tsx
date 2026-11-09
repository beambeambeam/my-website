import { cn } from "@my-website/ui/lib/utils";
import { useCallback } from "react";

import { OceanEngine } from "./engine";

export interface AsciiOceanProps {
  className?: string;
}

/**
 * An ASCII ocean: fish schools, and Siren with her two mermaids, kept inside the canvas. Fills its
 * parent, which must have a size. Fish flee the pointer. A click makes a splash, and Siren comes to
 * look. Draws in the text color over the `--background` color, and holds one frame with reduced
 * motion.
 */
export const AsciiOcean = ({ className }: AsciiOceanProps) => {
  // A callback ref with cleanup runs once per mounted canvas.
  const canvasRef = useCallback((canvas: HTMLCanvasElement) => {
    const engine = new OceanEngine(canvas);

    return () => {
      engine.destroy();
    };
  }, []);

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
