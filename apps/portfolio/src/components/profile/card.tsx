import { Card, CardContent, CardDescription, CardTitle } from "@my-website/ui/components/card";
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
  <Card className={cn("w-64 gap-0", className)}>
    <CardContent>
      <ProfileAvatar
        src={avatarSrc}
        alt={name}
        fallback={name.charAt(0)}
        size="4.5rem"
        className="ring-card"
      />
      <CardTitle className="mt-2 text-lg font-semibold tracking-tight">
        <PixelatedTextReveal text={name} />
      </CardTitle>
      <CardDescription className="text-sm">
        <PixelatedTextReveal text={title} />
      </CardDescription>
    </CardContent>
  </Card>
);
