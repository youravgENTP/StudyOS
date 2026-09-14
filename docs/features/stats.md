---
id: stats
type: feature
title: Stats
summary: Compares recorded Study Sessions with timetable-aware waking capacity and publishes bounded Caffeine intake history.
---

# Stats

Stats reads existing durable records without copying them into an analytics table. It supports 7, 30, and 90-day windows ending today. Study capacity starts with the fixed 07:00–24:00 waking window, clips imported class meetings to that window, merges overlaps, and subtracts the merged class duration. Recorded Study Session duration is attributed to the local calendar date of `ended_at`; manual and timer sources use the same rule.

The capacity ratio is recorded Study Session minutes divided by timetable-aware available minutes. Available time means unassigned waking time, not guaranteed productive time: travel, meals, Calendar Events, and Routine Items are not yet subtracted. Caffeine statistics publish recorded dose and timing only and make no causal claim about study performance.
