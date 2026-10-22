import { Card, CardContent, CardDescription, CardTitle } from "@my-website/ui/components/card";
import { cn } from "@my-website/ui/lib/utils";

import { DiaTextReveal } from "@/components/dia-text-reveal";
import { ProfileAvatar } from "@/components/profile/avatar";
import { ProfileBanner } from "@/components/profile/banner";

interface ProfileCardProps {
  name: string;
  title: string;
  avatarSrc: string;
  bannerSrc: string;
  className?: string;
}

export const ProfileCard = ({ name, title, avatarSrc, bannerSrc, className }: ProfileCardProps) => (
  <Card className={cn("w-64 gap-0 pt-0", className)}>
    <ProfileBanner src={bannerSrc} alt="" />
    <CardContent>
      <ProfileAvatar
        src={avatarSrc}
        alt={name}
        fallback={name.charAt(0)}
        size="4.5rem"
        className="-mt-[calc(var(--avatar-size)/2)] ring-card"
      />
      <CardTitle className="mt-2 text-lg font-semibold tracking-tight">
        <DiaTextReveal text={name} />
      </CardTitle>
      <CardDescription className="text-sm">
        <DiaTextReveal text={title} />
      </CardDescription>
    </CardContent>
  </Card>
);
