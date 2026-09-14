---
id: timetable-import
type: feature
title: Timetable Import
summary: Imports a versioned inyak-planner JSON timetable into durable StudyOS subjects and weekly class meetings.
---

# Timetable import

Settings accepts the versioned `studyos-timetable` JSON contract exported by inyak-planner. The browser validates the file and recomputes all duration totals from its meeting boundaries before presenting a preview. Confirming the preview calls one database function so replacement of a term's previous import, Subject creation, Course creation, and Meeting creation occur in one transaction.

StudyOS keeps one imported timetable per owner, academic year, and term. Importing the same term again replaces only its imported timetable, courses, and meetings. Existing Subjects are reused by normalized name; user-created Subjects and planning records are never removed. Every imported table uses owner-only RLS.

The Settings summary reports class minutes and the remainder of the full 168-hour week separately. The latter is not a claim about usable study capacity because sleep and other commitments have not yet been subtracted.
