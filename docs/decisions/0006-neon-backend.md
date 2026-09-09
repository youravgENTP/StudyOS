# ADR 0006: Neon backend

**Status:** Accepted

Supabase was the original backend choice, but its active free-project limit prevented creating a dedicated StudyOS project. StudyOS therefore moves to the already-provisioned Neon project while retaining React, Vite, TypeScript, and the PWA approach.

Neon provides Postgres, Managed Better Auth, and the authenticated Data API. Authorization remains enforced in PostgreSQL with RLS and `auth.user_id()`. Browser code receives only Auth and Data API endpoints; it never receives PostgreSQL credentials.

Neon supports database branching, but early StudyOS development intentionally uses only its existing `production` branch, matching the repository's current single-branch workflow. No application tables are created by this decision.
