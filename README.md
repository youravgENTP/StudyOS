# StudyOS

A PWA-first personal productivity system for studying, daily planning, routines, habits, caffeine tracking, and review.

## Run

```bash
npm install
npm run dev
```

The StudyOS app defaults to `http://localhost:5173`.

Run the developer-only architecture viewer separately:

```bash
npm --prefix architecture-viewer install
npm run dev:architecture
```

It uses the next available Vite port (normally `http://localhost:5174` when StudyOS is running).

## Build

```bash
npm run build
npm run build:architecture
```

Supabase is optional during foundation development. Copy `.env.example` to `.env.local` and provide the public project URL and anon key when connecting a project. Never place service-role secrets in client environment variables.

See [docs/README.md](docs/README.md) for the architecture documentation contract and [docs/database/initial-model.md](docs/database/initial-model.md) for the schema proposal.
