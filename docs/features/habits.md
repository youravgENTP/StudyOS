---
id: habits
type: feature
title: Habits
summary: Tracks binary or counted daily behavior values with editable history.
---

# Habits

A Habit definition has a name, color, selected weekdays, and `tracking_mode`: `binary` or `counter`. Daily evidence is stored in `habit_daily_records` with one non-negative integer value per owner, Habit, and date.

Binary Habits toggle between zero and one. Counter Habits expose decrement, value, and increment controls; decrement never passes zero. Heatmap days are buttons, so previous dates can be edited. A click toggles a binary value or increments a counter; Shift-click decrements a counter. Future days are disabled.

Counter heat intensity is bounded to five visual behavior levels by normalizing against the largest value in the currently loaded history. This keeps unusually large counts from dominating the display. Migration 0023 copies every legacy `habit_completions` row as value 1 and retains the legacy table for compatibility and rollback safety.
