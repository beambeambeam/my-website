import { useEffect, useState } from "react";
import type { RefObject } from "react";

export const useInView = (ref: RefObject<Element | null>) => {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      setInView(entries.some((entry) => entry.isIntersecting));
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return inView;
};
