---
id: routine
type: feature
title: Daily Routine
summary: Turns weekday operating templates into historically stable daily checklists.
---

# Daily Routine

Routine answers “How should I operate today?” and remains separate from Tasks and Habits. Each Monday–Sunday template contains ordered actions with an optional time and flexible details for locations, items to bring, instructions, or fallback plans.

Opening a day creates one durable routine instance and copies that weekday's template items exactly once. Completion changes belong to the instance, so later template edits never rewrite the existing snapshot, including one created from an empty template.

Routine tables store the Neon Auth user ID as `user_id`, but normal Routine queries touch only public application tables. Migration 0010 introduces the narrow security-definer `private.current_user_id()` JWT boundary because the Data API's `authenticated` role intentionally has no broad access to Neon's protected `auth` schema. Routine defaults, owner-only RLS policies, and snapshot creation call that helper instead of directly resolving `auth.user_id()` as the application role.

The Routine page owns template creation, editing, ordering, and deletion. Its template editor uses two vertical columns: the selected template timeline and a dedicated add/edit panel. Its Today view owns daily completion. The Dashboard only projects completion counts from the current instance.
