---
id: tasks
type: feature
title: Projects, Workstreams, and Tasks
summary: Manages medium- and long-term work through a Project → optional Workstream → Task hierarchy.
---

# Projects, Workstreams, and Tasks

Tasks is StudyOS's long-range project-management domain. Every Task belongs to a Project and may optionally belong to a Workstream. A Workstream belongs to one Project and may optionally reference a global Subject. Category (`study`, `personal`, `errands`, `development`, or `other`) is editable metadata on every level; it is never a hierarchy level. New children initially inherit their parent's category in the UI.

Projects, Workstreams, and Tasks require a due date and may omit a start date. A null start date means deadline-only and renders as a diamond at the due date; no start date is invented. Individual Tasks can additionally mark their due date as a Timeline deadline. Each marked Task produces a labeled red guide at its due-date coordinate across the full Portfolio or Project timeline, independently of whether the Task itself is a range bar or deadline-only marker. A start date cannot follow its due date. Children may intentionally extend beyond parent dates, so those relationships produce visible warnings instead of blocking writes or silently changing dates.

All three levels use explicit `not_started`, `in_progress`, `done`, and `dropped` statuses. Marking an entity Done records `completed_at`; moving it to another status clears that timestamp. Parent state remains manual. Progress is derived from individual Tasks: Done Tasks divided by all non-Dropped Tasks. Project progress uses every direct and nested Task rather than averaging Workstreams. Zero eligible Tasks displays “No tasks yet.”

The default route is a collapsed Portfolio Timeline of active Projects. Expansion state is device-local in `localStorage`. Bars contain titles and use progressively lighter visual weight down the hierarchy; deadline-only records use markers. A Project opens a detail route with a work-focused List and a shared Gantt-style Timeline. List ordering follows explicit `position` values, with accessible up/down controls for Workstreams and for Tasks within the same parent.

Creation and editing use a contextual side drawer rather than a fixed composer. Creating under a Project or Workstream preselects that parent. D-Day may be pinned at any level and is projected onto the Dashboard.

Subjects remain global, reusable, color-bearing master data, organized by academic year and term. The manager opens as a modal so it never changes the Portfolio layout, supports arbitrary colors through a native picker and hex value, and defaults legacy Subjects to the 2026-2 term. They can be created, edited, recolored, and archived. Only Workstreams optionally reference Subjects; a linked Workstream's Timeline bar derives directly from its Subject color so recoloring the Subject updates every linked bar without duplicated color data. Unrelated Workstreams and direct Project Tasks need no Subject. Each Workstream and individual Task also has a Show on Calendar option, enabled by default, for controlling whether that item is exposed on the calendar.

The authenticated Neon Data API owns CRUD. Browser mutations emit one feature-local event so Portfolio, Project Detail, Calendar, and Dashboard reload the same durable rows. Owner-only RLS applies independently to Projects, Workstreams, Tasks, and Subjects.
