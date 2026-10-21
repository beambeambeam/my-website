import {
  siAngular,
  siCloudflare,
  siDocker,
  siDotnet,
  siDrizzle,
  siExpo,
  siFigma,
  siGit,
  siHono,
  siKotlin,
  siNestjs,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siPython,
  siReact,
  siRedux,
  siShadcnui,
  siStorybook,
  siSwift,
  siTailwindcss,
  siTanstack,
  siTypescript,
  siVitest,
  siZod,
} from "simple-icons";
import type { SimpleIcon } from "simple-icons";

export interface Tool {
  name: string;
  /** Any CSS color. Shown on hover. */
  color: string;
  /** SVG path from Simple Icons. */
  icon?: SimpleIcon;
  /** Local SVG used as an alpha mask. */
  svgSrc?: string;
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
      { name: "C#", color: "#68217A", svgSrc: "/statics/tools/csharp.svg" },
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
      { name: "TanStack", color: "#ECE8D1", icon: siTanstack },
      { name: "shadcn/ui", color: "var(--foreground)", icon: siShadcnui },
      { name: "Zod", color: "#408AFF", icon: siZod },
    ],
  },
  {
    label: "Mobile",
    tools: [
      { name: "Kotlin", color: "#7F52FF", icon: siKotlin },
      { name: "Swift", color: "#F05138", icon: siSwift },
      { name: "React Native", color: "#61DAFB", icon: siReact },
      { name: "Expo", color: "var(--foreground)", icon: siExpo },
    ],
  },
  {
    label: "Backend",
    tools: [
      { name: "NestJS", color: "#E0234E", icon: siNestjs },
      { name: "PostgreSQL", color: "#4169E1", icon: siPostgresql },
      { name: "Hono", color: "#FF5B00", icon: siHono },
      { name: "Node.js", color: "#5FA04E", icon: siNodedotjs },
      { name: ".NET", color: "#512BD4", icon: siDotnet },
      { name: "Drizzle", color: "#C5F74F", icon: siDrizzle },
    ],
  },
  {
    label: "Tools",
    tools: [
      { name: "Docker", color: "#2496ED", icon: siDocker },
      { name: "Figma", color: "#F24E1E", icon: siFigma },
      { name: "Git", color: "#F05032", icon: siGit },
      { name: "Cloudflare", color: "#F38020", icon: siCloudflare },
      { name: "Vitest", color: "#00FF74", icon: siVitest },
      { name: "Playwright", color: "#2EAD33", svgSrc: "/statics/tools/playwright.svg" },
    ],
  },
];
