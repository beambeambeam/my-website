/**
 * Mermaids: Siren's two small companions, a third of her length. Each has a round white head with a
 * red patch on the crown, two short black antennae, dot eyes, an open mouth, and a red scaled tail.
 * They swim at her sides, a little behind her.
 */
import { clamp, rand } from "./math";
import {
  createSwimmer,
  inEllipse,
  inFlipper,
  keepInside,
  lowerBody,
  setLength,
  swimToward,
} from "./swimmer";
import type { Swimmer } from "./swimmer";

// Body layout, in units of the length. The head is most of the body. Seen head first from below,
// the top of the head leads: the red patch and the antennae are at the front, the mouth is toward
// the body.
const HEAD_S = 0.32;
const HEAD_R = 0.28;
const BODY_S = 0.62;
const BODY_HALF_S = 0.2;
const BODY_HALF_U = 0.24;
const FLIPPER = { rootS: 0.52, rootU: 0.2, length: 0.1, width: 0.05 };
const TAIL = { start: 0.72, fin: 0.87, width: 0.14, finWidth: 0.17, scaleRows: 14 };

/** The head, with `hs` from its center toward the tail and `au` the distance from the middle. */
const headPart = (hs: number, au: number) => {
  // A red patch on the crown.
  if (inEllipse(hs + 0.13, au, 0.085, 0.13)) {
    return "C";
  }

  if (inEllipse(hs - 0.03, au - 0.13, 0.06, 0.06)) {
    return "E";
  }

  return inEllipse(hs - 0.16, au, 0.07, 0.07) ? "O" : "W";
};

/** Two short black antennae on the crown. They draw like hair, so they show on a dark page. */
const inAntenna = (s: number, au: number) => inEllipse(s - 0.03, au - 0.07, 0.065, 0.035);

/** The body part at (s, u), or "." for open water. A mermaid is the same on both sides. */
const mermaidBody = (s: number, u: number, phase: number) => {
  const au = Math.abs(u);

  if (au > 0.4) {
    return ".";
  }

  if (inAntenna(s, au)) {
    return "K";
  }

  if (Math.hypot(s - HEAD_S, au) <= HEAD_R) {
    return headPart(s - HEAD_S, au);
  }

  if (inFlipper(s, au, phase, FLIPPER)) {
    return "w";
  }

  const inBody = inEllipse(s - BODY_S, au, BODY_HALF_S, BODY_HALF_U);

  if (s < TAIL.start) {
    return inBody ? "W" : ".";
  }

  return lowerBody(s, au, inBody, TAIL);
};

/** They turn faster than Siren, so they keep up when she turns. */
const MAX_TURN = 2.4;

export interface Mermaid extends Swimmer {
  /** 1 swims at Siren's right, -1 at her left. */
  side: 1 | -1;
  /** A random offset for the small drift about the spot next to her. */
  drift: number;
}

export const createMermaid = (side: 1 | -1): Mermaid => ({
  ...createSwimmer(mermaidBody, 0),
  side,
  drift: rand(0, 100),
});

/** The spot where a mermaid wants to be: next to Siren, a little behind her. */
const slotOf = (mermaid: Mermaid, siren: Swimmer, time: number) => {
  const fx = Math.cos(siren.heading);
  const fy = Math.sin(siren.heading);
  const back = siren.length * (0.42 + 0.06 * Math.sin(time * 0.7 + mermaid.drift));
  const out = siren.length * mermaid.side * (0.36 + 0.05 * Math.sin(time * 0.9 + mermaid.drift));

  return { x: siren.x - fx * back - fy * out, y: siren.y - fy * back + fx * out };
};

/** Sizes the mermaids to Siren. On the first call they also start at their spots. */
export const fitMermaids = (
  mermaids: readonly Mermaid[],
  siren: Swimmer,
  box: { width: number; height: number; time: number },
  place: boolean,
) => {
  const { width, height, time } = box;

  for (const mermaid of mermaids) {
    setLength(mermaid, siren.length / 3);

    if (place) {
      const slot = slotOf(mermaid, siren, time);

      mermaid.x = slot.x;
      mermaid.y = slot.y;
      mermaid.heading = siren.heading;
    }

    keepInside(mermaid, width, height);
  }
};

/** Swims to the spot next to Siren, faster when far from it. Close to it, swims her way. */
export const stepMermaid = (
  mermaid: Mermaid,
  siren: Swimmer,
  dt: number,
  box: { width: number; height: number; time: number },
) => {
  const { width, height, time } = box;
  const slot = slotOf(mermaid, siren, time);
  const d = Math.hypot(slot.x - mermaid.x, slot.y - mermaid.y);
  const close = d < siren.length * 0.08;
  const reach = siren.length * 0.3;

  swimToward(
    mermaid,
    {
      x: close ? mermaid.x + Math.cos(siren.heading) * reach : slot.x,
      y: close ? mermaid.y + Math.sin(siren.heading) * reach : slot.y,
      speed: clamp(siren.speed * (0.6 + d / reach), 10, 90),
      maxTurn: MAX_TURN,
    },
    dt,
  );
  keepInside(mermaid, width, height);
};
