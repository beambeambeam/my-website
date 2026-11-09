export const TAU = Math.PI * 2;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
};

/** Shortest signed angle from `a` to `b`, in (-PI, PI]. */
export const angleDiff = (a: number, b: number) => {
  let d = (b - a) % TAU;

  if (d > Math.PI) {
    d -= TAU;
  }

  if (d < -Math.PI) {
    d += TAU;
  }

  return d;
};

/** Cheap integer hash to [0, 1). It is deterministic, so textures stay stable from frame to frame. */
// An integer hash needs xor and unsigned shifts.
/* oxlint-disable no-bitwise */
export const hash3 = (x: number, y: number, z: number) => {
  let h = Math.imul(x, 374_761_393) ^ Math.imul(y, 668_265_263);

  h ^= Math.imul(z, 1_442_695_041);
  h = Math.imul(h ^ (h >>> 13), 1_274_126_177);
  h ^= h >>> 16;

  return (h >>> 0) / 4_294_967_296;
};
/* oxlint-enable no-bitwise */

const K1 = 1 / 260;
const K2 = 1 / 310;
const K3 = 1 / 190;
const CURRENT_SCALE = 3400;

/**
 * Divergence-free ocean current: the curl of a slowly drifting stream function ψ(x, y, t). It has
 * no sources or sinks, so it moves the schools around without bunching them up in one corner.
 */
export const current = (x: number, y: number, t: number, out: { x: number; y: number }) => {
  const a = x * K1 + t * 0.07;
  const b = y * K2 - t * 0.05;
  const c = (x + y) * K3 + t * 0.11;

  // u = ∂ψ/∂y, v = -∂ψ/∂x with ψ = sin(a)cos(b) + 0.5 sin(c)
  out.x = (-K2 * Math.sin(a) * Math.sin(b) + 0.5 * K3 * Math.cos(c)) * CURRENT_SCALE;
  out.y = (-K1 * Math.cos(a) * Math.cos(b) - 0.5 * K3 * Math.cos(c)) * CURRENT_SCALE;

  return out;
};
