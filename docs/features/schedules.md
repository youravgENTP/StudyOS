---
id: schedules
type: feature
title: Schedules
summary: Browses and manages Calendar Events by category, subcategory, subject, month, and importance.
---

# Schedules

Schedules is the management-oriented companion to Calendar. Calendar remains the spatial time view, while `/schedules` provides search, date-range and category filters, grouping by Category, Subcategory, Subject, Month, or Importance, and multi-select reassignment or deletion. Both surfaces share the same Event records and editor.

Schedule rows identify an event that is active at the current time with a green LIVE indicator and an expanding pulse ring. An event beginning tomorrow receives a compact red dot. Timed events become live only between their start and end timestamps; all-day and multi-day events are live while today's date falls inside their range. The animation becomes a static ring when the operating system requests reduced motion.

An optional Subcategory belongs to exactly one existing Event Category. The database enforces that the Event and Subcategory categories match. Events without one remain available under Uncategorized. Subcategories have their own name, color, ordering position, and archive state; their color takes precedence over Subject and fallback colors in Calendar.

The Calendar sidebar nests Subcategory visibility controls below each Category. Disabling a Category hides all of its Event, Workstream, and Task content, while individual Subcategory controls refine Event visibility only.
