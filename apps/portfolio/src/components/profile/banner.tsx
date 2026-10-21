import { AspectRatio } from "@my-website/ui/components/aspect-ratio";
import { cn } from "@my-website/ui/lib/utils";

interface ProfileBannerProps {
  src: string;
  alt: string;
  className?: string;
}

export const ProfileBanner = ({ src, alt, className }: ProfileBannerProps) => (
  <AspectRatio ratio={4 / 1} className={cn("overflow-hidden bg-muted", className)}>
    <img
      src={src}
      alt={alt}
      width={1500}
      height={500}
      fetchPriority="high"
      decoding="async"
      className="size-full object-cover"
    />
  </AspectRatio>
);
