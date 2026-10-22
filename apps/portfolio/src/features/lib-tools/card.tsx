import { cn } from "@my-website/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { toolCategories } from "@/features/lib-tools/data";
import type { Tool } from "@/features/lib-tools/data";
import { PixelLabel } from "@/features/lib-tools/pixel-label";
import { PixelLogo } from "@/features/lib-tools/pixel-logo";

interface HoveredTool {
  category: string;
  tool: Tool;
}

interface LibsToolsCardProps {
  className?: string;
}

const toolNames = [
  "these tools",
  ...toolCategories.flatMap((category) => category.tools.map((tool) => tool.name)),
];

export const LibsToolsCard = ({ className }: LibsToolsCardProps) => {
  const [hovered, setHovered] = useState<HoveredTool | null>(null);

  return (
    <div className={className}>
      <h2 className="sr-only">Libs &amp; Tools</h2>
      <div className="grid md:grid-cols-[max-content_minmax(0,1fr)]">
        <div className="flex w-fit flex-col p-4">
          <p className="text-xs text-muted-foreground uppercase">I work a lot with</p>
          <div
            aria-hidden="true"
            className="grid h-8 overflow-hidden font-mono text-lg font-bold whitespace-nowrap uppercase"
          >
            {toolNames.map((name) => (
              <span key={name} className="invisible col-start-1 row-start-1">
                {name.replaceAll(" ", "-")}
              </span>
            ))}
            <div className="col-start-1 row-start-1">
              <AnimatePresence mode="wait">
                <PixelLabel
                  key={hovered?.tool.name ?? "default"}
                  text={(hovered?.tool.name ?? "these tools").replaceAll(" ", "-")}
                  color={hovered?.tool.color}
                />
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="flex flex-col border-t md:border-t-0 md:border-l">
          {toolCategories.map((category) => (
            <div
              key={category.label}
              className="flex flex-col gap-1.5 border-b p-4 last:border-b-0"
            >
              <h3
                className={cn(
                  "text-xs transition-colors duration-200",
                  hovered !== null &&
                    hovered.category !== category.label &&
                    "text-muted-foreground",
                )}
              >
                {category.label}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {category.tools.map((tool) => (
                  <motion.li
                    key={tool.name}
                    className="size-10"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.15 }}
                    onHoverStart={() => {
                      setHovered({ category: category.label, tool });
                    }}
                    onHoverEnd={() => {
                      setHovered(null);
                    }}
                  >
                    <span className="sr-only">{tool.name}</span>
                    <PixelLogo tool={tool} active={hovered?.tool.name === tool.name} />
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
