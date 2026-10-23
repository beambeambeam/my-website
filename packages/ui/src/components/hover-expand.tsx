import { cn } from "@my-website/ui/lib/utils";
import { motion } from "motion/react";
import * as React from "react";

export interface HoverExpandItem {
  label: string;
  /** E.g. country, year, category */
  sublabel?: string;
  image: string;
  imageAlt?: string;
  /** Short descriptor shown when expanded */
  description?: string;
}

export interface HoverExpandProps {
  items: HoverExpandItem[];
  /**
   * Row height when collapsed, in pixels.
   *
   * @default 68
   */
  collapsedHeight?: number;
  /**
   * Row height when expanded, in pixels.
   *
   * @default 320
   */
  expandedHeight?: number;
  className?: string;
}

/** Vertical list of rows. Hover or focus a row to expand it and reveal its image. */
export function HoverExpand({
  items,
  collapsedHeight = 68,
  expandedHeight = 320,
  className,
}: HoverExpandProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  return (
    <ul className={cn("flex w-full flex-col divide-y", className)}>
      {items.map((item, i) => {
        const isActive = activeIndex === i;
        const isOtherActive = activeIndex !== null && !isActive;

        return (
          <motion.li
            key={item.label}
            tabIndex={0}
            aria-expanded={isActive}
            className="relative w-full cursor-default overflow-hidden outline-none"
            initial={false}
            animate={{
              height: isActive ? expandedHeight : collapsedHeight,
              opacity: isOtherActive ? 0.38 : 1,
            }}
            transition={{
              height: { type: "spring", stiffness: 280, damping: 32, mass: 0.9 },
              opacity: { duration: 0.22, ease: "easeOut" },
            }}
            onHoverStart={() => {
              setActiveIndex(i);
            }}
            onHoverEnd={() => {
              setActiveIndex(null);
            }}
            onFocus={() => {
              setActiveIndex(i);
            }}
            onBlur={() => {
              setActiveIndex(null);
            }}
          >
            <motion.div
              className="absolute inset-0 size-full"
              initial={false}
              animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 1.06 }}
              transition={{
                opacity: { duration: 0.45, ease: [0.23, 1, 0.32, 1] },
                scale: { duration: 0.55, ease: [0.23, 1, 0.32, 1] },
              }}
            >
              <img
                src={item.image}
                alt={item.imageAlt ?? ""}
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-black/10" />
            </motion.div>

            <div className="absolute inset-0 flex items-end px-4 pb-4">
              <div className="relative flex w-full items-end justify-between gap-4">
                <div className="flex min-w-0">
                  {item.description !== undefined && (
                    <motion.span
                      className="absolute bottom-full left-0 mb-0.5 max-w-full truncate text-xs text-white/70"
                      initial={false}
                      animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : -8 }}
                      transition={{
                        duration: 0.3,
                        delay: isActive ? 0.12 : 0,
                        ease: [0.23, 1, 0.32, 1],
                      }}
                    >
                      {item.description}
                    </motion.span>
                  )}
                  <motion.span
                    className="truncate font-semibold tracking-tight"
                    initial={false}
                    animate={{ color: isActive ? "#ffffff" : "currentColor" }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                </div>

                {item.sublabel !== undefined && (
                  <motion.span
                    className="shrink-0 text-xs tracking-widest uppercase"
                    initial={false}
                    animate={{
                      color: isActive ? "rgba(255,255,255,0.55)" : "currentColor",
                      opacity: isActive ? 1 : 0.45,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.sublabel}
                  </motion.span>
                )}
              </div>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
