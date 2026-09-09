---
id: study-sessions
type: database
title: Initial Data Model
summary: Proposed durable Supabase records, documented before migrations are committed.
---

# Initial data model

Every user-owned table includes `user_id`, timestamps, and Row Level Security restricting rows to `auth.uid()`.

| Table | Purpose | Important relationships |
| --- | --- | --- |
| `study_sessions` | Completed timed or manual intervals | No subject foreign key by design |
| `subjects` | User-managed academic subjects | Archived; referenced by eligible tasks/events |
| `tasks` | General work items | Nullable `subject_id`; explicit category |
| `events` | Calendar events and major deadlines | `is_major` drives D-Day presentation |
| `habit_definitions` / `habit_completions` | Recurrence and daily evidence | One completion per habit/date |
| `routine_templates` / `routine_template_items` | Weekday operating protocols | Source for daily snapshots |
| `routine_instances` / `routine_instance_items` | Historically stable daily routine | Items are copied, not live references |
| `caffeine_intakes` | Timestamped intake events | Remaining caffeine is derived |
| `user_settings` | Cross-feature preferences | One row per user |

No migration is committed yet. Exact recurrence, routine snapshot mechanics, and settings storage wait for their implementation slices.
