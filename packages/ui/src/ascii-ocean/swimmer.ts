/**
 * Swimmers: Siren and her mermaids. Like the sharks, they are seen from below with the belly to the
 * viewer. The head leads the way they swim, the tail sweeps from side to side and bends into
 * turns.
 *
 * A body is a shape in body units: `s` runs from the nose (0) to the tail tip (1), and `u` runs
 * across the body. Both are in units of the length. `swimmerCells` samples one point per grid cell,
 * so a swimmer can face any way, and the renderer draws the cells like the sharks: a block per
 * cell.
 */
import { angleDiff, clamp, smoothstep, TAU } from "./math";

/** How one body part draws: a block, and an optional glyph on top. */
export interface SwimmerInk {
  fill: string;
  /** The glyph, or a set of glyphs that the cell picks from by its position. */
  glyph?: string;
  ink?: string;
}

const HAIR = "#2c2c31";
const SKIN = "#ffffff";
const SCALE_LINE = "#8f3238";
const RED = "#cf5f63";
const INK = "#141416";

/** Inks by body part. `D` is the outline of a tail. */
export const SWIMMER_INKS: ReadonlyMap<string, SwimmerInk> = new Map([
  // A dense texture, like the shadow side of a shark, keeps black hair visible on a dark page.
  ["K", { fill: HAIR, glyph: "%#@8", ink: "#6a6a72" }],
  ["W", { fill: SKIN }],
  ["F", { fill: SKIN, glyph: "'", ink: "#8d887f" }],
  ["P", { fill: "#eba3a6" }],
  ["B", { fill: "#f2c4c3" }],
  ["C", { fill: RED }],
  ["R", { fill: RED }],
  ["S", { fill: RED, glyph: "u", ink: SCALE_LINE }],
  ["T", { fill: "#dc7b80", glyph: "=", ink: SCALE_LINE }],
  ["D", { fill: SCALE_LINE }],
  ["E", { fill: INK }],
  ["O", { fill: INK, glyph: "o", ink: "#6a6a72" }],
  ["H", { fill: SKIN }],
  ["w", { fill: SKIN, glyph: "=", ink: "#8d887f" }],
  ["m", { fill: SKIN, glyph: "w", ink: HAIR }],
]);

/** Inks while a swimmer blinks: the eyes close to a line. */
export const SWIMMER_BLINK_INKS: ReadonlyMap<string, SwimmerInk> = new Map([
  ["E", { fill: SKIN, glyph: "-", ink: HAIR }],
  ["H", { fill: SKIN, glyph: "-", ink: HAIR }],
]);

/** Parts of a tail. Open water next to them is drawn as the dark red outline `D`. */
const TAIL_PARTS = "PRST";

/** The body part at (s, u), or "." for open water. `phase` is the tail-beat phase. */
export type BodyPartAt = (s: number, u: number, phase: number) => string;

export const inEllipse = (dx: number, dy: number, rx: number, ry: number) =>
  (dx / rx) ** 2 + (dy / ry) ** 2 <= 1;

/** A flipper that sweeps back and forth about its root at (rootS, rootU). */
export const inFlipper = (
  s: number,
  au: number,
  phase: number,
  flipper: { rootS: number; rootU: number; length: number; width: number },
) => {
  const sweep = 0.5 + 0.35 * Math.sin(phase);
  const ds = s - flipper.rootS;
  const du = au - flipper.rootU;
  const along = du * Math.cos(sweep) + ds * Math.sin(sweep);
  const across = ds * Math.cos(sweep) - du * Math.sin(sweep);

  return inEllipse(along - flipper.length * 0.8, across, flipper.length, flipper.width);
};

/** Rows of scales, offset like brickwork. */
export const scaleAt = (s: number, au: number, rows: number) => {
  const ring = Math.floor(s * rows);

  return (ring + Math.floor(au * rows * 0.8 + (ring % 2) * 0.5)) % 2 === 0 ? "S" : "R";
};

export interface Swimmer {
  body: BodyPartAt;
  /** Middle of the body in px. */
  x: number;
  y: number;
  /** The way the head points, in radians. */
  heading: number;
  /** How fast the heading turns, in rad/s. The tail bends into the turn. */
  turn: number;
  speed: number;
  /** Length from nose to tail tip in px. */
  length: number;
  /** Tail-beat phase. */
  phase: number;
  /**
   * Half the size of the bounding box in px. A swimmer can face any way, so both are half the
   * length.
   */
  halfW: number;
  halfH: number;
}

export const createSwimmer = (body: BodyPartAt, heading: number): Swimmer => ({
  body,
  x: 0,
  y: 0,
  heading,
  turn: 0,
  speed: 0,
  length: 0,
  phase: 0,
  halfW: 0,
  halfH: 0,
});

export const setLength = (swimmer: Swimmer, length: number) => {
  swimmer.length = length;
  swimmer.halfW = length / 2;
  swimmer.halfH = length / 2;
};

/** A block of cells to draw at (col0, row0). Each character is a body part, "." is open water. */
export interface SwimmerCells {
  col0: number;
  row0: number;
  rows: string[];
}

/** How far the spine sits to the right at `s`: a side-to-side tail sweep, and a bend into turns. */
const spineOffset = (swimmer: Swimmer, s: number) => {
  const sweep = 0.06 * smoothstep(0.6, 1, s) * Math.sin(swimmer.phase - s * 5);
  const bend = clamp(swimmer.turn, -1.5, 1.5) * 0.25 * Math.max(0, s - 0.5) ** 2;

  return sweep + bend;
};

