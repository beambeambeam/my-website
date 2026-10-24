import { useEffect, useMemo, useState } from "react";

const format = (formatter: Intl.DateTimeFormat) => formatter.format(new Date());

/** Returns the wall-clock time in `timeZone` as `HH:MM`, updated every second. */
export const useZonedTime = (timeZone: string) => {
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone,
      }),
    [timeZone],
  );

  const [time, setTime] = useState(() => format(formatter));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(format(formatter));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [formatter]);

  return time;
};
