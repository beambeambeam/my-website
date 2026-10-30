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
  /** Brand color as any CSS color. Colors the name on hover, and the logo when it has no `colorSrc`. */
  color: string;
  /** Mono logo shape: an SVG path from Simple Icons. */
  icon?: SimpleIcon;
  /** Mono logo shape: a local SVG used as an alpha mask. */
  svgSrc?: string;
  /** Full-color logo SVG. Shown on hover. */
  colorSrc?: string;
}

export interface ToolCategory {
  label: string;
  tools: Tool[];
}

export const toolCategories: ToolCategory[] = [
  {
    label: "Languages",
    tools: [
      {
        name: "TypeScript",
        color: "#3178C6",
        icon: siTypescript,
        colorSrc: "/statics/tools/color/typescript.svg",
      },
      {
        name: "Python",
        color: "#3776AB",
        icon: siPython,
        colorSrc: "/statics/tools/color/python.svg",
      },
      {
        name: "C#",
        color: "#68217A",
        svgSrc: "/statics/tools/csharp.svg",
        colorSrc: "/statics/tools/color/csharp.svg",
      },
    ],
  },
  {
    label: "Frontend",
    tools: [
      {
        name: "React",
        color: "#61DAFB",
        icon: siReact,
        colorSrc: "/statics/tools/color/react.svg",
      },
      {
        name: "Angular",
        color: "#DD0031",
        icon: siAngular,
        colorSrc: "/statics/tools/color/angular.svg",
      },
      { name: "Next.js", color: "var(--foreground)", icon: siNextdotjs },
      {
        name: "Tailwind CSS",
        color: "#06B6D4",
        icon: siTailwindcss,
        colorSrc: "/statics/tools/color/tailwindcss.svg",
      },
      {
        name: "Redux",
        color: "#764ABC",
        icon: siRedux,
        colorSrc: "/statics/tools/color/redux.svg",
      },
      {
        name: "Storybook",
        color: "#FF4785",
        icon: siStorybook,
        colorSrc: "/statics/tools/color/storybook.svg",
      },
      { name: "TanStack", color: "#ECE8D1", icon: siTanstack },
      { name: "shadcn/ui", color: "var(--foreground)", icon: siShadcnui },
      { name: "Zod", color: "#408AFF", icon: siZod, colorSrc: "/statics/tools/color/zod.svg" },
    ],
  },
  {
    label: "Mobile",
    tools: [
      {
        name: "Kotlin",
        color: "#7F52FF",
        icon: siKotlin,
        colorSrc: "/statics/tools/color/kotlin.svg",
      },
      {
        name: "Swift",
        color: "#F05138",
        icon: siSwift,
        colorSrc: "/statics/tools/color/swift.svg",
      },
      {
        name: "React Native",
        color: "#61DAFB",
        icon: siReact,
        colorSrc: "/statics/tools/color/react.svg",
      },
      { name: "Expo", color: "var(--foreground)", icon: siExpo },
    ],
  },
  {
    label: "Backend",
    tools: [
      {
        name: "NestJS",
        color: "#E0234E",
        icon: siNestjs,
        colorSrc: "/statics/tools/color/nestjs.svg",
      },
      {
        name: "PostgreSQL",
        color: "#4169E1",
        icon: siPostgresql,
        colorSrc: "/statics/tools/color/postgresql.svg",
      },
      { name: "Hono", color: "#FF5B00", icon: siHono, colorSrc: "/statics/tools/color/hono.svg" },
      {
        name: "Node.js",
        color: "#5FA04E",
        icon: siNodedotjs,
        colorSrc: "/statics/tools/color/nodejs.svg",
      },
      {
        name: ".NET",
        color: "#512BD4",
        icon: siDotnet,
        colorSrc: "/statics/tools/color/dotnet.svg",
      },
      { name: "Drizzle", color: "#C5F74F", icon: siDrizzle },
    ],
  },
  {
    label: "Tools",
    tools: [
      {
        name: "Docker",
        color: "#2496ED",
        icon: siDocker,
        colorSrc: "/statics/tools/color/docker.svg",
      },
      {
        name: "Figma",
        color: "#F24E1E",
        icon: siFigma,
        colorSrc: "/statics/tools/color/figma.svg",
      },
      { name: "Git", color: "#F05032", icon: siGit, colorSrc: "/statics/tools/color/git.svg" },
      {
        name: "Cloudflare",
        color: "#F38020",
        icon: siCloudflare,
        colorSrc: "/statics/tools/color/cloudflare.svg",
      },
      { name: "Vitest", color: "#00FF74", icon: siVitest },
      {
        name: "Playwright",
        color: "#2EAD33",
        svgSrc: "/statics/tools/playwright.svg",
        colorSrc: "/statics/tools/color/playwright.svg",
      },
    ],
  },
];
