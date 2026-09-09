---
id: study-timer
type: feature
title: Study Timer
summary: Handles Start, Pause, and manual additions to total daily study time.
---

# Study Timer

The timer records total study time only and has no subject selector. Completed timer segments and manual additions are persisted through the authenticated Neon Data API. An in-progress start timestamp remains local until Pause succeeds, preventing a failed write from silently discarding elapsed time.

Primary interactions are Start, Pause, and manual add. A running timer stores its start timestamp so elapsed time survives rerenders.
