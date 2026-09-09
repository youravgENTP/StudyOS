---
id: settings
type: feature
title: Settings
summary: Owns cross-feature display and behavior preferences.
---

# Settings

Settings owns preferences that change another feature without becoming feature content. The first implemented preference controls the Caffeine chart's horizontal- and vertical-axis label size from 12–20 px.

The value is stored in browser local storage and reacts immediately in an open app. It is device-local for now; server-backed `user_settings` remains a future persistence slice.
