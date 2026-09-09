---
id: neon-backend
type: service
title: Neon Backend
summary: Provides authentication and authenticated browser access to Postgres through the Data API.
---

# Neon backend

The canonical client in `src/lib/neon` connects the PWA to Managed Better Auth and the Data API. The React adapter exposes session state through `AuthProvider`; email/password, Google OAuth, session retrieval, and sign-out helpers share the same client.

```text
React/Vite PWA
  → Neon Auth
  → authenticated JWT
  → Neon Data API
  → Postgres with RLS
```

The Neon JS client automatically attaches the current Auth JWT to Data API queries. Feature code uses the shared data boundary and must not initialize clients or access PostgreSQL connection strings.
