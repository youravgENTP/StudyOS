---
id: neon-data-api
type: service
title: Neon Data API
summary: Exposes PostgREST-compatible queries governed by PostgreSQL RLS.
---

# Neon Data API

The shared Neon client injects the active Auth JWT into requests automatically. Every future user-owned table must enable owner-only RLS before feature queries are added. Application roles should not receive broad access to Neon's protected `auth` schema; when direct JWT helpers are unavailable to that role, identity resolution belongs behind a narrow private security-definer function such as Routine's `private.current_user_id()`.

After applying a migration that adds or changes exposed tables/functions, run `neonctl data-api refresh-schema --branch production`. A PostgreSQL schema-cache notification alone does not reliably refresh Neon's managed Data API.
