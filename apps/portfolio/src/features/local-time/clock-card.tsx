import { LensClock } from "@my-website/ui/components/lens-clock";
import { cn } from "@my-website/ui/lib/utils";

import { PixelatedGradient } from "@/components/pixelated/gradient";
import { TIME_ZONE, useLocalSky, ZONE_LABEL } from "@/features/local-time/use-local-sky";

/** Points the clock palette at the current sky colors. */
const SKY_CLOCK =
  "bg-none [--lc-accent:var(--sky-accent)] [--lc-lume:var(--sky-stripe)] [--lc-tick:var(--sky-muted)] [--lc-label:var(--sky-muted)] [--lc-spoke:var(--sky-ink)] [--lc-hand:var(--sky-ink)] [--lc-hand-edge:transparent] [--lc-pivot-from:var(--sky-muted)] [--lc-pivot-to:var(--sky-ink)] [--lc-sleeve:var(--sky-ink)]";

export const LocalTimeClockCard = () => {
  const { sky, style } = useLocalSky();

  return (
    <div style={style} className="relative isolate aspect-square text-(--sky-ink)">
      <PixelatedGradient base={sky.base} glows={sky.glows} className="-z-10" />
      <h2 className="sr-only">
        Local time, {ZONE_LABEL}, {sky.name.toLowerCase()} sky
      </h2>
      <LensClock
        timeZone={TIME_ZONE}
        theme="light"
        className={cn("w-full rounded-none shadow-none", SKY_CLOCK)}
      />
      <p className="absolute bottom-0 left-0 p-2 font-mono text-xs font-bold">{ZONE_LABEL}</p>
    </div>
  );
};
