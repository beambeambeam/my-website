/** Work experience, from the resume in `my-cv-resume/src/experience`. */
export interface Experience {
  company: string;
  period: string;
  role: string;
}

export const experiences: Experience[] = [
  {
    company: "Agoda",
    period: "Jun 2026 – Now",
    role: "Software Engineer Intern",
  },
  {
    company: "KMUTT Computer Engineering",
    period: "Jan 2026 – Now",
    role: "Fullstack Web Developer",
  },
  {
    company: "Wirabyte",
    period: "Jul 2024 – Jun 2026",
    role: "Frontend Developer",
  },
];

/** Education, from the resume in `my-cv-resume/src/resume.tex`. */
export interface Education {
  school: string;
  period: string;
  degree: string;
}

export const educations: Education[] = [
  {
    school: "KMUTT",
    period: "Exp. May 2028",
    degree: "Bachelor of Computer Engineering",
  },
];