/**
 * Samples the body at the middle of each grid cell that the bounding box covers, then outlines the
 * tail with `D` so it reads on both themes.
 */
export const swimmerCells = (swimmer: Swimmer, cellW: number, cellH: number): SwimmerCells => {
  const { x, y, length, heading, phase, body } = swimmer;
  const col0 = Math.floor((x - swimmer.halfW) / cellW) - 1;
  const row0 = Math.floor((y - swimmer.halfH) / cellH) - 1;
  const cols = Math.ceil((swimmer.halfW * 2) / cellW) + 3;
  const rowCount = Math.ceil((swimmer.halfH * 2) / cellH) + 3;
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const parts: string[][] = [];

  for (let r = 0; r < rowCount; r += 1) {
    const line: string[] = [];
    const dy = (row0 + r + 0.5) * cellH - y;

    for (let c = 0; c < cols; c += 1) {
      const dx = (col0 + c + 0.5) * cellW - x;
      const s = 0.5 - (dx * fx + dy * fy) / length;
      const u = (dy * fx - dx * fy) / length - spineOffset(swimmer, s);

      line.push(s < -0.02 || s > 1 ? "." : body(s, u, phase));
    }

    parts.push(line);
  }

  const at = (r: number, c: number) => parts[r]?.[c] ?? ".";

  const rows = parts.map((line, r) =>
    line
      .map((part, c) => {
        if (part !== ".") {
          return part;
        }

        const near = [at(r - 1, c), at(r + 1, c), at(r, c - 1), at(r, c + 1)];

        return near.some((n) => TAIL_PARTS.includes(n)) ? "D" : ".";
      })
      .join(""),
  );

  return { col0, row0, rows };
};

/**
 * The range of centers that keep all of a swimmer inside the box. A small box pins it to the
 * middle.
 */
export const span = (half: number, size: number) =>
  half * 2 >= size ? ([size / 2, size / 2] as const) : ([half, size - half] as const);

export const keepInside = (swimmer: Swimmer, width: number, height: number) => {
  const [minX, maxX] = span(swimmer.halfW, width);
  const [minY, maxY] = span(swimmer.halfH, height);

  swimmer.x = clamp(swimmer.x, minX, maxX);
  swimmer.y = clamp(swimmer.y, minY, maxY);
};

/**
 * Swims head first toward (tx, ty): turns at most `maxTurn` rad/s, slows down for a sharp turn, and
 * beats the tail faster at speed. A small body beats its tail faster than a big one.
 */
export const swimToward = (
  swimmer: Swimmer,
  target: { x: number; y: number; speed: number; maxTurn: number },
  dt: number,
) => {
  const want = angleDiff(swimmer.heading, Math.atan2(target.y - swimmer.y, target.x - swimmer.x));
  const turn = clamp(want * 1.5, -target.maxTurn, target.maxTurn);
  const speed = target.speed * (1 - 0.5 * Math.min(1, Math.abs(want) / Math.PI));

  swimmer.turn += (turn - swimmer.turn) * Math.min(1, dt * 3);
  swimmer.heading += swimmer.turn * dt;
  swimmer.speed += (speed - swimmer.speed) * Math.min(1, dt * 1.5);
  swimmer.x += Math.cos(swimmer.heading) * swimmer.speed * dt;
  swimmer.y += Math.sin(swimmer.heading) * swimmer.speed * dt;

  const beat = 0.6 + swimmer.speed / Math.max(swimmer.length * 0.25, 1);

  swimmer.phase = (swimmer.phase + dt * TAU * beat) % TAU;
};

/**
 * The way from the spine (a line from the head to the tail fin) to the point (x, y): a unit vector
 * and the distance in units of the length. Fish and sharks use it to give a swimmer room.
 */
export const awayFrom = (swimmer: Swimmer, x: number, y: number) => {
  const fx = Math.cos(swimmer.heading);
  const fy = Math.sin(swimmer.heading);
  const reach = swimmer.length;
  const along = clamp((x - swimmer.x) * fx + (y - swimmer.y) * fy, -reach * 0.36, reach * 0.26);
  const dx = x - (swimmer.x + fx * along);
  const dy = y - (swimmer.y + fy * along);
  const d = Math.hypot(dx, dy) || 1;

  return { x: dx / d, y: dy / d, d: d / reach };
};

/**
 * Everything below the pink band: the round red bottom of the body, then a tail that tapers to a
 * forked fin. `inBody` says whether (s, au) is inside the round body.
 */
export const lowerBody = (
  s: number,
  au: number,
  inBody: boolean,
  tail: { start: number; fin: number; width: number; finWidth: number; scaleRows: number },
) => {
  const { start, fin, width, finWidth, scaleRows } = tail;
  const tip = Math.max(0.035, width * 0.25);
  let inTail = false;

  if (s < fin + 0.02) {
    const t = (s - start) / (fin + 0.02 - start);

    inTail = au <= tip + width * (1 - t) ** 1.5;
  } else {
    const q = (s - fin) / (1 - fin);
    const notch = q > 0.5 ? (finWidth * 0.55 * (q - 0.5)) / 0.5 : 0;

    inTail = au <= tip + finWidth * q ** 0.8 && au >= notch;
  }

  if (!inBody && !inTail) {
    return ".";
  }

  if (s < start + 0.03) {
    return "P";
  }

  return s < fin + 0.02 ? scaleAt(s, au, scaleRows) : "T";
};
