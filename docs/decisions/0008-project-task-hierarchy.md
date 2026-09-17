# ADR 0008: Model long-running work as a four-level planning hierarchy

**Status:** Accepted (superseded in part by migration 0023)

StudyOS models planning as Project → Workstream → Section → Task. A Workstream always belongs to one Project; a Section always belongs to one Workstream. New Tasks should use a Section. Existing Tasks may keep a null `section_id` and are deliberately presented as Ungrouped rather than being silently moved into a synthetic Section.

Project, Workstream, and Task due dates remain required. Section start and due dates are independent and optional. Parent-child containment is advisory. Status is explicit, progress is derived from non-Dropped Tasks, and integer positions define stable sibling ordering.

Tasks owns management. Calendar owns temporal presentation. Both Calendar entry points use one rendering engine: Workstreams map to light range lines, Tasks reuse event shapes with italic typography, and Sections map to derived dashed grouping regions rather than stored calendar bars. Stable IDs drive cross-week hierarchy highlighting.
