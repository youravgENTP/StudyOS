---
id: neon-data-api
type: service
title: Neon Data API
summary: Exposes PostgREST-compatible queries governed by PostgreSQL RLS.
---

# Neon Data API

The shared Neon client injects the active Auth JWT into requests automatically. Every future user-owned table must enable RLS and use `auth.user_id()` ownership policies before feature queries are added.

After applying a migration that adds or changes exposed tables/functions, run `neonctl data-api refresh-schema --branch production`. A PostgreSQL schema-cache notification alone does not reliably refresh Neon's managed Data API.
