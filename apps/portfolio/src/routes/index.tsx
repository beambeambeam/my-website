import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

import { DiaTextReveal } from "@/components/dia-text-reveal";
import { GradualBlur } from "@/components/gradual-blur";
import { ProfileAvatar } from "@/components/profile/avatar";
import { ProfileBanner } from "@/components/profile/banner";
import { ProfileBar } from "@/components/profile/bar";
import { ProfileCard } from "@/components/profile/card";
import { LibsToolsCard } from "@/features/lib-tools/card";
import { useInView } from "@/hooks/use-in-view";

const profile = {
  name: "Supawit Marayat",
  title: "Software & Design Engineer",
  avatarSrc: "/statics/placeholder/avatar.svg",
  bannerSrc: "/statics/placeholder/banner.svg",
};

const HomeComponent = () => {
  const headerRef = useRef<HTMLElement>(null);
  const headerInView = useInView(headerRef);

  return (
    <main>
      <ProfileBanner src={profile.bannerSrc} alt="Profile banner" />
      <div className="mx-auto w-full max-w-10xl border-r">
        <div className="@container grid gap-x-6 pl-4 sm:pl-6 lg:grid-cols-[max-content_minmax(0,1fr)]">
          <header ref={headerRef} className="min-w-0 self-start pr-4 sm:pr-6 lg:pr-0">
            <ProfileAvatar
              src={profile.avatarSrc}
              alt={profile.name}
              fallback={profile.name.charAt(0)}
              size="max(4.8rem,14cqw)"
              className="-mt-[calc(var(--avatar-size)/3)]"
            />
            <div className="mt-4 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                <DiaTextReveal text={profile.name} />
              </h1>
              <p className="text-muted-foreground sm:text-lg">
                <DiaTextReveal text={profile.title} />
              </p>
            </div>
          </header>
          <div className="mt-8 min-w-0 lg:mt-0 lg:border-l">
            <section className="border-y lg:mt-8">
              <LibsToolsCard className="w-fit max-w-full border-r" />
            </section>
            {/* Temporary scroll space to preview the profile card. */}
            <div aria-hidden className="h-[300vh]" />
          </div>
        </div>
      </div>
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
