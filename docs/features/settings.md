---
id: settings
type: feature
title: Settings
summary: Owns cross-feature display and behavior preferences.
---

# Settings

Settings owns preferences that change another feature without becoming feature content. It controls the Caffeine chart's axis-label size from 12–20 px, an optional regular bedtime, caffeine half-life from 2–10 hours, and the bedtime residual planning target from 20–60 mg. Bedtime is intentionally unset by default; half-life defaults to 5 hours and the planning target defaults to 30 mg.

These values are stored in browser local storage and react immediately in an open app. They are device-local for now; server-backed `user_settings` remains a future persistence slice.
