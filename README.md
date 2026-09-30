# PCx LMS (`pcx-lms`)

Agent-facing learning experience for PCx V2 (Agent Home, Office, and learning surfaces). Next.js 16 app, **early stage** as of this handoff: most of the shipped work is the initial setup plus the Office Page content/structure. This is the repo that will become the real Agent app.

For how this repo fits with the other two, see [ARCHITECTURE.md in the API repo](../pcx-api-v2/ARCHITECTURE.md).

## Stack

- **Next.js 16** (App Router) with **React 19**.
- **Better Auth 1.6.23** (`lib/`). Note this is older than the `1.7.2` used by `pcx-admin` and `pcx-api-v2`; KAN-159 upgraded those two but not the LMS.
- **Tailwind** + **lucide-react**.
- Package manager: **pnpm** (`pnpm-lock.yaml`), unlike the admin/api repos which use npm.
- Husky pre-commit hooks (`prepare: husky`).

> Note: this project targets Next.js 16, whose APIs and conventions differ from earlier versions. See `AGENTS.md` before changing framework-level code.

## Requirements

- Node 20+ and **pnpm**.

## Getting started

```bash
pnpm install
pnpm dev                    # http://localhost:3002
```

No `.env` is required yet (see below). See `.env.example` for the forward-looking placeholder.

## Environment variables

The LMS currently reads **no** environment variables and does not call the backend. `.env.example` contains a commented `API_URL` placeholder for when the API/auth integration lands (it should mirror `pcx-admin`).

## Scripts

| Script        | What it does                      |
| ------------- | --------------------------------- |
| `pnpm dev`    | Dev server on port **3002**.      |
| `pnpm build`  | Production build.                 |
| `pnpm start`  | Serve the build on port **3002**. |
| `pnpm lint`   | ESLint.                           |
| `pnpm format` | Prettier over the repo.           |

## Structure

- `app/` — App Router. `(home)/` group and `login/`.
- `components/` — shared UI.
- `lib/` — helpers (incl. Better Auth).
- `public/` — static assets.

## Status and next steps

- This repo is not yet wired to `pcx-api-v2`. When integrating, add `API_URL`, reuse the admin app's same-origin auth proxy pattern (`next.config.ts` rewrites), and align Better Auth to `1.7.2`.

## Related repos

See [ARCHITECTURE.md](../pcx-api-v2/ARCHITECTURE.md).
