import { AsciiOcean } from "@my-website/ui/ascii-ocean";
import { Link } from "@tanstack/react-router";

/** The 404 page: Siren and her mermaids swim across the whole screen. */
export const NotFound = () => (
  <main className="fixed inset-0 overflow-hidden">
    <AsciiOcean swimmerScale={0.75} className="absolute inset-0 touch-none" />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-6 font-mono text-sm">
      <Link
        to="/"
        className="pointer-events-auto underline underline-offset-4 hover:text-muted-foreground"
      >
        Go home
      </Link>
    </div>
  </main>
);
