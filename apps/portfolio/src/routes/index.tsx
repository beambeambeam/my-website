import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="p-8">
      <p>Hey I'm Beam!</p>
      <p>Software & Design Engineer</p>
    </div>
  );
}
