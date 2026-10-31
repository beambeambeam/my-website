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
  items: ExperienceItem[];
}

const ExperienceList = ({ heading, items }: ExperienceListProps) => (
  <>
    <h2 className="p-4 font-serif text-base text-muted-foreground">{heading}</h2>
    <ul className="divide-y border-y last:border-b-0">
      {items.map((item) => (
        <li key={item.title} className="p-4">
          <div className="flex items-baseline justify-between gap-4">
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
    <ExperienceList heading="Experience" items={experienceItems} />
    <ExperienceList heading="Education" items={educationItems} />
  </div>
);
