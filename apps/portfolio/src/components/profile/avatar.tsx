import { Avatar, AvatarFallback, AvatarImage } from "@my-website/ui/components/avatar";
import { cn } from "@my-website/ui/lib/utils";

interface ProfileAvatarProps {
  src: string;
  alt: string;
  fallback: string;
  className?: string;
}

/** A square image that fills its parent's width. */
export const ProfileAvatar = ({ src, alt, fallback, className }: ProfileAvatarProps) => (
  <Avatar
    className={cn(
      "aspect-square size-auto w-full rounded-none after:rounded-none after:border-0",
      className,
    )}
  >
    <AvatarImage src={src} alt={alt} width={400} height={400} className="rounded-none" />
    <AvatarFallback className="rounded-none text-2xl md:text-4xl">{fallback}</AvatarFallback>
  </Avatar>
);
