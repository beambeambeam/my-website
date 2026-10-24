import { HoverExpand } from "@my-website/ui/components/hover-expand";
import type { HoverExpandItem } from "@my-website/ui/components/hover-expand";

import { PixelatedImage } from "@/components/pixelated/image";
import { educations, experiences } from "@/features/experience/data";

interface ExperienceCardProps {
  className?: string;
}

const experienceItems = experiences.map((experience) => ({
  label: experience.company,
  sublabel: experience.period,
  image: experience.image,
  description: `${experience.role} · ${experience.type}`,
}));

const educationItems = educations.map((education) => ({
  label: education.school,
  sublabel: education.period,
  image: education.image,
  description: `${education.degree} · ${education.note}`,
}));

const renderImage = (item: HoverExpandItem, active: boolean) => (
  <PixelatedImage
    src={item.image}
    alt={item.imageAlt ?? ""}
    active={active}
    className="size-full"
  />
);

export const ExperienceCard = ({ className }: ExperienceCardProps) => (
  <div className={className}>
    <h2 className="p-4 text-xs text-muted-foreground uppercase">Where I have worked</h2>
    <HoverExpand
      items={experienceItems}
      collapsedHeight={52}
      expandedHeight={220}
      renderImage={renderImage}
      className="border-y"
    />
    <h2 className="p-4 text-xs text-muted-foreground uppercase">Education</h2>
    <HoverExpand
      items={educationItems}
      collapsedHeight={52}
      expandedHeight={220}
      renderImage={renderImage}
      className="border-y"
    />
  </div>
);
