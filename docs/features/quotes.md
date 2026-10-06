---
id: quotes
type: feature
title: Quotes
summary: Manages categorized quotations and projects a random selection onto Dashboard.
---

# Quotes

Quotes provides owner-only CRUD for quotation text, author, source, an optional Webtoon episode, active state, favorite state, and an optional user-defined Category. Categories own a color and a Dashboard-enabled flag. Deleting a Category preserves its Quotes as uncategorized records.

The Dashboard chooses a cryptographically random Quote from active records whose Category is Dashboard-enabled. A manual refresh draws again from that pool while excluding the currently displayed Quote when another candidate exists.
