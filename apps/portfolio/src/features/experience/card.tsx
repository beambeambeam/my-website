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
    <h2 className="flex h-12 items-center border-b px-4 font-serif text-base">{heading}</h2>
    <ul className="[&:last-child>li:last-child]:border-b-0">
      {items.map((item) => (
        <li key={item.title} className="flex flex-col gap-1 border-b px-4 py-3 text-base">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-medium">{item.title}</h3>
            <p className="whitespace-nowrap text-muted-foreground">{item.period}</p>
          </div>
          <p className="text-muted-foreground">{item.description}</p>
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
