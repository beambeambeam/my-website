import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import type { Tool } from "@/features/lib-tools/data";
import { createPixelSweep, getImageSource } from "@/lib/pixel-sweep";
import type { PixelSweep } from "@/lib/pixel-sweep";

/** Width of each pixel step zone, as a multiple of the logo size. */
const STEP_SIZE = 0.25;

const getLogoSrc = (tool: Tool) => {
  if (tool.svgSrc !== undefined) {
    return tool.svgSrc;
  }

  if (tool.icon === undefined) {
    return null;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="${tool.icon.path}"/></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

interface ToolLogoProps {
  tool: Tool;
  color: string;
}

const ToolLogo = ({ tool, color }: ToolLogoProps) => {
  if (tool.svgSrc !== undefined) {
    return (
      <span
        aria-hidden="true"
        className="block size-full"
        style={{
          backgroundColor: color,
          maskImage: `url(${tool.svgSrc})`,
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskSize: "contain",
        }}
      />
    );
  }

  return tool.icon ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-full" style={{ color }}>
      <path d={tool.icon.path} fill="currentColor" />
    </svg>
  ) : (
    <span
      aria-hidden="true"
      className="flex size-full items-center justify-center rounded-md border border-current font-mono text-xs font-bold"
      style={{ color }}
    >
      {tool.name}
    </span>
  );
};

interface PixelatedLogoProps {
  tool: Tool;
  /** Shows the full-color logo. */
  active: boolean;
  /** Time of a full sweep, in seconds. */
  duration?: number;
}

/**
 * Shows the mono logo in the foreground color. When active, colored pixel blocks sweep up the logo
 * and sharpen into the full-color logo, or into the brand color when the tool has none. When
 * inactive again, the sweep goes back from where it is.
 */
export const PixelatedLogo = ({ tool, active, duration = 0.35 }: PixelatedLogoProps) => {
  const monoRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progress = useMotionValue(0);
  const reduceMotion = useReducedMotion() === true;

  useEffect(() => {
    let ignore = false;
    let pixelSweep: PixelSweep | null = null;

    const build = async () => {
      const source = await getImageSource(getLogoSrc(tool));
      const monoElement = monoRef.current;
      const colorElement = colorRef.current;
      const canvas = canvasRef.current;

      if (ignore || monoElement === null || colorElement === null || canvas === null) {
        return;
      }

      pixelSweep = createPixelSweep(colorElement, canvas, source, {
        direction: "up",
        stepSize: STEP_SIZE,
        replaced: monoElement,
      });
      pixelSweep?.render(progress.get());
    };

    void build();

    const unsubscribe = progress.on("change", (value) => {
      pixelSweep?.render(value);
    });

    return () => {
      ignore = true;
      unsubscribe();
      pixelSweep?.clear();
    };
  }, [tool, progress]);

  useEffect(() => {
    const target = active ? 1 : 0;
    const remaining = Math.abs(target - progress.get());

    if (reduceMotion) {
      progress.jump(target);
    }

    const controls = reduceMotion
      ? null
      : animate(progress, target, { duration: duration * remaining, ease: "easeOut" });

    return () => {
      controls?.stop();
    };
  }, [active, reduceMotion, duration, progress]);

  return (
    <div className="relative size-full">
      <div ref={monoRef} className="size-full">
        <ToolLogo tool={tool} color="var(--foreground)" />
      </div>
      <div
        ref={colorRef}
        data-pixel-ignore
        className="absolute inset-0 [clip-path:inset(100%_0_0_0)]"
      >
        {tool.colorSrc === undefined ? (
          <ToolLogo tool={tool} color={tool.color} />
        ) : (
          <img src={tool.colorSrc} alt="" className="size-full object-contain" />
        )}
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      />
    </div>
  );
};
