import { cn } from "@my-website/ui/lib/utils";
import type { ReactNode } from "react";

interface GridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Draws every grid line. Two columns below md, eight from md. Padding frames the top and bottom.
 * The page draws the left and right edges, so they run the full page height.
 */
export const Grid = ({ children, className }: GridProps) => (
  <div className={cn("grid grid-cols-2 gap-px bg-border pt-px pb-px md:grid-cols-8", className)}>
    {children}
  </div>
);
