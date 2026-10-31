import { cn } from "@my-website/ui/lib/utils";

import { PixelatedTextReveal } from "@/components/pixelated/text-reveal";
import { ProfileAvatar } from "@/components/profile/avatar";

interface ProfileCardProps {
  name: string;
  title: string;
  avatarSrc: string;
  className?: string;
}

export const ProfileCard = ({ name, title, avatarSrc, className }: ProfileCardProps) => (
  <div className={cn("w-64", className)}>
    <ProfileAvatar src={avatarSrc} alt={name} fallback={name.charAt(0)} />
    <p className="mt-3 font-serif text-lg tracking-tight">
      <PixelatedTextReveal text={name} />
    </p>
    <p className="text-sm text-muted-foreground">
      <PixelatedTextReveal text={title} />
    </p>
  </div>
);
