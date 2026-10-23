import type { GradientGlow } from "@/components/pixelated/gradient";

export interface Sky {
  name: string;
  /** First hour of this sky, 0–23. The sky lasts until the next sky starts. */
  from: number;
  base: string;
  glows: GradientGlow[];
  /** Main text, clock hands, and hour ticks. At least 4.5:1 on every sky color. */
  ink: string;
  /** Small text, dial numbers, and minute ticks. At least 4.5:1 on every sky color. */
  muted: string;
  /** Seconds hand. At least 3:1 on every sky color. */
  accent: string;
  /** Stripe on the hands and hour ticks, on top of `ink`. */
  stripe: string;
}

const night: Sky = {
  name: "Night",
  from: 19,
  base: "#141a3a",
  glows: [
    { color: "#252b66", x: 0.1, y: 0.2, radius: 0.6 },
    { color: "#3d3f86", x: 0.85, y: 0.15, radius: 0.4 },
    { color: "#1b2050", x: 0.6, y: 0.95, radius: 0.5 },
  ],
  ink: "#f3f0ff",
  muted: "#c9c6ea",
  accent: "#ffb86b",
  stripe: "#141a3a",
};

/** Sorted by `from`. */
const skies: Sky[] = [
  {
    name: "Dawn",
    from: 5,
    base: "#f7b8c8",
    glows: [
      { color: "#c9a7e8", x: 0.1, y: 0.15, radius: 0.6 },
      { color: "#fbe3e8", x: 0.8, y: 0.1, radius: 0.4 },
      { color: "#ffd6a0", x: 0.9, y: 0.9, radius: 0.55 },
    ],
    ink: "#2a1030",
    muted: "#5a2a5c",
    accent: "#9c1446",
    stripe: "#fde8ee",
  },
  {
    name: "Morning",
    from: 8,
    base: "#9fd8f0",
    glows: [
      { color: "#7cc4ee", x: 0.1, y: 0.2, radius: 0.6 },
      { color: "#fff3b8", x: 0.85, y: 0.15, radius: 0.45 },
      { color: "#c8ecf5", x: 0.3, y: 0.9, radius: 0.5 },
    ],
    ink: "#0b2233",
    muted: "#1f4a63",
    accent: "#a3261e",
    stripe: "#e8f7ff",
  },
  {
    name: "Noon",
    from: 12,
    base: "#6ec3f5",
    glows: [
      { color: "#e8f7ff", x: 0.5, y: 0.05, radius: 0.45 },
      { color: "#4aa8ec", x: 0.1, y: 0.9, radius: 0.6 },
      { color: "#9fdcff", x: 0.9, y: 0.6, radius: 0.5 },
    ],
    ink: "#04182a",
    muted: "#0f3550",
    accent: "#8a1a12",
    stripe: "#e8f7ff",
  },
  {
    name: "Dusk",
    from: 16,
    base: "#ff9470",
    glows: [
      { color: "#ff6a45", x: 0.1, y: 0.2, radius: 0.6 },
      { color: "#ffe08a", x: 0.85, y: 0.1, radius: 0.5 },
      { color: "#ffb257", x: 0.95, y: 0.95, radius: 0.6 },
      { color: "#ff9f8a", x: 0.3, y: 0.85, radius: 0.4 },
    ],
    ink: "#1f0d06",
    muted: "#4a1f0e",
    accent: "#7a1400",
    stripe: "#ffe9c7",
  },
  night,
];

/** Returns the sky for an hour from 0 to 23. Hours before the first sky belong to the last sky. */
export const skyAt = (hour: number): Sky => skies.findLast((sky) => sky.from <= hour) ?? night;
