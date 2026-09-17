---
id: calendar
type: feature
title: Calendar
summary: Shared temporal renderer for schedule events and planning hierarchy.
---

# Calendar

Calendar is the temporal visualization surface. The main route defaults to Everything; Tasks Calendar invokes the same page and renderers with the Tasks-only preset. Source controls can switch between Everything, Tasks only, and Schedule only, and independently toggle Events, Workstreams, Tasks, and completed Tasks.

Ordinary Events retain normal typography and their existing single-day or filled-span shapes. Tasks-managed labels are italic. Individual Tasks reuse Event temporal shapes. Workstreams use a thin range-line treatment instead of a filled bar. Sections are not Calendar items: within each day, Tasks are ordered into contiguous Section runs and the desktop renderer derives a quiet dashed fragment around each run. Multi-day Task fragments receive their own exact Section outline. Fragments share semantic highlighting but are not forced into one bounding rectangle across dates, so they never visually contain Tasks from another Section and Section count alone cannot increase row height. Empty Sections produce no outline. Outline color inherits the parent Workstream's Subject color, falling back to its category color.

React highlight state links fragments semantically. Focusing or hovering a Task highlights its Section peers and parent Workstream; focusing a Section highlights its Tasks and Workstream; focusing a Workstream highlights all descendants and all visible week fragments. Section names fade in only when the group is active. Unrelated planning items are mildly dimmed. Mobile agenda rows expose Section or Ungrouped context in text because hover is unavailable.

The ten-week range, week boundaries, lane calculations, event composer, source data, and desktop/mobile rendering are shared by both entry points. Calendar never copies planning records.
