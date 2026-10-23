import { LensClock } from "@my-website/ui/components/lens-clock";
import { cn } from "@my-website/ui/lib/utils";

import { PixelatedGradient } from "@/components/pixelated/gradient";
import type { GradientGlow } from "@/components/pixelated/gradient";

/** Bangkok is UTC+7 all year, with no daylight saving time. */
const TIME_ZONE = "Asia/Bangkok";

const DUSK_BASE = "#ff9470";

const DUSK_GLOWS: GradientGlow[] = [
  { color: "#ff6a45", x: 0.1, y: 0.2, radius: 0.6 },
  { color: "#ffe08a", x: 0.85, y: 0.1, radius: 0.5 },
  { color: "#ffb257", x: 0.95, y: 0.95, radius: 0.6 },
  { color: "#ff9f8a", x: 0.3, y: 0.85, radius: 0.4 },
];

/**
 * Dark ink, because white fails contrast on every dusk color. Minimum contrast over the gradient:
 * ink #1f0d06 6.6:1, muted #4a1f0e 4.9:1, second hand #7a1400 3.8:1 (graphics need 3:1).
 */
const DUSK_CLOCK =
  "bg-none [--lc-accent:#7a1400] [--lc-lume:#ffe9c7] [--lc-tick:#4a1f0e] [--lc-label:#4a1f0e] [--lc-spoke:#1f0d06] [--lc-hand:#1f0d06] [--lc-hand-edge:transparent] [--lc-pivot-from:#4a1f0e] [--lc-pivot-to:#1f0d06] [--lc-sleeve:#1f0d06]";

interface LocalTimeCardProps {
  className?: string;
}

export const LocalTimeCard = ({ className }: LocalTimeCardProps) => (
  <div className={cn("relative isolate text-[#1f0d06]", className)}>
    <PixelatedGradient base={DUSK_BASE} glows={DUSK_GLOWS} className="-z-10" />
    <h2 className="sr-only">Local time</h2>
    <div className="flex w-56 flex-col">
      <div className="p-4">
        <p className="text-xs text-[#4a1f0e] uppercase">My local time</p>
        <p className="font-mono text-lg font-bold uppercase">GMT+7</p>
      </div>
      <LensClock
        timeZone={TIME_ZONE}
        theme="light"
        className={cn("w-full rounded-none shadow-none", DUSK_CLOCK)}
      />
    </div>
  </div>
);
