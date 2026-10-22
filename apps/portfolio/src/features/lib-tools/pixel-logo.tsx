import { useAnimate, useReducedMotion } from "motion/react";
import type { AnimationPlaybackControls } from "motion/react";
import { useEffect, useState } from "react";

import type { Tool } from "@/features/lib-tools/data";

/** Grid sizes of the pixel steps, from coarse to fine. */
const STEPS = [4, 8, 20];

/** Minimum cell alpha (0–255) to count as part of the logo. */
const ALPHA_THRESHOLD = 10;

/** Time each step after the first stays on screen, in ms. */
const STEP_HOLD = 90;

const DONE = STEPS.length;
const PIXEL = "[data-pixel]";

interface Grid {
  size: number;
  /** Indexes of the cells the logo covers. */
  cells: number[];
}

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

const loadImage = async (src: string | null) => {
  if (src === null) {
    return null;
  }

  const image = new Image();
  image.src = src;

  try {
    await image.decode();

    return image;
  } catch {
    return null;
  }
};

const rasterize = async (tool: Tool): Promise<Grid[]> => {
  const image = await loadImage(getLogoSrc(tool));

  return STEPS.map((size) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (image === null || ctx === null) {
      return { size, cells: [] };
    }

    const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);

    const { data } = ctx.getImageData(0, 0, size, size);
    const cells: number[] = [];

    for (let cell = 0; cell < size * size; cell += 1) {
      if (data[cell * 4 + 3] >= ALPHA_THRESHOLD) {
        cells.push(cell);
      }
    }

    return { size, cells };
  });
};

const gridCache = new Map<string, Promise<Grid[]>>();

const getGrids = async (tool: Tool) => {
  let grids = gridCache.get(tool.name);

  if (grids === undefined) {
    grids = rasterize(tool);
    gridCache.set(tool.name, grids);
  }

  return await grids;
};

const useGrids = (tool: Tool) => {
  const [grids, setGrids] = useState<Grid[] | null>(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      const result = await getGrids(tool);

      if (!ignore) {
        setGrids(result);
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [tool]);

  return grids;
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

interface PixelLogoProps {
  tool: Tool;
  /** Shows the logo in its brand color. */
  active: boolean;
  /** Time of the first pixel step, in seconds. */
  duration?: number;
}

/** Loads the brand color logo as pixel blocks, then sharpens it to the SVG. */
export const PixelLogo = ({ tool, active, duration = 0.3 }: PixelLogoProps) => {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion() === true;
  const grids = useGrids(tool);
  const [step, setStep] = useState(0);
  const [prevActive, setPrevActive] = useState(active);

  if (active !== prevActive) {
    setPrevActive(active);
    setStep(0);
  }

  const animated = active && !reduceMotion && grids !== null;
  const shownStep = animated ? step : DONE;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animation: AnimationPlaybackControls | undefined;

    const showStep = (next: number) => {
      setStep(next);

      if (next < DONE) {
        timer = setTimeout(() => {
          showStep(next + 1);
        }, STEP_HOLD);
      }
    };

    const run = async () => {
      animation = animate(
        PIXEL,
        { opacity: [0, 1] },
        { duration: 0, delay: () => Math.random() * duration },
      );
      await animation.finished;

      if (!cancelled) {
        showStep(1);
      }
    };

    if (animated) {
      void run();
    }

    return () => {
      cancelled = true;
      animation?.stop();
      clearTimeout(timer);
    };
  }, [animated, animate, duration]);

  return (
    <div ref={scope} className="relative size-full">
      <ToolLogo tool={tool} color="var(--muted-foreground)" />
      {active &&
        grids?.map(({ size, cells }, index) => (
          <svg
            key={size}
            aria-hidden="true"
            viewBox={`0 0 ${size} ${size}`}
            className="absolute inset-0 size-full [shape-rendering:crispEdges]"
            style={{ color: tool.color, visibility: shownStep === index ? "visible" : "hidden" }}
          >
            {cells.map((cell) => (
              <rect
                key={cell}
                data-pixel={index === 0 ? "" : undefined}
                x={cell % size}
                y={Math.floor(cell / size)}
                width={1}
                height={1}
                fill="currentColor"
                style={index === 0 ? { opacity: 0 } : undefined}
              />
            ))}
          </svg>
        ))}
      {active && shownStep === DONE && (
        <div aria-hidden="true" className="absolute inset-0">
          <ToolLogo tool={tool} color={tool.color} />
        </div>
      )}
    </div>
  );
};
