---
id: tasks
type: feature
title: Tasks and Subjects
summary: Models general tasks while allowing Study tasks to reference a user-managed subject.
---

# Tasks and Subjects

Tasks use the explicit categories Study, Personal, Errands, Development, and Other. A task has a title, optional due date, completion timestamp, and an optional subject only when its category is Study. The database enforces that non-Study tasks cannot retain a subject.

The Tasks route owns task editing and subject management. It provides open/completed views and supports creating, editing, completing, and deleting tasks. Subjects can be created, renamed, recolored, and archived. Archiving removes a subject from future selection while preserving its name and color on historical tasks.

`useTasks` reads both resources through the authenticated Neon Data API. Mutations emit one feature-local browser event so the Tasks route and Dashboard projection refresh from the same durable records without introducing a global store. Every query remains protected by owner-only RLS.
