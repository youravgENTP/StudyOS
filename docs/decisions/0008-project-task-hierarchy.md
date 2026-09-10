# ADR 0008: Model long-running work as a planning hierarchy

**Status:** Accepted

StudyOS models long-running work as Project → optional Workstream → Task. Every Task has a Project, while Workstreams and Subject links remain optional. Category is independent metadata at every level.

Due dates are required and start dates are optional. A null start date represents a deadline rather than an invented duration. Parent-child date containment is advisory so real schedules can exceed planning boundaries without data loss.

Status belongs to each record and is changed only by the user. Progress is derived from Done Tasks divided by non-Dropped Tasks; it never mutates parent status and is not stored. Explicit position values control sibling order. D-Day is a boolean on each level so Dashboard can project pinned deadlines without a polymorphic relation.
