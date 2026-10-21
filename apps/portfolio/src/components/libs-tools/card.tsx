import { Card } from "@my-website/ui/components/card";
import { cn } from "@my-website/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { toolCategories } from "@/components/libs-tools/data";
import type { Tool } from "@/components/libs-tools/data";
import { PixelTransition } from "@/components/pixel-transition";

interface HoveredTool {
  category: string;
  tool: Tool;
}

interface ToolLogoProps {
  tool: Tool;
  color: string;
}

const ToolLogo = ({ tool, color }: ToolLogoProps) =>
  tool.icon ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-full" style={{ color }}>
      <path d={tool.icon.path} fill="currentColor" />
    </svg>
  ) : (
    <span
      aria-hidden="true"
      className="flex size-full items-center justify-center rounded-md border border-current font-mono text-xs font-bold"
      style={{ color }}
    >
      {tool.name}
    </span>
  );

interface LibsToolsCardProps {
  className?: string;
}

export const LibsToolsCard = ({ className }: LibsToolsCardProps) => {
  const [hovered, setHovered] = useState<HoveredTool | null>(null);

  return (
    <Card className={cn("gap-0 py-0", className)}>
      <h2 className="sr-only">Libs &amp; Tools</h2>
      <div className="grid md:grid-cols-[1fr_2fr]">
        <div className="flex flex-col p-4 md:pt-5">
          <p className="text-xs text-muted-foreground uppercase">I work a lot with</p>
          <div aria-hidden="true" className="h-8 overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={hovered?.tool.name ?? "default"}
                initial={{ y: 5 }}
                animate={{ y: 0 }}
                exit={{ y: -20 }}
                transition={{ duration: 0.1 }}
                className="block font-mono text-lg font-bold uppercase"
                style={{ color: hovered?.tool.color }}
              >
                {(hovered?.tool.name ?? "these tools").replaceAll(" ", "-")}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t p-4 md:border-t-0 md:border-l">
          {toolCategories.map((category) => (
            <div key={category.label} className="flex flex-col gap-1.5">
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
                    <PixelTransition
                      active={hovered?.tool.name === tool.name}
                      pixelColor={tool.color}
                      className="size-full"
                      first={<ToolLogo tool={tool} color="var(--muted-foreground)" />}
                      second={<ToolLogo tool={tool} color={tool.color} />}
                    />
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
