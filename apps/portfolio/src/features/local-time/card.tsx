import { LensClock } from "@my-website/ui/components/lens-clock";
import { cn } from "@my-website/ui/lib/utils";

import { PixelatedGradient } from "@/components/pixelated/gradient";
import { TIME_ZONE, useLocalSky, ZONE_LABEL } from "@/features/local-time/use-local-sky";

/** Map of central Bangkok from OpenStreetMap. See `public/statics/maps/README.md`. */
const MAP_SRC = "/statics/maps/bangkok.svg";

/** Points the clock palette at the current sky colors. */
const SKY_CLOCK =
  "bg-none [--lc-accent:var(--sky-accent)] [--lc-lume:var(--sky-stripe)] [--lc-tick:var(--sky-muted)] [--lc-label:var(--sky-muted)] [--lc-spoke:var(--sky-ink)] [--lc-hand:var(--sky-ink)] [--lc-hand-edge:transparent] [--lc-pivot-from:var(--sky-muted)] [--lc-pivot-to:var(--sky-ink)] [--lc-sleeve:var(--sky-ink)]";

/** The map and the clock side by side, on one sky for the current hour in Bangkok. */
export const LocalTimeCard = () => {
  const { sky, style } = useLocalSky();

  return (
    <div style={style} className="relative isolate grid grid-cols-2 text-(--sky-ink)">
      <PixelatedGradient base={sky.base} glows={sky.glows} className="-z-10" />
      <h2 className="sr-only">
        Local time, {ZONE_LABEL}, {sky.name.toLowerCase()} sky
      </h2>
      <div className="relative">
        {/* Lines are decoration, so they stay faint and leave the label as the focus. */}
        <div
          aria-hidden="true"
          style={{ maskImage: `url(${MAP_SRC})` }}
          className="absolute inset-0 bg-(--sky-ink) [mask-size:100%_100%] opacity-50"
        />
        <p className="absolute inset-0 grid place-items-center text-lg font-semibold [text-shadow:0_0_6px_var(--sky-base),0_0_2px_var(--sky-base)]">
          Bangkok
        </p>
        <div className="absolute top-0 left-0 p-4">
          <p className="text-xs text-(--sky-muted) uppercase">I&apos;m based in</p>
        </div>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-0 left-0 p-2 text-[0.625rem] text-(--sky-muted) hover:underline"
        >
          © OpenStreetMap
        </a>
      </div>
      <div className="relative aspect-square">
        <LensClock
          timeZone={TIME_ZONE}
          theme="light"
          className={cn("w-full rounded-none shadow-none", SKY_CLOCK)}
        />
        <p className="absolute bottom-0 left-0 p-2 font-mono text-xs font-bold">{ZONE_LABEL}</p>
      </div>
    </div>
  );
};
