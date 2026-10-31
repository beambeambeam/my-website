import { PixelatedGradient } from "@/components/pixelated/gradient";
import { useLocalSky } from "@/features/local-time/use-local-sky";

/** Map of central Bangkok from OpenStreetMap. See `public/statics/maps/README.md`. */
const MAP_SRC = "/statics/maps/bangkok.svg";

export const LocalTimeMapCard = () => {
  const { sky, style } = useLocalSky();

  return (
    <div style={style} className="relative isolate aspect-square text-(--sky-ink)">
      <PixelatedGradient base={sky.base} glows={sky.glows} className="-z-10" />
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
  );
};
