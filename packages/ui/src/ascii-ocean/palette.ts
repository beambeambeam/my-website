import { clamp } from "./math";

type Rgb = [number, number, number];

export const FISH_ALPHAS = [0.2, 0.3, 0.42, 0.56, 0.72] as const;

/** Every fill style the renderer uses, built once per theme. */
export interface Palette {
  /** A fish at full brightness. */
  glint: string;
  /** Fish by brightness, in the order of `FISH_ALPHAS`. */
  fish: string[];
}

const rgb = ([r, g, b]: Rgb) =>
  `rgb(${Math.round(clamp(r, 0, 255))},${Math.round(clamp(g, 0, 255))},${Math.round(clamp(b, 0, 255))})`;

const rgba = ([r, g, b]: Rgb, alpha: number) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha.toFixed(3)})`;

/** Resolves any CSS color, `oklch()` included, to RGB by painting one pixel. */
const resolve = (probe: CanvasRenderingContext2D, color: string, fallback: Rgb): Rgb => {
  if (color.trim() === "") {
    return fallback;
  }

  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 0] = probe.getImageData(0, 0, 1, 1).data;

  return a === 0 ? fallback : [r, g, b];
};

/** Builds the palette from the text color of `element`. Fish are that color at a few alphas. */
export const readPalette = (element: Element): Palette => {
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const { color } = getComputedStyle(element);
  const fg: Rgb = probe === null ? [232, 228, 218] : resolve(probe, color, [232, 228, 218]);

  return {
    glint: rgb(fg),
    fish: FISH_ALPHAS.map((alpha) => rgba(fg, alpha)),
  };
};
