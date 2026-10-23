/** Placeholder until each company has its own photo. */
const PLACEHOLDER_IMAGE = "/statics/placeholder/banner.svg";

/** Work experience, from the resume in `my-cv-resume/src/experience`. */
export interface Experience {
  company: string;
  period: string;
  role: string;
  type: string;
  /** Shown when the row expands. */
  image: string;
}

export const experiences: Experience[] = [
  {
    company: "Agoda",
    period: "Jun 2026 – Now",
    role: "Software Engineer Intern",
    type: "Internship, Thailand",
    image: PLACEHOLDER_IMAGE,
  },
  {
    company: "KMUTT Computer Engineering",
    period: "Jan 2026 – Now",
    role: "Fullstack Web Developer",
    type: "Part-time, Remote",
    image: PLACEHOLDER_IMAGE,
  },
  {
    company: "Wirabyte",
    period: "Jul 2024 – Jun 2026",
    role: "Frontend Developer",
    type: "Part-time",
    image: PLACEHOLDER_IMAGE,
  },
];

/** Education, from the resume in `my-cv-resume/src/resume.tex`. */
export interface Education {
  school: string;
  period: string;
  degree: string;
  note: string;
  /** Shown when the row expands. */
  image: string;
}

export const educations: Education[] = [
  {
    school: "KMUTT",
    period: "Exp. May 2028",
    degree: "Bachelor of Computer Engineering",
    note: "Petchra Pra Jom Klao Scholarship",
    image: PLACEHOLDER_IMAGE,
  },
];
