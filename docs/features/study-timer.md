---
id: study-timer
type: feature
title: Study Timer
summary: Handles Start, Pause, and manual additions to total daily study time.
---

# Study Timer

The timer records total study time only and has no subject selector. Completed timer segments, manual additions, and the active timer start timestamp are persisted through the authenticated Neon Data API. This makes one running timer visible across localhost, production, tabs, and devices signed into the same account.

Primary interactions are Start, Pause, and manual add. Clients refresh shared timer state every five seconds and when the page becomes visible. Start is idempotent, and Pause locks the shared state while atomically creating exactly one completed session. Legacy local-only running timestamps are migrated on first load.
