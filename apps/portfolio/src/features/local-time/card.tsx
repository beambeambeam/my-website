import { LensClock } from "@my-website/ui/components/lens-clock";
import { cn } from "@my-website/ui/lib/utils";
import type { CSSProperties } from "react";

import { PixelatedGradient } from "@/components/pixelated/gradient";
import { skyAt } from "@/features/local-time/sky";
import { useZonedTime } from "@/features/local-time/use-zoned-time";

/** Bangkok is UTC+7 all year, with no daylight saving time. */
const TIME_ZONE = "Asia/Bangkok";

const ZONE_LABEL = "GMT+7";

/** Central Bangkok. */
const COORDINATES = "13.7563° N, 100.5018° E";

/** Map of central Bangkok from OpenStreetMap. See `public/statics/maps/README.md`. */
const MAP_SRC = "/statics/maps/bangkok.svg";

type SkyStyle = CSSProperties & {
  "--sky-base": string;
  "--sky-ink": string;
  "--sky-muted": string;
  "--sky-accent": string;
  "--sky-stripe": string;
};

/** Points the clock palette at the current sky colors. */
const SKY_CLOCK =
  "bg-none [--lc-accent:var(--sky-accent)] [--lc-lume:var(--sky-stripe)] [--lc-tick:var(--sky-muted)] [--lc-label:var(--sky-muted)] [--lc-spoke:var(--sky-ink)] [--lc-hand:var(--sky-ink)] [--lc-hand-edge:transparent] [--lc-pivot-from:var(--sky-muted)] [--lc-pivot-to:var(--sky-ink)] [--lc-sleeve:var(--sky-ink)]";

interface LocalTimeCardProps {
  className?: string;
}

export const LocalTimeCard = ({ className }: LocalTimeCardProps) => {
  const time = useZonedTime(TIME_ZONE);
  const sky = skyAt(Number(time.slice(0, 2)));

  const style: SkyStyle = {
    "--sky-base": sky.base,
    "--sky-ink": sky.ink,
    "--sky-muted": sky.muted,
    "--sky-accent": sky.accent,
    "--sky-stripe": sky.stripe,
  };

  return (
    <div
      style={style}
      className={cn(
        "relative isolate grid w-144 max-w-full grid-cols-2 text-(--sky-ink)",
        className,
      )}
    >
      <PixelatedGradient base={sky.base} glows={sky.glows} className="-z-10" />
      <h2 className="sr-only">
        Local time, {ZONE_LABEL}, {sky.name.toLowerCase()} sky
      </h2>
      <div className="relative aspect-square">
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
          <p className="font-mono text-sm font-bold">{COORDINATES}</p>
          <p className="font-mono text-sm font-bold">{ZONE_LABEL}</p>
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
      <LensClock
        timeZone={TIME_ZONE}
        theme="light"
        className={cn("w-full rounded-none shadow-none", SKY_CLOCK)}
      />
    </div>
  );
};
