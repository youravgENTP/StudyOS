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

The Routine page is one weekday timeline rather than separate Today and template modes. Monday–Sunday remains visible and defaults to the current weekday. Today renders the durable daily snapshot with completion checkboxes; edits are routed back to the source template through `source_item_id`, so the snapshot content and completion history remain stable. Other weekdays render their templates without completion controls.

Template creation and editing happen in expanding rows within the timeline. Rows support handle-based drag reorder persisted on drop, with up/down controls retained as a keyboard-friendly fallback. On today, an explicit reorder updates both the source template order and that daily instance's order; ordinary later template edits still do not rewrite the snapshot. The Dashboard only projects completion counts from the current instance.
