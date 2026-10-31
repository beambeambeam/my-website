import { cn } from "@my-website/ui/lib/utils";
import type { ReactNode } from "react";

/** Named block widths. A block never grows past the row width. */
const sizes = {
  wide: "w-130",
};

interface BlockProps {
  children: ReactNode;
  size?: keyof typeof sizes;
}

export const Block = ({ children, size }: BlockProps) => (
  <div className={cn("max-w-full shrink-0 bg-background", size && sizes[size])}>{children}</div>
);
