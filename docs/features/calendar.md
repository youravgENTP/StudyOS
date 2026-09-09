---
id: calendar
type: feature
title: Calendar
summary: Full-screen monthly planning surface for events and due-dated tasks.
---

# Calendar

Calendar is the time-based planning surface for Events and Tasks. The desktop and mobile layouts devote the available page area to a Sunday-first, six-week month grid inspired by the interaction density of Apple Calendar.

Clicking empty space in any date opens a date-prefilled composer. The composer can create either an Event—with all-day or timed behavior—or a due-dated Task. Clicking an existing calendar entry reopens the same surface for editing or deletion. Subjects remain owned by Tasks/Subjects and are reused for Study entries.

Calendar owns `events` records but does not duplicate Tasks. It queries due-dated tasks through the Tasks feature boundary and refreshes when either feature changes.
