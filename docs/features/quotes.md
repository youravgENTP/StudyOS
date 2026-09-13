---
id: quotes
type: feature
title: Quotes
summary: Manages categorized quotations and projects a daily selection onto Dashboard.
---

# Quotes

Quotes provides owner-only CRUD for quotation text, author, source, active state, favorite state, and an optional user-defined Category. Categories own a color and a Dashboard-enabled flag. Deleting a Category preserves its Quotes as uncategorized records.

The Dashboard chooses a stable daily Quote from active records whose Category is Dashboard-enabled. A manual refresh advances through that eligible pool without changing the stored records.
