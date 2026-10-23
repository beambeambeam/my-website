import { LensClock } from "@my-website/ui/components/lens-clock";

/** Bangkok is UTC+7 all year, with no daylight saving time. */
const TIME_ZONE = "Asia/Bangkok";

interface LocalTimeCardProps {
  className?: string;
}

export const LocalTimeCard = ({ className }: LocalTimeCardProps) => (
  <div className={className}>
    <h2 className="sr-only">Local time</h2>
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-xs text-muted-foreground uppercase">My local time</p>
        <p className="font-mono text-lg font-bold uppercase">GMT+7</p>
      </div>
      <LensClock timeZone={TIME_ZONE} className="w-48" />
    </div>
  </div>
);
