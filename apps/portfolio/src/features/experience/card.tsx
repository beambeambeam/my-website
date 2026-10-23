import { HoverExpand } from "@my-website/ui/components/hover-expand";

import { experiences } from "@/features/experience/data";

interface ExperienceCardProps {
  className?: string;
}

const items = experiences.map((experience) => ({
  label: experience.company,
  sublabel: experience.period,
  image: experience.image,
  description: `${experience.role} · ${experience.type}`,
}));

export const ExperienceCard = ({ className }: ExperienceCardProps) => (
  <div className={className}>
    <div className="flex flex-col p-4">
      <h2 className="text-xs text-muted-foreground uppercase">Where I have worked</h2>
    </div>
    <HoverExpand items={items} collapsedHeight={52} expandedHeight={220} className="border-y" />
  </div>
);
