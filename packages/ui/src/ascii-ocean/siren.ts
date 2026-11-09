/**
 * Siren: a round seal mermaid with two hair buns and a red fish tail. Like the sharks, she is seen
 * from below with her belly to the viewer. Her head leads the way she swims, her tail sweeps from
 * side to side and bends into her turns, and her flippers paddle.
 *
 * Her body is a set of shapes in body units: `s` runs from her nose (0) to her tail tip (1), and
 * `u` runs across her body. Both are in units of her length. `sirenCells` samples one point per
 * grid cell, so she can face any way, and the renderer draws the cells like the sharks: a block per
 * cell.
 */
import { angleDiff, clamp, rand, smoothstep, TAU } from "./math";

/** How one part of her draws: a block, and an optional glyph on top. */
export interface SirenInk {
  fill: string;
  /** The glyph, or a set of glyphs that the cell picks from by its position. */
  glyph?: string;
  ink?: string;
}

const HAIR = "#2c2c31";
const SKIN = "#ffffff";
const SCALE_LINE = "#8f3238";
const RED = "#cf5f63";

/** Inks by body part. `D` is the outline of her tail. */
export const SIREN_INKS: ReadonlyMap<string, SirenInk> = new Map([
  // A dense texture, like the shadow side of a shark, keeps the black hair visible on a dark page.
  ["K", { fill: HAIR, glyph: "%#@8", ink: "#6a6a72" }],
  ["W", { fill: SKIN }],
  ["F", { fill: SKIN, glyph: "'", ink: "#8d887f" }],
  ["P", { fill: "#eba3a6" }],
  ["B", { fill: "#f2c4c3" }],
  ["R", { fill: RED }],
  ["S", { fill: RED, glyph: "u", ink: SCALE_LINE }],
  ["T", { fill: "#dc7b80", glyph: "=", ink: SCALE_LINE }],
  ["D", { fill: SCALE_LINE }],
  ["E", { fill: "#141416" }],
  ["H", { fill: SKIN }],
  ["w", { fill: SKIN, glyph: "=", ink: "#8d887f" }],
  ["m", { fill: SKIN, glyph: "w", ink: HAIR }],
]);

/** Inks while she blinks: the eyes close to a line. */
export const SIREN_BLINK_INKS: ReadonlyMap<string, SirenInk> = new Map([
  ["E", { fill: SKIN, glyph: "-", ink: HAIR }],
  ["H", { fill: SKIN, glyph: "-", ink: HAIR }],
]);

// Body layout, in units of her length. She is chubby: a big head, a round white body with a red
// bottom, and a short tail.
const HEAD_S = 0.22;
const HEAD_R = 0.22;
const BUN_S = 0.37;
const BUN_U = 0.19;
const BUN_R = 0.075;
const BODY_S = 0.56;
const BODY_HALF_S = 0.22;
const BODY_HALF_U = 0.19;
const TAIL_START = 0.66;
const FIN_START = 0.86;
const TAIL_PARTS = "PRST";

const inEllipse = (dx: number, dy: number, rx: number, ry: number) =>
  (dx / rx) ** 2 + (dy / ry) ** 2 <= 1;

/** The head, with `hs` from its center toward her tail and `au` the distance from her middle. */
const headPart = (hs: number, au: number) => {
  // Two big eyes that look the way she swims, each with a highlight toward the front.
  if (inEllipse(hs + 0.06, au - 0.09, 0.055, 0.05)) {
    return inEllipse(hs + 0.085, au - 0.08, 0.02, 0.02) ? "H" : "E";
  }

  if (hs < -0.175 && au < 0.03) {
    return "m";
  }

  if (inEllipse(hs, au - 0.135, 0.024, 0.04)) {
    return "B";
  }

  if (hs > -0.16 && hs < -0.09 && au > 0.14) {
    return "w";
  }

  // Hair caps the back of her head and dips to a point between her eyes.
  const peak = 0.12 * Math.max(0, 1 - au / 0.07);

  return hs > 0.09 - peak ? "K" : "W";
};

/** A flipper on one side. It sweeps back and forth about its root. */
const flipperPart = (s: number, au: number, phase: number) => {
  const sweep = 0.5 + 0.35 * Math.sin(phase);
  const ds = s - 0.46;
  const du = au - 0.15;
  const along = du * Math.cos(sweep) + ds * Math.sin(sweep);
  const across = ds * Math.cos(sweep) - du * Math.sin(sweep);

  return inEllipse(along - 0.07, across, 0.09, 0.042);
};

