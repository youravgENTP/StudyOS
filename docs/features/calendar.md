---
id: calendar
type: feature
title: Calendar
summary: Full-screen ten-week planning surface for events, Workstream spans, and Task spans or deadlines.
---

# Calendar

Calendar is the time-based operational surface for Events and the Tasks hierarchy. The desktop and mobile layouts devote the available page area to an Apple Calendar-inspired, continuous ten-week grid. The viewport always remains ten weeks long. Stacked up/down chevrons shift its start one week earlier or later, while Today resets the start to the current week; there are no previous/next range arrow buttons. The heading describes the full visible month range.

Clicking empty space in any date opens a date-prefilled composer. The composer can create either an Event—with all-day or timed behavior—or a Task with a required Project, optional Workstream, optional start, and required due date. Clicking an existing Event or Task reopens the same surface for editing or deletion. Clicking a Workstream opens its Project Detail view.

Calendar owns `events` records but does not duplicate planning records. Events can cover one or many days. It renders multi-day Events, visible Workstreams, and started Tasks as continuous week-spanning bars; spans wrap only at week boundaries and always occupy lanes above one-day items. Week rows grow to fit all lanes and items rather than truncating them. Deadline-only Tasks and Workstreams appear only on their due date. Project bars stay out of Calendar to avoid long-range clutter. D-Day styling remains available across displayed hierarchy levels. Calendar queries through the Tasks feature boundary and refreshes when either feature changes.

The sidebar has a three-state flow on Calendar: a collapsed rail, the main StudyOS navigation, and Calendar filters. In the main sidebar, `<<` collapses to the brand mark and `>>`, while `>>` advances to Calendar filters. The Calendar sidebar's `<<` returns to main navigation, so only one full sidebar is present at a time. Both expanded sidebars share the same width and directional transitions make switching or collapsing visually continuous. Calendar filters independently control Events, Workstreams, Tasks, Categories, and nested Event Subcategories. These controls affect only the current calendar view. A Workstream or Task's durable `show_on_calendar` setting determines whether it is eligible to appear at all.

The week starts on Sunday by default. Settings can persistently switch the first day to Monday; the visible range and weekday headings react immediately.
