import { cn } from "@my-website/ui/lib/utils";
import type { ReactNode } from "react";

interface GridProps {
  children: ReactNode;
  className?: string;
}

/** Draws every grid line. Padding frames the top, left, and bottom. Row gaps separate rows. */
export const Grid = ({ children, className }: GridProps) => (
  <div className={cn("flex flex-col gap-px bg-border pt-px pb-px pl-px", className)}>
    {children}
  </div>
);
