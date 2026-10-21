import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

import { ProfileAvatar } from "@/components/profile/avatar";
import { ProfileBanner } from "@/components/profile/banner";
import { ProfileBar } from "@/components/profile/bar";
import { ProfileCard } from "@/components/profile/card";
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
      <header ref={headerRef}>
        <ProfileBanner src={profile.bannerSrc} alt="Profile banner" />
        <div className="@container mx-auto w-full max-w-10xl px-4 sm:px-6">
          <ProfileAvatar
            src={profile.avatarSrc}
            alt={profile.name}
            fallback={profile.name.charAt(0)}
            size="max(4.8rem,14cqw)"
            className="-mt-[calc(var(--avatar-size)/3)]"
          />
          <div className="mt-4 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{profile.name}</h1>
            <p className="text-muted-foreground sm:text-lg">{profile.title}</p>
          </div>
        </div>
      </header>
      {/* Temporary scroll space to preview the profile card. */}
      <div aria-hidden className="h-[300vh]" />
      {!headerInView && (
        <>
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
