import { Toaster } from "@my-website/ui/components/sonner";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { ThemeProvider } from "@/components/theme-provider";

import "@/index.css";

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
    <TanStackRouterDevtools position="bottom-left" />
  </>
);

export const Route = createRootRoute({
  component: RootComponent,
});
