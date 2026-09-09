---
id: study-sessions
type: database
title: Initial Data Model
summary: Proposed durable Neon Postgres records, documented before migrations are committed.
---

# Initial data model

Every user-owned table will include `user_id`, timestamps where appropriate, and PostgreSQL Row Level Security restricting rows to the owning Neon Auth identity through `auth.user_id()`.

Future policies must explicitly protect `SELECT`, `INSERT`, `UPDATE`, and `DELETE` as appropriate. Their ownership condition is conceptually `auth.user_id() = user_id`. Browser queries travel through the authenticated Neon Data API; direct PostgreSQL connection strings never reach the browser.

| Table | Purpose | Important relationships |
| --- | --- | --- |
| `study_sessions` | Implemented: completed timed or manual intervals | No subject foreign key by design; owner-only RLS |
| `subjects` | Implemented: user-managed academic subjects | Archived; referenced by Study tasks |
| `tasks` | Implemented: general work items | Nullable `subject_id`; explicit category and completion timestamp |
| `events` | Calendar events and major deadlines | `is_major` drives D-Day presentation |
| `habit_definitions` / `habit_completions` | Recurrence and daily evidence | One completion per habit/date |
| `routine_templates` / `routine_template_items` | Weekday operating protocols | Source for daily snapshots |
| `routine_instances` / `routine_instance_items` | Historically stable daily routine | Items are copied, not live references |
| `caffeine_intakes` | Timestamped intake events | Remaining caffeine is derived |
| `user_settings` | Cross-feature preferences | One row per user |

`study_sessions`, `subjects`, and `tasks` are implemented. Migration 0001 creates study sessions, migration 0002 binds policies to the sole account stored in a non-API `private` schema, and migration 0003 creates tasks and subjects with owner-only CRUD policies. Exact recurrence, routine snapshot mechanics, settings storage, and all other table-specific policies wait for their implementation slices.
