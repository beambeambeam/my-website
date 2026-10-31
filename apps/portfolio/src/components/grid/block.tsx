import { cn } from "@my-website/ui/lib/utils";
import type { ReactNode } from "react";

/** Whole class names, so Tailwind can find them. */
const colSpans = { 1: "col-span-1", 2: "col-span-2" };
const rowSpans = { 1: "row-span-1", 2: "row-span-2", 3: "row-span-3" };

interface BlockProps {
  children?: ReactNode;
  /** Grid columns the block spans. */
  cols?: keyof typeof colSpans;
  /** Grid rows the block spans. */
  rows?: keyof typeof rowSpans;
  className?: string;
}

export const Block = ({ children, cols = 1, rows = 1, className }: BlockProps) => (
  <div className={cn("min-w-0 bg-background", colSpans[cols], rowSpans[rows], className)}>
    {children}
  </div>
);
