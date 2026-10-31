import { PixelLoader } from "@my-website/ui/components/pixel-loader";
import type { PixelPattern } from "@my-website/ui/components/pixel-loader";

import { educations, experiences } from "@/features/experience/data";

interface ExperienceItem {
  title: string;
  period: string;
  description: string;
}

const experienceItems: ExperienceItem[] = experiences.map((experience) => ({
  title: experience.company,
  period: experience.period,
  description: experience.role,
}));

const educationItems: ExperienceItem[] = educations.map((education) => ({
  title: education.school,
  period: education.period,
  description: education.degree,
}));

interface ExperienceListProps {
  heading: string;
  pattern: PixelPattern;
  items: ExperienceItem[];
}

// Headings and rows are both 48px tall, border included, so the loader and the row gutter share one
// square size. Grid lines run only under the text, so the gutter stays one unbroken strip. The
// gutter matches the unlit loader cells: the text color at 20% opacity.
const ExperienceList = ({ heading, pattern, items }: ExperienceListProps) => (
  <>
    <div className="flex">
      <PixelLoader aria-hidden pattern={pattern} className="size-12" />
      <h2 className="flex h-12 flex-1 items-center border-b px-4 font-serif text-base">
        {heading}
      </h2>
    </div>
    <ul className="[&:last-child>li:last-child>div]:border-b-0">
      {items.map((item) => (
        <li key={item.title} className="flex">
          <span aria-hidden className="w-12 shrink-0 bg-foreground/20" />
          <div className="flex min-h-12 flex-1 items-center justify-between gap-4 border-b px-4">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xs font-medium">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <p className="text-xs whitespace-nowrap text-muted-foreground">{item.period}</p>
          </div>
        </li>
      ))}
    </ul>
  </>
);

export const ExperienceCard = () => (
  <div>
    <ExperienceList heading="Experience" pattern="radar" items={experienceItems} />
    <ExperienceList heading="Education" pattern="radar" items={educationItems} />
  </div>
);
