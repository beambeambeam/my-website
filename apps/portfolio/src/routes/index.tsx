import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

import { Footer } from "@/components/footer";
import { GradualBlur } from "@/components/gradual-blur";
import { Block } from "@/components/grid/block";
import { Grid } from "@/components/grid/grid";
import { PixelatedBlockReveal } from "@/components/pixelated/block-reveal";
import { PixelatedTextReveal } from "@/components/pixelated/text-reveal";
import { ProfileAvatar } from "@/components/profile/avatar";
import { ProfileBar } from "@/components/profile/bar";
import { ProfileCard } from "@/components/profile/card";
import { ExperienceCard } from "@/features/experience/card";
import { LibsToolsCard } from "@/features/lib-tools/card";
import { LocalTimeCard } from "@/features/local-time/card";
import { useInView } from "@/hooks/use-in-view";

const profile = {
  name: "Supawit Marayat",
  title: "Software & Design Engineer",
  avatarSrc: "/statics/placeholder/avatar.svg",
};

const HomeComponent = () => {
  const headerRef = useRef<HTMLElement>(null);
  const headerInView = useInView(headerRef);

  return (
    <main>
      <div className="mx-auto w-full max-w-10xl border-r">
        <div className="@container grid gap-x-6 pl-4 sm:pl-6 lg:grid-cols-[max-content_minmax(0,1fr)]">
          <header ref={headerRef} className="min-w-0 self-start pr-4 sm:pr-6 lg:pr-0">
            <ProfileAvatar
              src={profile.avatarSrc}
              alt={profile.name}
              fallback={profile.name.charAt(0)}
              size="round(max(4.8rem,14cqw),1px)"
              className="mt-6"
            />
            <div className="mt-4 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                <PixelatedTextReveal text={profile.name} />
              </h1>
              <p className="text-muted-foreground sm:text-lg">
                <PixelatedTextReveal text={profile.title} />
              </p>
            </div>
          </header>
          <div className="mt-8 min-w-0 border-l lg:mt-0">
            <Grid className="lg:mt-8">
              {/* A gutter keeps the grid lines visible beside the dark night sky. */}
              <Block cols={2} className="p-px">
                <PixelatedBlockReveal>
                  <LocalTimeCard />
                </PixelatedBlockReveal>
              </Block>
              {/* Empty space beside the content. Hidden below md. */}
              <Block cols={2} className="max-md:hidden" />
              <Block cols={4} rows={3} className="max-md:hidden" />
              <Block cols={4}>
                <PixelatedBlockReveal>
                  <ExperienceCard />
                </PixelatedBlockReveal>
              </Block>
              <Block cols={4}>
                <PixelatedBlockReveal>
                  <LibsToolsCard />
                </PixelatedBlockReveal>
              </Block>
            </Grid>
            {/* Temporary scroll space to preview the profile card. */}
            <div aria-hidden className="h-[300vh]" />
          </div>
        </div>
      </div>
      <Footer name="Beam" />
      {!headerInView && (
        <>
          <GradualBlur
            position="top"
            height="6rem"
            tint="color-mix(in oklab, var(--background) 60%, transparent)"
            className="fixed inset-x-0 top-0 z-10 lg:hidden"
          />
          <ProfileBar {...profile} className="fixed inset-x-0 top-0 z-10 lg:hidden" />
          <div className="pointer-events-none fixed inset-x-0 top-4 z-10 hidden lg:block">
            <div className="mx-auto w-full max-w-10xl px-4 sm:px-6">
              <ProfileCard {...profile} className="pointer-events-auto" />
            </div>
          </div>
        </>
      )}
    </main>
  );
};

export const Route = createFileRoute("/")({
  component: HomeComponent,
});
