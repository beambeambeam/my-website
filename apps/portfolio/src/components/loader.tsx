import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const Loader = () => (
  <div className="flex h-full items-center justify-center pt-8">
    <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
  </div>
);

export default Loader;
