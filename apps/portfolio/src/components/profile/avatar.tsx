import { Avatar, AvatarFallback, AvatarImage } from "@my-website/ui/components/avatar";
import { cn } from "@my-website/ui/lib/utils";
import type { CSSProperties } from "react";

interface ProfileAvatarProps {
  src: string;
  alt: string;
  fallback: string;
  /** Any CSS length, such as `"8rem"` or `"max(6rem,17.5cqw)"`. Exposed as `--avatar-size`. */
  size?: string;
  className?: string;
}

type AvatarStyle = CSSProperties & { "--avatar-size": string };

export const ProfileAvatar = ({
  src,
  alt,
  fallback,
  size = "6rem",
  className,
}: ProfileAvatarProps) => {
  const style: AvatarStyle = { "--avatar-size": size };

  return (
    <Avatar
      style={style}
      className={cn(
        "size-(--avatar-size) rounded-2xl bg-background ring-4 ring-background after:rounded-2xl",
        className,
      )}
    >
      <AvatarImage src={src} alt={alt} width={400} height={400} className="rounded-2xl" />
      <AvatarFallback className="rounded-2xl text-2xl md:text-4xl">{fallback}</AvatarFallback>
    </Avatar>
  );
};
