/**
 * Siren: a round seal mermaid with two hair buns and a red fish tail. She swims from spot to spot,
 * and after a click she swims over to look. Her body and motion are shared with her mermaids, see
 * `swimmer.ts`.
 */
import { clamp, rand, TAU } from "./math";
import {
  createSwimmer,
  inEllipse,
  inFlipper,
  keepInside,
  lowerBody,
  setLength,
  span,
  swimToward,
} from "./swimmer";
import type { Swimmer } from "./swimmer";

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
const FLIPPER = { rootS: 0.46, rootU: 0.15, length: 0.09, width: 0.042 };
const TAIL = { start: 0.66, fin: 0.86, width: 0.12, finWidth: 0.14, scaleRows: 30 };

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

/** The body part at (s, u), or "." for open water. She is the same on both sides. */
const sirenBody = (s: number, u: number, phase: number) => {
  const au = Math.abs(u);

  if (au > 0.36) {
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
  if (inFlipper(s, au, phase, FLIPPER)) {
    return "F";
  }

  const inBody = inEllipse(s - BODY_S, au, BODY_HALF_S, BODY_HALF_U);

  if (s < TAIL.start) {
    return inBody ? "W" : ".";
  }

  return lowerBody(s, au, inBody, TAIL);
};

const CRUISE = 40;

/** She turns at most this fast, in rad/s. */
const MAX_TURN = 1.1;

export interface Siren extends Swimmer {
  targetX: number;
  targetY: number;
  retargetAt: number;
}

export const createSiren = (): Siren => ({
  ...createSwimmer(sirenBody, rand(0, TAU)),
  targetX: 0,
  targetY: 0,
  retargetAt: 0,
});

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

  setLength(siren, Math.min(clamp(minSide * 0.46, 120, 430), minSide * 0.95));

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

  // Swim faster to a click.
  swimToward(
    siren,
    {
      x: luring ? lure.x : siren.targetX,
      y: luring ? lure.y : siren.targetY,
      speed: CRUISE * (luring ? 1.5 : 1),
      maxTurn: MAX_TURN,
    },
    dt,
  );
  keepInside(siren, width, height);
};
