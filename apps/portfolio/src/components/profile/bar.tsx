import { cn } from "@my-website/ui/lib/utils";

interface ProfileBarProps {
  name: string;
  title: string;
  className?: string;
}

export const ProfileBar = ({ name, title, className }: ProfileBarProps) => (
  <div className={cn("border-b bg-background px-4 py-2 sm:px-6", className)}>
    <p className="text-sm font-semibold tracking-tight">{name}</p>
    <p className="text-xs text-muted-foreground">{title}</p>
  </div>
);
