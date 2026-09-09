# ADR 0005: Markdown-backed architecture graph

**Status:** Accepted

Important nodes have Markdown documents. A small JSON file records nodes and reason-bearing edges. The independent React Flow viewer imports both at build time, keeping documentation readable without a custom backend.
