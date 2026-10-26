# Commits and branches

- Write each commit subject as `type: description`. Use no scope, body, or footer.
- Write a breaking change as `type!: description`.
- Name each branch `<type>/<short-kebab-name>`.

# Verification

- Run `bun run check` before you hand work back. It runs format, lint, and type checks, and it builds the app.
- Run `bun run test` when you change behavior.

# Site

- The app is a client-only Vite SPA. All SEO tags are in `apps/portfolio/index.html`. Do not add `head()` metadata to a route.
- The site URL `https://thisisbeam.fyi` is written in `apps/portfolio/index.html`, `apps/portfolio/public/robots.txt`, and `apps/portfolio/public/sitemap.xml`. Change all three together.

# UI package

- `packages/ui/src/components/` holds shadcn components in the `base-mira` style. Add a component with `bunx shadcn add <name>` from `packages/ui`. Then run `bun run format`.
- Do not hand-edit the generated component style. `vite.config.ts` relaxes four lint rules for this folder.
- Use Hugeicons for all icons: `@hugeicons/react` and `@hugeicons/core-free-icons`.

# Deploy

- A push to `main` deploys the site through GitHub Actions. CI builds once and uploads the `dist` artifact. The deploy job publishes that artifact with Wrangler to the Worker `portfolio`.
- Do not run `bun run deploy` unless the owner asks. It publishes to `thisisbeam.fyi`.

# Agent skills

## Issue tracker

Issues live in GitHub Issues on `beambeambeam/my-website`, managed with `gh`. See `docs/agents/issue-tracker.md`.

## Domain docs

Multi-context: a root `GLOSSARY-MAP.md` points to one `GLOSSARY.md` per workspace package. See `docs/agents/domain.md`.
