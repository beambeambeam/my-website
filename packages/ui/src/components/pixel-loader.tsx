import { DIA_COLORS } from "@my-website/ui/lib/dia-colors";
import { getPixelPhases } from "@my-website/ui/lib/pixel-loader";
import type { PixelGrid, PixelPattern, PixelSweepDirection } from "@my-website/ui/lib/pixel-loader";
import { cn } from "@my-website/ui/lib/utils";
import type * as React from "react";

export type { PixelGrid, PixelPattern, PixelSweepDirection } from "@my-website/ui/lib/pixel-loader";

// Cell size in viewBox units.
const CELL_SIZE = 3;

/** Dia colors as the CSS variables that the `pixel-loader-dia` keyframes read. */
const DIA_VARIABLES = Object.fromEntries(
  DIA_COLORS.map((color, index) => [`--dia-${index}`, color]),
);

export interface PixelLoaderProps extends Omit<React.ComponentProps<"output">, "children"> {
  /** Cells on each side of the grid. */
  grid?: PixelGrid;
  /** Order in which the cells light up. */
  pattern?: PixelPattern;
  /** Direction of the sweep pattern. Other patterns ignore it. */
  direction?: PixelSweepDirection;
  /** Length of one full cycle in milliseconds. */
  duration?: number;
  /** `mono` lights cells in the text color. `dia` lights them in the Dia colors. */
  variant?: "mono" | "dia";
  /** Text that screen readers announce. */
  label?: string;
}

/**
 * Shows a 3×3 or 5×5 grid of cells that light up in a pattern while content loads. With reduced
 * motion, the grid holds one frame of the pattern.
 */
function PixelLoader({
  grid = 5,
  pattern = "ripple",
  direction,
  duration = 1200,
  variant = "mono",
  label = "Loading",
  className,
  ...props
}: PixelLoaderProps) {
  const phases = getPixelPhases(pattern, { grid, direction });
  const viewBoxSize = grid * CELL_SIZE;

  return (
    <output
      aria-label={label}
      data-slot="pixel-loader"
      className={cn("inline-flex size-5 shrink-0", className)}
      {...props}
    >
      <svg
        aria-hidden
        className="size-full [shape-rendering:crispEdges]"
        fill="currentColor"
        style={variant === "dia" ? DIA_VARIABLES : undefined}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      >
        {phases.map((phase, index) => (
          <rect
            // The grid never reorders, so the index is a stable key.
            key={index}
            x={(index % grid) * CELL_SIZE}
            y={Math.floor(index / grid) * CELL_SIZE}
            width={CELL_SIZE}
            height={CELL_SIZE}
            className={cn(
              "opacity-20 motion-reduce:paused",
              variant === "dia" ? "animate-pixel-loader-dia" : "animate-pixel-loader",
            )}
            style={{
              animationDuration: `${duration}ms`,
              // A negative delay starts each cell mid-cycle, so the pattern shows on the first frame.
              animationDelay: `${(phase - 1) * duration}ms`,
            }}
          />
        ))}
      </svg>
    </output>
  );
}

export { PixelLoader };
