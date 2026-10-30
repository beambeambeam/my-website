import { getPixelPhases, getPixelSteps } from "@my-website/ui/lib/pixel-loader";
import type { PixelGrid, PixelPattern } from "@my-website/ui/lib/pixel-loader";
import { describe, expect, test } from "vite-plus/test";

const at = (row: number, column: number, grid: PixelGrid = 5) => row * grid + column;

const PATTERNS: PixelPattern[] = [
  "ripple",
  "sweep",
  "diagonal",
  "spiral",
  "checker",
  "scatter",
  "pulse",
  "diamond",
  "radar",
  "snake",
  "rain",
  "corners",
  "cross",
];

const GRIDS: PixelGrid[] = [3, 5];

describe("getPixelSteps", () => {
  test.each(GRIDS.flatMap((grid) => PATTERNS.map((pattern) => [pattern, grid] as const)))(
    "%s on a %i×%i grid gives one integer step per cell, starting at 0",
    (pattern, grid) => {
      const steps = getPixelSteps(pattern, { grid });

      expect(steps).toHaveLength(grid * grid);
      expect(Math.min(...steps)).toBe(0);
      expect(steps.every(Number.isInteger)).toBe(true);
    },
  );

  test("defaults to a 5×5 grid", () => {
    expect(getPixelSteps("ripple")).toHaveLength(25);
  });

  test("ripple starts at the center and ends at the corners", () => {
    const steps = getPixelSteps("ripple");

    expect(steps[at(2, 2)]).toBe(0);
    expect(steps[at(1, 2)]).toBe(1);
    expect(steps[at(0, 0)]).toBe(2);
    expect(steps[at(4, 4)]).toBe(2);
  });

  test("ripple on a 3×3 grid has two steps", () => {
    const steps = getPixelSteps("ripple", { grid: 3 });

    expect(steps[at(1, 1, 3)]).toBe(0);
    expect(steps[at(0, 0, 3)]).toBe(1);
  });

  test("sweep follows the direction", () => {
    expect(getPixelSteps("sweep", { direction: "right" })[at(0, 4)]).toBe(4);
    expect(getPixelSteps("sweep", { direction: "left" })[at(0, 4)]).toBe(0);
    expect(getPixelSteps("sweep", { direction: "down" })[at(4, 0)]).toBe(4);
    expect(getPixelSteps("sweep", { direction: "up" })[at(4, 0)]).toBe(0);
  });

  test("diagonal runs from the top-left to the bottom-right corner", () => {
    const steps = getPixelSteps("diagonal");

    expect(steps[at(0, 0)]).toBe(0);
    expect(steps[at(4, 4)]).toBe(8);
  });

  test("checker alternates between two steps", () => {
    const steps = getPixelSteps("checker");

    expect(steps[at(0, 0)]).toBe(0);
    expect(steps[at(0, 1)]).toBe(1);
    expect(steps[at(1, 1)]).toBe(0);
  });

  test.each(
    GRIDS.flatMap((grid) =>
      (["spiral", "scatter", "snake"] as const).map((pattern) => [pattern, grid] as const),
    ),
  )("%s on a %i×%i grid lights each cell at its own step", (pattern, grid) => {
    const steps = getPixelSteps(pattern, { grid });

    expect(new Set(steps).size).toBe(grid * grid);
  });

  test("spiral goes clockwise from the top-left corner to the center", () => {
    const steps = getPixelSteps("spiral");

    expect(steps[at(0, 0)]).toBe(0);
    expect(steps[at(0, 4)]).toBe(4);
    expect(steps[at(4, 4)]).toBe(8);
    expect(steps[at(2, 2)]).toBe(24);
  });

  test.each(["scatter", "rain"] as const)("%s is the same on each call", (pattern) => {
    expect(getPixelSteps(pattern)).toEqual(getPixelSteps(pattern));
  });

  test("pulse lights all cells at once", () => {
    expect(new Set(getPixelSteps("pulse"))).toEqual(new Set([0]));
  });

  test("diamond grows from the center by grid distance", () => {
    const steps = getPixelSteps("diamond");

    expect(steps[at(2, 2)]).toBe(0);
    expect(steps[at(1, 1)]).toBe(2);
    expect(steps[at(0, 0)]).toBe(4);
  });

  test("radar turns clockwise from 12 o'clock", () => {
    const steps = getPixelSteps("radar");

    expect(steps[at(0, 2)]).toBe(0);
    expect(steps[at(0, 4)]).toBe(2);
    expect(steps[at(2, 4)]).toBe(4);
    expect(steps[at(4, 2)]).toBe(8);
    expect(steps[at(2, 0)]).toBe(12);
  });

  test("snake turns at the end of each row", () => {
    const steps = getPixelSteps("snake");

    expect(steps[at(0, 4)]).toBe(4);
    expect(steps[at(1, 4)]).toBe(5);
    expect(steps[at(1, 0)]).toBe(9);
  });

  test("rain falls down each column", () => {
    const steps = getPixelSteps("rain");

    for (let column = 0; column < 5; column += 1) {
      expect(steps[at(1, column)]).toBe((steps[at(0, column)] ?? 0) + 1);
    }
  });

  test("corners start at the four corners and meet in the center", () => {
    const steps = getPixelSteps("corners");

    expect([at(0, 0), at(0, 4), at(4, 0), at(4, 4)].map((cell) => steps[cell])).toEqual([
      0, 0, 0, 0,
    ]);
    expect(steps[at(2, 2)]).toBe(4);
  });

  test("cross starts on both diagonals", () => {
    const steps = getPixelSteps("cross");

    expect(steps[at(0, 0)]).toBe(0);
    expect(steps[at(0, 4)]).toBe(0);
    expect(steps[at(2, 2)]).toBe(0);
    expect(steps[at(0, 2)]).toBe(2);
  });
});

describe("getPixelPhases", () => {
  test("divides the cycle equally between the steps", () => {
    const phases = getPixelPhases("ripple");

    expect(phases[at(2, 2)]).toBe(0);
    expect(phases[at(1, 2)]).toBeCloseTo(1 / 3);
    expect(phases[at(0, 0)]).toBeCloseTo(2 / 3);
  });
});
