---
id: caffeine
type: feature
title: Caffeine
summary: Records caffeine intake and estimates a time-varying body load from absorption and elimination.
---

# Caffeine

Caffeine records a source, dose, start time, and intake or absorption duration. StudyOS's editable generic defaults are 75 mg for one espresso shot and 150 mg for one Americano (two generic shots); these are planning defaults, not claims about every cafe. The Americano distributes intake uniformly over 60 minutes. The built-in 50 mg and 100 mg tablet presets use a 45-minute absorption window. Users can create, edit, and delete their own persisted presets.

Each intake uses a one-compartment approximation with first-order elimination. During the drinking window, a constant input rate and elimination occur simultaneously; after drinking ends, the remaining amount decays exponentially. Multiple intakes are summed independently. The configurable default half-life is 5 hours, with a Settings range of 2–10 hours. Pure decay uses `dose × 0.5^(elapsedHours / halfLifeHours)`; the chart and all current-milligram summaries share `totalLoadAt`.

The chart contains 40 hours: 24 hours of history and 16 hours of projection. It opens at the right edge so the initial viewport remains the most recent eight hours plus the future projection, while horizontal scrolling reveals the earlier history. The observed-time portion is solid and the future estimate is dashed. Peak labels are limited to an actual local maximum where the curve changes from rising to falling; a decaying value at the left boundary is not mislabeled as a peak. The dynamic milligram axis, current value, and intake annotations use the same estimate. Axis-label size is a device-local preference controlled from Settings.

The 40 mg line is labeled **Low residual** and has no effect or safety semantics. A visually distinct 60 mg **Sleep caution reference** is also only a planning marker, not a universal sleep-safety threshold. When a regular bedtime exists, the feature recommends a conservative generic cutoff eight hours before the next occurrence of that bedtime. After-midnight bedtimes resolve to the appropriate next calendar occurrence, and the displayed cutoff includes a weekday to keep previous-day cutoffs unambiguous.

Sources:

- [McLellan et al. 2016 review](https://pubmed.ncbi.nlm.nih.gov/27612937)
- [Smith et al. 1999 randomized study](https://orca.cardiff.ac.uk/id/eprint/34474/)
- [Pharmacokinetics systematic analysis](https://pubmed.ncbi.nlm.nih.gov/35280254/)
- [FDA guidance for healthy adults](https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much)

The graph is an educational estimate of caffeine body burden. It is not a blood measurement, a guarantee of cognitive effect, or medical advice.
