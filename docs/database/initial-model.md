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
| `events` | Implemented: timed or all-day calendar events | `is_major` drives D-Day presentation; optional Study subject |
| `habit_definitions` / `habit_completions` | Implemented: weekday recurrence and daily evidence | One completion per habit/date |
| `routine_templates` / `routine_template_items` | Implemented: weekday operating protocols | Source for daily snapshots |
| `routine_instances` / `routine_instance_items` | Implemented: historically stable daily routine | Items are copied, not live references |
| `caffeine_intakes` | Implemented: timestamped dose and drinking-duration records | Remaining caffeine is derived, never stored |
| `user_settings` | Cross-feature preferences | One row per user |

`study_sessions`, Tasks/Subjects, Routine, Habits, Calendar Events, and Caffeine are implemented. Migration 0001 creates study sessions, migration 0002 binds policies to the sole account stored in a non-API `private` schema, migration 0003 creates tasks and subjects, migration 0004 creates weekday routine templates plus durable daily snapshots, migration 0005 creates habit definitions and daily completions, migration 0006 adds task D-Day presentation, migration 0007 creates events, and migration 0008 creates caffeine intakes. Settings storage and all other table-specific policies wait for their implementation slices.
