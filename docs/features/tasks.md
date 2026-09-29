---
id: tasks
type: feature
title: Project Planning
summary: Manages Project → Workstream → Section → Task planning.
---

# Tasks

Tasks is the planning and management workspace. Its preferred hierarchy is Project → Workstream → Section → Task. Projects and Workstreams require due dates; Sections may omit both dates; Tasks require a due date. A Task may temporarily have a null `section_id` for backward compatibility and appears in an explicit **Ungrouped** area. Migration 0023 does not manufacture Sections or rewrite existing Task relationships.

The desktop Project screen uses a Navigator containing Workstreams and Sections plus a Workspace containing Section accordions and minimal Task rows. Task creation within a Section is inline; full editing remains in a detail drawer. Mobile stacks Navigator and Workspace into a drill-down-friendly flow. Progress is Done Tasks divided by non-Dropped Tasks and never implicitly changes a parent status.

Tasks exposes List and Calendar views. Calendar routes to the shared Calendar implementation with the Tasks-only preset; there is no Tasks-owned calendar renderer. The former percent-positioned `PortfolioTimeline` implementation was removed.

The Tasks toolbar imports and exports the versioned `studyos-plan` JSON interchange format shared with Schedules. Export always captures the complete Project → Workstream → Section → Task hierarchy together with Subjects, Schedule Subcategories, Events, and the supported category catalog, independent of the current Active/All display filter. Import validates the file in the browser and defaults to **Merge only (safe)**, which adds missing records without modifying matches. The optional **Update existing** mode updates matching rows and inserts missing rows, but never deletes, archives, drops, or hides records omitted from the file. Both modes run transactionally and report inserted, updated, and unchanged counts.

Update matching checks an exported ID first, always restricted to the current owner. An unknown or foreign-owned ID is never trusted and falls back to normalized identity: Subject name/year/term, Subcategory category/name, Project title, Workstream and Section parent path/title, and Task parent path/title. Task due dates are deliberately excluded from Update fallback identity so GPT can reschedule an existing Task without creating a duplicate. Merge-only fallback retains its prior conservative duplicate rules.

Sections have optional descriptions, optional date ranges, explicit sibling positions, status, and archival. Archiving a Section preserves its Tasks because the UI first treats their now-hidden relationship as Ungrouped; destructive deletion is not used by the client. Parent date containment remains advisory and produces warnings.
