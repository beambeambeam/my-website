import { cn } from "@my-website/ui/lib/utils";
import type { ReactNode } from "react";

/** Widths apply from md up. Below md, a block fills the row width. */
const sizes = {
  wide: "md:w-130",
};

interface BlockProps {
  children: ReactNode;
  size?: keyof typeof sizes;
}

export const Block = ({ children, size }: BlockProps) => (
  <div className={cn("max-w-full bg-background md:shrink-0", size && sizes[size])}>{children}</div>
);
