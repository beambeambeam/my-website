import { cn } from "@my-website/ui/lib/utils";

const year = new Date().getFullYear();

interface FooterProps {
  name: string;
  className?: string;
}

export const Footer = ({ name, className }: FooterProps) => (
  <footer className={cn("border-t", className)}>
    <p className="mx-auto w-full max-w-10xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
      © {name} {year}
    </p>
  </footer>
);
