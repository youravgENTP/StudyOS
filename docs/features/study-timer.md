---
id: study-timer
type: feature
title: Study Timer
summary: Handles Start, Pause, and manual additions to total daily study time.
---

# Study Timer

The timer records total study time only and has no subject selector. The proof of concept persists current state locally; Supabase session persistence is the next integration step.

Primary interactions are Start, Pause, and manual add. A running timer stores its start timestamp so elapsed time survives rerenders.
