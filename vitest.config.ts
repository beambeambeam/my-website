import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["apps/*/src/**/*.test.{ts,tsx}", "packages/*/src/**/*.test.{ts,tsx}"],
  },
});
