# ADR 0001: PWA client with Supabase backend

**Status:** Accepted

Use React, Vite, and TypeScript as a PWA. Supabase will provide PostgreSQL and authentication, with user-data RLS. This keeps one installable web codebase for Mac and iPhone and supports free-tier deployment. Offline write reconciliation is deferred.
