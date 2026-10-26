import ultraciteOxfmt from "ultracite/oxfmt";
import ultraciteAntiSlop from "ultracite/oxlint/anti-slop";
import ultraciteOxlintCore from "ultracite/oxlint/core";
import ultraciteOxlintReact from "ultracite/oxlint/react";
import ultraciteOxlintTanstack from "ultracite/oxlint/tanstack";
import { defineConfig } from "vite-plus";

const generatedFiles = [
  "apps/portfolio/dist/**",
  "apps/portfolio/.tanstack/**",
  "apps/portfolio/src/routeTree.gen.ts",
];

// The skills CLI installs these files, so they keep the upstream format.
const vendoredSkills = [".agents/skills/**", ".claude/skills/**"];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ...ultraciteOxfmt,
    printWidth: 100,
    trailingComma: "all",
    ignorePatterns: [
      ...(ultraciteOxfmt.ignorePatterns ?? []),
      ...generatedFiles,
      ...vendoredSkills,
    ],
    sortImports: {},
    sortTailwindcss: {
      functions: ["clsx", "cva", "tw", "twMerge", "cn", "twJoin", "tv"],
      stylesheet: "packages/ui/src/styles/globals.css",
    },
    jsdoc: true,
  },
  lint: {
    extends: [
      ultraciteOxlintCore,
      ultraciteOxlintReact,
      ultraciteOxlintTanstack,
      ultraciteAntiSlop,
    ],
    rules: {
      "no-unmodified-loop-condition": "error",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    ignorePatterns: [
      ...(ultraciteOxlintCore.ignorePatterns ?? []),
      "node_modules/**",
      "**/node_modules/**",
      ...generatedFiles,
    ],
    overrides: [
      {
        // shadcn CLI regenerates these files, so they keep the upstream style.
        files: ["packages/ui/src/components/**"],
        rules: {
          "react/function-component-definition": "off",
          "func-style": "off",
          "typescript/no-unsafe-type-assertion": "off",
          "anti-slop/require-safety-comment-for-type-assertion": "off",
        },
      },
      {
        files: ["apps/*/src/**", "packages/*/src/**"],
        rules: {
          "import/no-relative-parent-imports": "error",
        },
      },
    ],
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
});
