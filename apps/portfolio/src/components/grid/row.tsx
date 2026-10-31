import { cn } from "@my-website/ui/lib/utils";
import type { ReactNode } from "react";

interface RowProps {
  children: ReactNode;
  /**
   * Stacks the blocks below md, and each block then fills the row. Use it for rows of more than one
   * block.
   */
  stack?: boolean;
}

/**
 * Sets its blocks side by side. The filler takes the space right of the blocks. Its gap closes the
 * last block. overflow-hidden clips that gap when a block fills the row, so the page border is the
 * only line there.
 */
export const Row = ({ children, stack = false }: RowProps) => (
  <div
    className={cn(
      "flex gap-px overflow-hidden bg-border",
      stack ? "flex-col max-md:*:w-full md:flex-row" : "flex-row",
    )}
  >
    {children}
    <div aria-hidden className={cn("min-w-0 flex-1 bg-background", stack && "hidden md:block")} />
  </div>
);
