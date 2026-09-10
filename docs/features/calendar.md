---
id: calendar
type: feature
title: Calendar
summary: Full-screen ten-week planning surface for events, Workstream spans, and Task spans or deadlines.
---

# Calendar

Calendar is the time-based operational surface for Events and the Tasks hierarchy. The desktop and mobile layouts devote the available page area to an Apple Calendar-inspired, continuous ten-week grid. The viewport always remains ten weeks long. Stacked up/down chevrons shift its start one week earlier or later, while Today resets the start to the current week; there are no previous/next range arrow buttons. The heading describes the full visible month range.

Clicking empty space in any date opens a date-prefilled composer. The composer can create either an Event—with all-day or timed behavior—or a Task with a required Project, optional Workstream, optional start, and required due date. Clicking an existing Event or Task reopens the same surface for editing or deletion. Clicking a Workstream opens its Project Detail view.

Calendar owns `events` records but does not duplicate planning records. It renders Workstreams and started Tasks as multi-day spans, using a referenced Subject's color for Workstreams when available. Deadline-only Tasks and Workstreams appear only on their due date. Project bars stay out of Calendar to avoid long-range clutter. D-Day styling remains available across displayed hierarchy levels. Calendar queries through the Tasks feature boundary and refreshes when either feature changes.

The week currently starts on Sunday. This default lives behind `calendarPreferences` so the future Settings feature can persist a Sunday/Monday preference without rewriting calendar layout logic.
