import type { CSSProperties } from "react";

import { skyAt } from "@/features/local-time/sky";
import { useZonedTime } from "@/features/local-time/use-zoned-time";

/** Bangkok is UTC+7 all year, with no daylight saving time. */
export const TIME_ZONE = "Asia/Bangkok";

type SkyStyle = CSSProperties & {
  "--sky-base": string;
  "--sky-ink": string;
  "--sky-muted": string;
  "--sky-accent": string;
  "--sky-stripe": string;
};

/** Returns the sky for the current hour in Bangkok, and the CSS vars that paint it. */
export const useLocalSky = () => {
  const time = useZonedTime(TIME_ZONE);
  const sky = skyAt(Number(time.slice(0, 2)));

  const style: SkyStyle = {
    "--sky-base": sky.base,
    "--sky-ink": sky.ink,
    "--sky-muted": sky.muted,
    "--sky-accent": sky.accent,
    "--sky-stripe": sky.stripe,
  };

  return { sky, style };
};
