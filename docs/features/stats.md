---
id: stats
type: feature
title: Stats
summary: Compares recorded Study Sessions with timetable-aware waking capacity and publishes bounded Caffeine intake history.
---

# Stats

Stats reads existing durable records without copying them into an analytics table. Its weekly navigator can move backward through completed Monday–Sunday weeks and return directly to the current week. Each selection loads both that week and its preceding week so comparisons use the same number of weekdays. Study capacity starts with the fixed 07:00–24:00 waking window, clips imported class meetings to that window, merges overlaps, and subtracts the merged class duration. Recorded Study Session duration is attributed to the local calendar date of `ended_at`; manual and timer sources use the same rule. Running timer sessions are split at each local midnight, with the completed segment ending immediately before midnight so it remains attributed to the day on which it was studied.

Study Session history in the selected period can be corrected after recording. Editing the duration or ending timestamp writes directly to the existing session, then immediately recomputes the visible totals, utilization, and daily chart. For timer sessions, `started_at` is moved to preserve the corrected duration relative to `ended_at`; manual sessions continue to keep a null start timestamp.

The capacity ratio is recorded Study Session minutes divided by timetable-aware available minutes. Available time means unassigned waking time, not guaranteed productive time: travel, meals, Calendar Events, and Routine Items are not yet subtracted. Caffeine statistics publish recorded dose and timing only and make no causal claim about study performance.

For the current week, cumulative utilization includes Monday through today and compares with the same weekday span from the preceding week. For a completed historical week, it uses all seven days and compares with the full preceding week. The comparison is expressed in percentage points (`%p`), while daily utilization cards expose each day's study time divided by its available time. Future days in the current week remain visible for capacity planning but are dimmed and excluded from cumulative metrics.
