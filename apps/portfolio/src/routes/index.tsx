import { createFileRoute } from "@tanstack/react-router";

import { ProfileAvatar } from "@/components/profile/avatar";
import { ProfileBanner } from "@/components/profile/banner";

const HomeComponent = () => (
  <main>
    <header>
      <ProfileBanner src="/statics/placeholder/banner.svg" alt="Profile banner" />
      <div className="@container mx-auto w-full max-w-10xl px-4 sm:px-6">
        <ProfileAvatar
          src="/statics/placeholder/avatar.svg"
          alt="Beam"
          fallback="B"
          size="max(4.8rem,14cqw)"
          className="-mt-[calc(var(--avatar-size)/3)]"
        />
      </div>
    </header>
  </main>
);

export const Route = createFileRoute("/")({
  component: HomeComponent,
});
