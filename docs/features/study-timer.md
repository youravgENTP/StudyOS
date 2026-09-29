---
id: study-timer
type: feature
title: Study Timer
summary: Handles Start, Pause, and manual additions to total daily study time.
---

# Study Timer

The timer records total study time only and has no subject selector. Completed timer segments, manual additions, and one sentinel active session are persisted in `study_sessions` through the authenticated Neon Data API. This makes one running timer visible across localhost, production, tabs, and devices signed into the same account without relying on a newly exposed Data API resource.

Primary interactions are Start, Pause, and manual add. Clients refresh shared timer state every five seconds and when the page becomes visible. Start is idempotent, and Pause locks the shared state while atomically creating exactly one completed session. Legacy local-only running timestamps are migrated on first load.

While the timer is running, every crossed local midnight is finalized as a separate session for the day that just ended and a new active segment starts at exactly `00:00`. The rollover RPC locks the active row and is idempotent across tabs and devices. Refresh, app re-entry, Start, and Pause all perform the rollover first, so a sleeping or closed client catches up on every missed midnight before displaying or stopping the timer.
