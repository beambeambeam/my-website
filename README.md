# my-website

Personal portfolio site for Beam, live at [thisisbeam.fyi](https://thisisbeam.fyi).

## Stack

- **React 19** and **TanStack Router** (client-only SPA, file-based routes)
- **Tailwind CSS 4** with **shadcn/ui** (`base-mira` style) and **Hugeicons**
- **Geist** and **Geist Mono** fonts from Fontsource
- **Vite+** for dev, build, lint, format, and tests, with **Ultracite** (oxlint and oxfmt) rules
- **Varlock** for typed environment variables
- **Cloudflare Workers** (static assets) for hosting

## Getting started

Install [Bun](https://bun.sh) and Node 24. Then run:

```bash
bun install
bun run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Project structure

```
apps/
  portfolio/   # The website (React + TanStack Router)
packages/
  ui/          # Shared shadcn/ui components, theme, and global styles
```

## Scripts

| Script                 | What it does                                           |
| ---------------------- | ------------------------------------------------------ |
| `bun run dev`          | Start the dev server                                   |
| `bun run build`        | Build the app                                          |
| `bun run check`        | Run format and lint checks, type checks, and a build   |
| `bun run test`         | Run the tests once                                     |
| `bun run test:watch`   | Run the tests in watch mode                            |
| `bun run format`       | Format the code                                        |
| `bun run lint`         | Lint the code                                          |
| `bun run env:generate` | Regenerate `src/env.ts` after you change `.env.schema` |

## UI package

- Change the theme and global styles in `packages/ui/src/styles/globals.css`.
- Add a component from `packages/ui`:

  ```bash
  bunx shadcn add dialog
  ```

- Import a component in the app:

  ```tsx
  import { Toaster } from "@my-website/ui/components/sonner";
  ```

## Environment

The app owns its schema in `apps/portfolio/.env.schema`. Varlock generates `src/env.ts` on install. Commit schemas. Keep secrets in ignored env files or in the deployment platform. See the [Varlock docs](https://varlock.dev).

## SEO

The site is a client-only SPA, so the metadata is static HTML. Edit the title, description, Open Graph tags, and JSON-LD in `apps/portfolio/index.html`. Icons and the web manifest are in `apps/portfolio/public/statics/seo/`. If the domain changes, update `index.html`, `robots.txt`, and `sitemap.xml` together.

## CI and deploy

GitHub Actions runs on every pull request and on every push to `main`.

1. Format, lint, test, and type check with build run in parallel.
2. On `main`, when all four pass, the deploy job publishes the built `dist` folder with Wrangler.

The deploy job needs two repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. It uses the `production` environment. To deploy from your machine, run `wrangler login`, then `bun run deploy` in `apps/portfolio`.

## Git hooks

`bun install` runs `vp config`, which installs the hooks from `.vite-hooks/`. Pre-commit runs `vp staged`. Pre-push runs `vp check --no-fmt --no-lint`.

## Commits

Use `type: description` with no scope, body, or footer. Mark a breaking change as `type!: description`. Name branches `<type>/<short-kebab-name>`.
