---
id: study-sessions
type: database
title: Initial Data Model
summary: Proposed durable Neon Postgres records, documented before migrations are committed.
---

# Initial data model

Every user-owned table includes `user_id`, timestamps where appropriate, and PostgreSQL Row Level Security restricting rows to the owning Neon Auth identity. Where the Data API role cannot access Neon's protected `auth` schema, a narrow private security-definer helper resolves the JWT identity without granting broad schema access.

Future policies must explicitly protect `SELECT`, `INSERT`, `UPDATE`, and `DELETE` as appropriate. Their ownership condition is conceptually `current JWT user ID = user_id`. Browser queries travel through the authenticated Neon Data API; direct PostgreSQL connection strings never reach the browser.

| Table | Purpose | Important relationships |
| --- | --- | --- |
| `study_sessions` | Implemented: completed timed or manual intervals | No subject foreign key by design; owner-only RLS |
| `subjects` | Implemented: user-managed academic subjects | Archived; optionally referenced by Workstreams and Study events |
| `projects` | Implemented: long-running top-level outcomes | Owns Workstreams and direct or nested Tasks; required due date |
| `workstreams` | Implemented: optional Project subdivisions | Required Project; optional Subject; owns nested Tasks |
| `tasks` | Implemented: actionable Project children | Required Project; optional Workstream; required due date |
| `events` | Implemented: timed or all-day calendar events | `is_major` drives D-Day presentation; optional Study subject |
| `habit_definitions` / `habit_completions` | Implemented: weekday recurrence and daily evidence | One completion per habit/date |
| `routine_templates` / `routine_template_items` | Implemented: weekday operating protocols | Source for daily snapshots |
| `routine_instances` / `routine_instance_items` | Implemented: historically stable daily routine | Items are copied, not live references |
| `caffeine_intakes` | Implemented: timestamped dose and intake/absorption-duration records | Remaining caffeine is derived, never stored |
| `caffeine_presets` | Implemented: reusable user-defined drinks and tablets | Built-ins remain in application code; custom presets are owner-only records |
| `user_settings` | Cross-feature preferences | One row per user |

`study_sessions`, Projects/Workstreams/Tasks/Subjects, Routine, Habits, Calendar Events, and Caffeine are implemented. Migration 0001 creates study sessions, migration 0002 binds policies to the sole account stored in a non-API `private` schema, migration 0003 creates tasks and subjects, migration 0004 creates weekday routine templates plus durable daily snapshots, migration 0005 creates habit definitions and daily completions, migration 0006 adds task D-Day presentation, migration 0007 creates events, migration 0008 creates caffeine intakes, migration 0009 creates reusable caffeine presets, migration 0010 moves Routine identity resolution behind a narrow private JWT helper, and migration 0011 introduces the Project → optional Workstream → Task hierarchy.

Migration 0011 preserves legacy rows defensively. It creates one `Legacy Tasks` Project per owner with existing flat Tasks, creates Subject-backed Workstreams for subject-linked legacy Tasks, and assigns every legacy Task to its parent. Existing due dates are retained. A legacy null due date inherits its generated Workstream deadline or Project deadline; if an owner has no dated Task, that generated parent deadline is explicitly documented as the migration date (`current_date`). No start date is fabricated. Production contained no Task rows when this strategy was selected, while existing Subjects remain untouched.

All three planning levels store explicit category, status, D-Day, position, dates, and completion timestamps. Their date constraint is `start_date IS NULL OR start_date <= due_date`; parent-child containment is intentionally a UI warning, not a database constraint. A composite Task foreign key ensures a selected Workstream belongs to the same Project.
