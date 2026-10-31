import type { ReactNode } from "react";

interface RowProps {
  children: ReactNode;
}

/**
 * Stacks its blocks below md and sets them side by side from md. The filler takes the space right
 * of the blocks. Its gap closes the last block. overflow-hidden clips that gap when a block fills
 * the row, so the page border is the only line there.
 */
export const Row = ({ children }: RowProps) => (
  <div className="flex flex-col gap-px overflow-hidden bg-border md:flex-row">
    {children}
    <div aria-hidden className="hidden flex-1 bg-background md:block" />
  </div>
);
