import { DIA_COLORS } from "@my-website/ui/lib/dia-colors";

import { ANATOMY, SHARK_KINDS } from "./anatomy";
import { clamp } from "./math";

type Rgb = [number, number, number];

/** Shades of shark skin per kind, from the background color (0) to the foreground color. */
export const SKIN_LEVELS = 48;
export const FISH_ALPHAS = [0.28, 0.42, 0.58, 0.74, 0.9] as const;
export const WAKE_LEVELS = 6;
export const HEAT_LEVELS = 8;

/** Every fill style the renderer uses, built once per theme. */
export interface Palette {
  /** `skin[kind][level]`, with `kind` in the order of `SHARK_KINDS`. */
  skin: string[][];
  /** Dark skin markings per kind. */
  marks: string[];
  /** Glyph on bright skin, and on dim skin. */
  glyphOnLight: string;
  glyphOnDark: string;
  eye: string;
  glint: string;
  accents: readonly string[];
  fish: string[];
  wake: string[];
  /** Bright Dia orange for a fresh bite, Dia pink as it fades. */
  heatHot: string[];
  heatCool: string[];
  grid: string;
}

const HEX = /^#(?<r>[\da-f]{2})(?<g>[\da-f]{2})(?<b>[\da-f]{2})$/iu;

const fromHex = (hex: string): Rgb => {
  const { r = "0", g = "0", b = "0" } = HEX.exec(hex)?.groups ?? {};

  return [Number.parseInt(r, 16), Number.parseInt(g, 16), Number.parseInt(b, 16)];
};

const rgb = ([r, g, b]: Rgb) =>
  `rgb(${Math.round(clamp(r, 0, 255))},${Math.round(clamp(g, 0, 255))},${Math.round(clamp(b, 0, 255))})`;

const rgba = ([r, g, b]: Rgb, alpha: number) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha.toFixed(3)})`;

const mix = (from: Rgb, to: Rgb, t: number): Rgb => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
];

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

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

/**
 * Builds the palette from the text color of `element` and the `--background` variable. Sharks are
 * shades between the two, so they read as ink in light mode and as light in dark mode.
 */
export const readPalette = (element: Element): Palette => {
  const style = getComputedStyle(element);
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const fg: Rgb = probe === null ? [232, 228, 218] : resolve(probe, style.color, [232, 228, 218]);

  const bg: Rgb =
    probe === null
      ? [22, 22, 22]
      : resolve(probe, style.getPropertyValue("--background"), [22, 22, 22]);

  const [pink = "#f472b6", orange = "#fb923c"] = DIA_COLORS.slice(1, 3);

  const shade = (t: number, tint: Rgb = [1, 1, 1]) => {
    const [r, g, b] = mix(bg, fg, t);

    return rgb([r * tint[0], g * tint[1], b * tint[2]]);
  };

  return {
    skin: SHARK_KINDS.map((kind) =>
      range(SKIN_LEVELS).map((level) => shade(level / (SKIN_LEVELS - 1), ANATOMY[kind].tint)),
    ),
    marks: SHARK_KINDS.map((kind) => shade(0.27, ANATOMY[kind].tint)),
    glyphOnLight: shade(0.03),
    glyphOnDark: shade(0.09),
    eye: shade(0.62),
    glint: rgb(fg),
    accents: DIA_COLORS,
    fish: FISH_ALPHAS.map((alpha) => rgba(fg, alpha)),
    wake: range(WAKE_LEVELS).map((level) => rgba(fg, (0.12 * (level + 1)) / 1.2)),
    heatHot: range(HEAT_LEVELS).map((level) => rgba(fromHex(orange), (level + 1) / HEAT_LEVELS)),
    heatCool: range(HEAT_LEVELS).map((level) => rgba(fromHex(pink), (level + 1) / HEAT_LEVELS)),
    grid: rgba(fg, 0.045),
  };
};
