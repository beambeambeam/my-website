import { cn } from "@my-website/ui/lib/utils";
import type { ReactNode } from "react";

interface GridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Draws every grid line. Two columns below md, four from md. Padding frames the top, left, and
 * bottom. The page border closes the right edge.
 */
export const Grid = ({ children, className }: GridProps) => (
  <div
    className={cn("grid grid-cols-2 gap-px bg-border pt-px pb-px pl-px md:grid-cols-4", className)}
  >
    {children}
  </div>
);
