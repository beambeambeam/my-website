import {
  siAngular,
  siDocker,
  siFigma,
  siGit,
  siHono,
  siNestjs,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siPython,
  siReact,
  siRedux,
  siStorybook,
  siTailwindcss,
  siTypescript,
} from "simple-icons";
import type { SimpleIcon } from "simple-icons";

export interface Tool {
  name: string;
  /** Any CSS color. Shown on hover. */
  color: string;
  /** Without an icon, the name is shown as a text mark. */
  icon?: SimpleIcon;
}

export interface ToolCategory {
  label: string;
  tools: Tool[];
}

export const toolCategories: ToolCategory[] = [
  {
    label: "Languages",
    tools: [
      { name: "TypeScript", color: "#3178C6", icon: siTypescript },
      { name: "Python", color: "#3776AB", icon: siPython },
      { name: "SQL", color: "#336791" },
    ],
  },
  {
    label: "Frontend",
    tools: [
      { name: "React", color: "#61DAFB", icon: siReact },
      { name: "Angular", color: "#DD0031", icon: siAngular },
      { name: "Next.js", color: "var(--foreground)", icon: siNextdotjs },
      { name: "Tailwind CSS", color: "#06B6D4", icon: siTailwindcss },
      { name: "Redux", color: "#764ABC", icon: siRedux },
      { name: "Storybook", color: "#FF4785", icon: siStorybook },
    ],
  },
  {
    label: "Backend",
    tools: [
      { name: "NestJS", color: "#E0234E", icon: siNestjs },
      { name: "PostgreSQL", color: "#4169E1", icon: siPostgresql },
      { name: "Hono", color: "#FF5B00", icon: siHono },
      { name: "Node.js", color: "#5FA04E", icon: siNodedotjs },
    ],
  },
  {
    label: "Tools",
    tools: [
      { name: "Docker", color: "#2496ED", icon: siDocker },
      { name: "Figma", color: "#F24E1E", icon: siFigma },
      { name: "Git", color: "#F05032", icon: siGit },
    ],
  },
];
