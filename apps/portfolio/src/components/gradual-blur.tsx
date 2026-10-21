import { cn } from "@my-website/ui/lib/utils";
import type { CSSProperties } from "react";

type GradualBlurCurve = "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";

interface GradualBlurProps {
  /** Edge the blur grows toward. */
  position?: "top" | "bottom";
  /** How far the blur reaches in from the edge. */
  height?: string;
  /** How blurry the very edge gets. Each step adds about 12px of blur. */
  strength?: number;
  /** Blur layers stacked across the ramp. More layers give a smoother falloff. */
  layers?: number;
  curve?: GradualBlurCurve;
  /** Doubles the blur toward the edge so it starts gently. */
  exponential?: boolean;
  /** Color the content fades into at the edge. Any CSS color. */
  tint?: string;
  /** Place the overlay with `fixed` or `absolute` classes. */
  className?: string;
}

const CURVES: Record<GradualBlurCurve, (t: number) => number> = {
  linear: (t) => t,
  bezier: (t) => t * t * (3 - 2 * t),
  "ease-in": (t) => t * t,
  "ease-out": (t) => 1 - (1 - t) * (1 - t),
  "ease-in-out": (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
};

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export const GradualBlur = ({
  position = "bottom",
  height = "6rem",
  strength = 2,
  layers = 8,
  curve = "linear",
  exponential = true,
  tint,
  className,
}: GradualBlurProps) => {
  const count = Math.min(Math.max(Math.round(layers), 1), 16);
  const ease = CURVES[curve];
  const maxBlur = Math.max(strength, 0) * 12;
  const direction = position === "top" ? "to top" : "to bottom";

  const blurAt = (u: number) => {
    const t = ease(clamp01(u));

    return maxBlur * (exponential ? (2 ** (4 * t) - 1) / 15 : t);
  };

  const steps = Array.from({ length: count }, (_, i): CSSProperties => {
    const from = blurAt(i / count);
    const to = blurAt((i + 1) / count);
    const radius = Math.sqrt(Math.max(to * to - from * from, 0));
    const filter = `blur(${radius.toFixed(3)}px)`;
    const mask = `linear-gradient(${direction}, transparent ${((i / count) * 100).toFixed(2)}%, #000 ${(((i + 1) / count) * 100).toFixed(2)}%)`;

    return {
      position: "absolute",
      inset: 0,
      backdropFilter: filter,
      WebkitBackdropFilter: filter,
      maskImage: mask,
      WebkitMaskImage: mask,
    };
  });

  const stops = Array.from({ length: 9 }, (_, k) => {
    const u = k / 8;

    return `rgba(0, 0, 0, ${smootherstep(ease(u)).toFixed(3)}) ${(u * 100).toFixed(1)}%`;
  }).join(", ");

  const tintMask = `linear-gradient(${direction}, ${stops})`;

  return (
    <div aria-hidden="true" className={cn("pointer-events-none", className)} style={{ height }}>
      {steps.map((layer, index) => (
        <div key={index} style={layer} />
      ))}
      {tint !== undefined && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: tint,
            maskImage: tintMask,
            WebkitMaskImage: tintMask,
          }}
        />
      )}
    </div>
  );
};
