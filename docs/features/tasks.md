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

Sections have optional descriptions, optional date ranges, explicit sibling positions, status, and archival. Archiving a Section preserves its Tasks because the UI first treats their now-hidden relationship as Ungrouped; destructive deletion is not used by the client. Parent date containment remains advisory and produces warnings.
