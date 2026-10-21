import { createFileRoute } from "@tanstack/react-router";

const HomeComponent = () => (
  <div className="p-8">
    <p>Hey I&apos;m Beam!</p>
    <p>Software & Design Engineer</p>
  </div>
);

export const Route = createFileRoute("/")({
  component: HomeComponent,
});