/** Below the pink band: the round red bottom of her body, then the tail and a forked fin. */
const tailPart = (s: number, au: number) => {
  if (s < TAIL_START + 0.03) {
    return "P";
  }

  if (s < FIN_START + 0.02) {
    // Rows of scales, offset like brickwork.
    const ring = Math.floor(s * 30);

    return (ring + Math.floor(au * 24 + (ring % 2) * 0.5)) % 2 === 0 ? "S" : "R";
  }

  return "T";
};

const inTail = (s: number, au: number) => {
  if (s < FIN_START + 0.02) {
    const t = (s - TAIL_START) / (FIN_START + 0.02 - TAIL_START);

    return au <= 0.035 + 0.12 * (1 - t) ** 1.5;
  }

  // A forked fin that fans out.
  const q = (s - FIN_START) / (1 - FIN_START);
  const notch = q > 0.5 ? (0.08 * (q - 0.5)) / 0.5 : 0;

  return au <= 0.035 + 0.14 * q ** 0.8 && au >= notch;
};

/** The body part at (s, u), or "." for open water. She is the same on both sides. */
const bodyPart = (s: number, u: number, phase: number) => {
  const au = Math.abs(u);

  if (s < -0.02 || s > 1 || au > 0.36) {
    return ".";
  }

  if (Math.hypot(s - BUN_S, au - BUN_U) <= BUN_R) {
    // A red ribbon sits in each bun.
    return Math.hypot(s - BUN_S, au - BUN_U) < BUN_R * 0.45 ? "R" : "K";
  }

  if (Math.hypot(s - HEAD_S, au) <= HEAD_R) {
    return headPart(s - HEAD_S, au);
  }

  // The flippers stroke together, so the sign of `u` does not matter.
  if (flipperPart(s, au, phase)) {
    return "F";
  }

  const inBody = inEllipse(s - BODY_S, au, BODY_HALF_S, BODY_HALF_U);

  if (s < TAIL_START) {
    return inBody ? "W" : ".";
  }

  return inBody || inTail(s, au) ? tailPart(s, au) : ".";
};

export interface Siren {
  /** Middle of her body in px. */
  x: number;
  y: number;
  /** The way her head points, in radians. */
  heading: number;
  /** How fast her heading turns, in rad/s. Her tail bends into the turn. */
  turn: number;
  speed: number;
  /** Length from nose to tail tip in px. */
  length: number;
  /** Tail-beat phase. */
  phase: number;
  targetX: number;
  targetY: number;
  retargetAt: number;
  /** Half the size of her bounding box in px. She can face any way, so both are half her length. */
  halfW: number;
  halfH: number;
}

export const createSiren = (): Siren => ({
  x: 0,
  y: 0,
  heading: rand(0, TAU),
  turn: 0,
  speed: 0,
  length: 0,
  phase: 0,
  targetX: 0,
  targetY: 0,
  retargetAt: 0,
  halfW: 0,
  halfH: 0,
});

/** A block of cells to draw at (col0, row0). Each character is a body part, "." is open water. */
export interface SirenCells {
  col0: number;
  row0: number;
  rows: string[];
}

/** How far her spine sits to her right at `s`: a side-to-side tail sweep, and a bend into turns. */
const spineOffset = (siren: Siren, s: number) => {
  const sweep = 0.06 * smoothstep(0.6, 1, s) * Math.sin(siren.phase - s * 5);
  const bend = clamp(siren.turn, -1.5, 1.5) * 0.25 * Math.max(0, s - 0.5) ** 2;

  return sweep + bend;
};

/**
 * Samples her body at the middle of each grid cell that her bounding box covers, then outlines her
 * tail with `D` so it reads on both themes.
 */
