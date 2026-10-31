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
import { Twist } from "@/components/textures/twist";
import { ExperienceCard } from "@/features/experience/card";
import { LibsToolsCard } from "@/features/lib-tools/card";
import { LocalTimeCard } from "@/features/local-time/card";
import { useInView } from "@/hooks/use-in-view";

const profile = {
  name: "Supawit Marayat",
  title: "Software & Design Engineer",
  avatarSrc: "/statics/placeholder/avatar.svg",
};

const AVATAR_VARS =
  "[--avatar:round(max(18rem,18cqw),1px)] [--col:calc((100cqw-var(--avatar)-8px)/8)] [--greeting-h:calc(var(--avatar)-var(--col)-3.5px)]";

const HomeComponent = () => {
  const headerRef = useRef<HTMLElement>(null);
  const headerInView = useInView(headerRef);

  return (
    <main className={AVATAR_VARS}>
      <div className="mx-auto w-full max-w-10xl border-x">
        <div className="@container grid lg:grid-cols-[max-content_minmax(0,1fr)]">
          <header
            ref={headerRef}
            className="mt-8 flex min-w-0 self-start border-t max-lg:items-end lg:sticky lg:top-0 lg:w-(--avatar) lg:flex-col"
          >
            <ProfileAvatar
              src={profile.avatarSrc}
              alt={profile.name}
              fallback={profile.name.charAt(0)}
              className="w-24 shrink-0 border-r sm:w-32 lg:w-full lg:border-r-0 lg:border-b"
            />
            <h1 className="p-3 font-serif text-2xl tracking-tight">
              <PixelatedTextReveal text={profile.name} />
            </h1>
          </header>
          <div className="mt-8 min-w-0 lg:mt-0 lg:border-l">
            <Grid className="lg:mt-8">
              {/* On lg, rows 1 and 2 end at the bottom line of the avatar. */}
              <Block cols={8} className="flex items-end p-4 sm:p-6 lg:min-h-(--greeting-h)">
                <h2 className="text-xl tracking-tight sm:text-2xl">
                  <span className="block font-serif">
                    <PixelatedTextReveal text="Hi, I'm Beam." />
                  </span>
                  <span className="block text-muted-foreground">
                    <PixelatedTextReveal text="Software & Design Engineer. I love blending pixels with reality." />
                  </span>
                </h2>
              </Block>
              {/* A gutter keeps the grid lines visible beside the dark night sky. */}
              <Block cols={2} className="p-px">
                <PixelatedBlockReveal>
                  <LocalTimeCard />
                </PixelatedBlockReveal>
              </Block>
              {/* Empty space beside the content. Hidden below md. */}
              <Block cols={2} className="py-1.5 max-md:hidden">
                <PixelatedBlockReveal>
                  <Twist />
                </PixelatedBlockReveal>
              </Block>
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
            {/* Temporary scroll space to preview the sticky header. */}
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
        </>
      )}
    </main>
  );
};

export const Route = createFileRoute("/")({
  component: HomeComponent,
});
