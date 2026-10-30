/** Cells on each side of the Pixel Loader grid. */
export type PixelGrid = 3 | 5;

export type PixelPattern =
  | "ripple"
  | "sweep"
  | "diagonal"
  | "spiral"
  | "checker"
  | "scatter"
  | "pulse"
  | "diamond"
  | "radar"
  | "snake"
  | "rain"
  | "corners"
  | "cross";

/** Direction the sweep pattern moves in. */
export type PixelSweepDirection = "right" | "left" | "up" | "down";

export interface PixelPatternOptions {
  grid?: PixelGrid;
  direction?: PixelSweepDirection;
}

interface Grid {
  size: number;
  /** Index of the last row and the last column. */
  last: number;
  center: number;
}

type StepFn = (row: number, column: number, grid: Grid) => number;

const toCell = (row: number, column: number, { size }: Grid) => row * size + column;

/**
 * Returns a generator of fixed pseudo-random integers, so random patterns are the same on each
 * render.
 */
const createRandom = () => {
  // Park–Miller generator with a fixed seed.
  let seed = 7;

  return (max: number) => {
    seed = (seed * 16_807) % 2_147_483_647;

    return seed % max;
  };
};

/** Returns the cells in clockwise order, from the outer ring in to the center. */
const getSpiralCells = (grid: Grid) => {
  const cells: number[] = [];
  let top = 0;
  let bottom = grid.last;
  let left = 0;
  let right = grid.last;

  while (top <= bottom && left <= right) {
    for (let column = left; column <= right; column += 1) {
      cells.push(toCell(top, column, grid));
    }

    for (let row = top + 1; row <= bottom; row += 1) {
      cells.push(toCell(row, right, grid));
    }

    if (top < bottom) {
      for (let column = right - 1; column >= left; column -= 1) {
        cells.push(toCell(bottom, column, grid));
      }
    }

    if (left < right) {
      for (let row = bottom - 1; row > top; row -= 1) {
        cells.push(toCell(row, left, grid));
      }
    }

    top += 1;
    bottom -= 1;
    left += 1;
    right -= 1;
  }

  return cells;
};

/** Returns the cells in a fixed shuffled order. */
const getScatterCells = ({ size }: Grid) => {
  const random = createRandom();
  const remaining = Array.from({ length: size * size }, (_, index) => index);
  const cells: number[] = [];

  while (remaining.length > 0) {
    cells.push(...remaining.splice(random(remaining.length), 1));
  }

  return cells;
};

/** Returns a fixed start offset for each column of the rain pattern. */
const getRainOffsets = ({ size }: Grid) => {
  const random = createRandom();

  return Array.from({ length: size }, () => random(size));
};

const FULL_TURN = 2 * Math.PI;

const SWEEP_STEPS: Record<PixelSweepDirection, StepFn> = {
  right: (_row, column) => column,
  left: (_row, column, { last }) => last - column,
  down: (row) => row,
  up: (row, _column, { last }) => last - row,
};

/** Returns the step function of each pattern for a grid. */
const PATTERN_STEPS: Record<Exclude<PixelPattern, "sweep">, (grid: Grid) => StepFn> = {
  ripple:
    ({ center }) =>
    (row, column) =>
      Math.max(Math.abs(row - center), Math.abs(column - center)),
  diagonal: () => (row, column) => row + column,
  spiral: (grid) => {
    const cells = getSpiralCells(grid);

    return (row, column) => cells.indexOf(toCell(row, column, grid));
  },
  checker: () => (row, column) => (row + column) % 2,
  scatter: (grid) => {
    const cells = getScatterCells(grid);

    return (row, column) => cells.indexOf(toCell(row, column, grid));
  },
  pulse: () => () => 0,
  diamond:
    ({ center }) =>
    (row, column) =>
      Math.abs(row - center) + Math.abs(column - center),
  radar: ({ last, center }) => {
    // One step for each cell of the outer ring, clockwise from 12 o'clock.
    const stepCount = 4 * last;

    return (row, column) => {
      const angle = (Math.atan2(column - center, center - row) + FULL_TURN) % FULL_TURN;

      return Math.round((angle / FULL_TURN) * stepCount) % stepCount;
    };
  },
  snake:
    ({ size, last }) =>
    (row, column) =>
      row * size + (row % 2 === 0 ? column : last - column),
  rain: (grid) => {
    const offsets = getRainOffsets(grid);

    return (row, column) => row + (offsets.at(column) ?? 0);
  },
  corners:
    ({ last }) =>
    (row, column) =>
      Math.min(row, last - row) + Math.min(column, last - column),
  cross:
    ({ last }) =>
    (row, column) =>
      Math.min(Math.abs(row - column), Math.abs(row + column - last)),
};

/** Returns the step at which each cell lights up, in row-major order. Steps start at 0. */
export const getPixelSteps = (
  pattern: PixelPattern,
  { grid: size = 5, direction = "right" }: PixelPatternOptions = {},
): number[] => {
  const grid: Grid = { size, last: size - 1, center: (size - 1) / 2 };
  const getStep = pattern === "sweep" ? SWEEP_STEPS[direction] : PATTERN_STEPS[pattern](grid);

  const steps = Array.from({ length: size * size }, (_, index) =>
    getStep(Math.floor(index / size), index % size, grid),
  );

  const first = Math.min(...steps);

  return steps.map((step) => step - first);
};

/**
 * Returns the phase of each cell in the cycle, from 0 up to but not including 1. The cells of one
 * step share a phase, and the steps divide the cycle equally.
 */
export const getPixelPhases = (pattern: PixelPattern, options?: PixelPatternOptions): number[] => {
  const steps = getPixelSteps(pattern, options);
  const stepCount = Math.max(...steps) + 1;

  return steps.map((step) => step / stepCount);
};
