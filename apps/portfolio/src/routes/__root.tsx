import { Toaster } from "@my-website/ui/components/sonner";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { ThemeProvider } from "@/components/theme-provider";

import "@/index.css";

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const { TanStackRouterDevtools: Devtools } = await import("@tanstack/react-router-devtools");

      return { default: Devtools };
    })
  : () => null;

const RootComponent = () => (
  <>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      storageKey="vite-ui-theme"
    >
      <Outlet />
      <Toaster richColors />
    </ThemeProvider>
    <Suspense>
      <TanStackRouterDevtools position="bottom-left" />
    </Suspense>
  </>
);

export const Route = createRootRoute({
  component: RootComponent,
});
