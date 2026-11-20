import { Github01Icon, Linkedin01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@my-website/ui/lib/utils";

// Each group shows its icon once, beside its first item.
const groups = [
  {
    label: "GitHub",
    icon: Github01Icon,
    items: [{ text: "beambeambeam", href: "https://github.com/beambeambeam" }],
  },
  {
    label: "LinkedIn",
    icon: Linkedin01Icon,
    items: [{ text: "supawit-marayat", href: "https://linkedin.com/in/supawit-marayat/" }],
  },
  {
    label: "Email",
    icon: Mail01Icon,
    items: [
      { text: "supawitmarayat@gmail.com", href: "mailto:supawitmarayat@gmail.com" },
      { text: "me@thisisbeam.fyi", href: "mailto:me@thisisbeam.fyi" },
    ],
  },
];

interface ProfileLinksProps {
  className?: string;
}

// Each row spans a two-column subgrid, so icons and usernames line up like table columns.
export const ProfileLinks = ({ className }: ProfileLinksProps) => (
  <ul
    className={cn(
      "grid grid-cols-[auto_1fr] gap-y-1 font-sans text-sm text-muted-foreground",
      className,
    )}
  >
    {groups.flatMap(({ label, icon, items }) =>
      items.map(({ text, href }, index) => (
        <li key={href} className="col-span-2 grid grid-cols-subgrid">
          <a
            href={href}
            aria-label={`${label}: ${text}`}
            {...(href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}
            className="col-span-2 grid grid-cols-subgrid items-center gap-x-2 transition-colors hover:text-foreground"
          >
            {index === 0 ? (
              <HugeiconsIcon icon={icon} className="size-4" aria-hidden />
            ) : (
              <span aria-hidden />
            )}
            <span className="hover:underline">{text}</span>
          </a>
        </li>
      )),
    )}
  </ul>
);
