# StudyOS

A PWA-first personal productivity system for studying, daily planning, routines, habits, caffeine tracking, and review.

Production: <https://study-os-eosin.vercel.app>

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

The repository is linked to the existing Neon `production` branch. `neon link` manages local values in `.env.local`; see `.env.example` for placeholder names. Vite exposes only the Neon Auth and Data API endpoints. PostgreSQL connection strings remain local/server-only and must never receive a `VITE_` prefix.

The shared Neon runtime client supports email/password and Google authentication, session retrieval, sign-out, and authenticated Data API queries. Feature tables and a polished login flow are intentionally deferred.

The first persistence migration is applied to the linked Neon branch with:

```bash
psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f migrations/0001_study_sessions.sql
```

It creates only `study_sessions` and explicit owner-only RLS policies. The current timer loads today's total and persists Pause/manual-add records through the Data API.

See [docs/README.md](docs/README.md) for the architecture documentation contract and [docs/database/initial-model.md](docs/database/initial-model.md) for the schema proposal.