export const sirenCells = (siren: Siren, cellW: number, cellH: number): SirenCells => {
  const { x, y, length, heading, phase } = siren;
  const col0 = Math.floor((x - siren.halfW) / cellW) - 1;
  const row0 = Math.floor((y - siren.halfH) / cellH) - 1;
  const cols = Math.ceil((siren.halfW * 2) / cellW) + 3;
  const rowCount = Math.ceil((siren.halfH * 2) / cellH) + 3;
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const parts: string[][] = [];

  for (let r = 0; r < rowCount; r += 1) {
    const line: string[] = [];
    const dy = (row0 + r + 0.5) * cellH - y;

    for (let c = 0; c < cols; c += 1) {
      const dx = (col0 + c + 0.5) * cellW - x;
      const s = 0.5 - (dx * fx + dy * fy) / length;
      const u = (dy * fx - dx * fy) / length - spineOffset(siren, s);

      line.push(bodyPart(s, u, phase));
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

const CRUISE = 40;

/** She turns at most this fast, in rad/s. */
const MAX_TURN = 1.1;

/** The range of centers that keep all of her inside the box. A small box pins her to the middle. */
const span = (half: number, size: number) =>
  half * 2 >= size ? ([size / 2, size / 2] as const) : ([half, size - half] as const);

const keepInside = (siren: Siren, width: number, height: number) => {
  const [minX, maxX] = span(siren.halfW, width);
  const [minY, maxY] = span(siren.halfH, height);

  siren.x = clamp(siren.x, minX, maxX);
  siren.y = clamp(siren.y, minY, maxY);
};

const pickTarget = (siren: Siren, width: number, height: number, time: number) => {
  const [minX, maxX] = span(siren.halfW, width);
  const [minY, maxY] = span(siren.halfH, height);

  siren.targetX = rand(minX, maxX);
  siren.targetY = rand(minY, maxY);
  siren.retargetAt = time + rand(6, 11);
};

/** Sizes her to the box. On the first call she also gets a random spot. */
export const fitSiren = (
  siren: Siren,
  box: { width: number; height: number; time: number },
  place: boolean,
) => {
  const { width, height, time } = box;
  const minSide = Math.min(width, height);

  // As long as the biggest shark.
  siren.length = Math.min(clamp(minSide * 0.46, 120, 430), minSide * 0.95);
  siren.halfW = siren.length / 2;
  siren.halfH = siren.length / 2;

  if (place) {
    siren.x = rand(0, width);
    siren.y = rand(0, height);
    pickTarget(siren, width, height, time);
  }

  keepInside(siren, width, height);
};

/** Swims from spot to spot, always head first. After a click she swims over to look. */
export const stepSiren = (
  siren: Siren,
  dt: number,
  box: {
    width: number;
    height: number;
    time: number;
    lure: { x: number; y: number; until: number };
  },
) => {
  const { width, height, time, lure } = box;
  const luring = time < lure.until;
  const toTarget = Math.hypot(siren.targetX - siren.x, siren.targetY - siren.y);

  if (!luring && (time >= siren.retargetAt || toTarget < siren.length * 0.25)) {
    pickTarget(siren, width, height, time);
  }

  const tx = luring ? lure.x : siren.targetX;
  const ty = luring ? lure.y : siren.targetY;
  const want = angleDiff(siren.heading, Math.atan2(ty - siren.y, tx - siren.x));
  const turn = clamp(want * 1.5, -MAX_TURN, MAX_TURN);

  siren.turn += (turn - siren.turn) * Math.min(1, dt * 3);
  siren.heading += siren.turn * dt;

  // Slow down for a sharp turn, and swim faster to a click.
  const speed = CRUISE * (luring ? 1.5 : 1) * (1 - 0.5 * Math.min(1, Math.abs(want) / Math.PI));

  siren.speed += (speed - siren.speed) * Math.min(1, dt * 1.5);
  siren.x += Math.cos(siren.heading) * siren.speed * dt;
  siren.y += Math.sin(siren.heading) * siren.speed * dt;
  siren.phase = (siren.phase + dt * TAU * (0.6 + siren.speed / 50)) % TAU;

  keepInside(siren, width, height);
};

/**
 * The way from her spine (a line from her head to her tail fin) to the point (x, y): a unit vector
 * and the distance in units of her length. Fish and sharks use it to give her room.
 */
export const awayFromSiren = (siren: Siren, x: number, y: number) => {
  const fx = Math.cos(siren.heading);
  const fy = Math.sin(siren.heading);
  const reach = siren.length;
  const along = clamp((x - siren.x) * fx + (y - siren.y) * fy, -reach * 0.36, reach * 0.26);
  const dx = x - (siren.x + fx * along);
  const dy = y - (siren.y + fy * along);
  const d = Math.hypot(dx, dy) || 1;

  return { x: dx / d, y: dy / d, d: d / siren.length };
};
