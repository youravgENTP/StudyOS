---
id: caffeine
type: feature
title: Caffeine
summary: Records caffeine intake and estimates a time-varying body load from absorption and elimination.
---

# Caffeine

Caffeine records a source, dose, start time, and intake or absorption duration. StudyOS's generic coffee presets are a 75 mg single shot and a 150 mg double shot (2 × 75 mg), both distributed uniformly over 60 minutes. These are editable planning defaults, not claims about every cafe. The built-in 50 mg and 100 mg tablet presets use a 45-minute absorption window. Users can create, edit, and delete their own persisted presets.

Each intake uses a one-compartment approximation with first-order elimination. During the drinking window, a constant input rate and elimination occur simultaneously; after drinking ends, the remaining amount decays exponentially. Multiple intakes are summed independently. The configurable default half-life is 5 hours, with a Settings range of 2–10 hours. Pure decay uses `dose × 0.5^(elapsedHours / halfLifeHours)`; the chart and all current-milligram summaries share `totalLoadAt`.

The chart contains 40 hours: 24 hours of history and 16 hours of projection. It opens at the right edge so the initial viewport remains the most recent eight hours plus the future projection, while horizontal scrolling reveals the earlier history. The observed-time portion is solid and the future estimate is dashed. Peak labels are limited to an actual local maximum where the curve changes from rising to falling; a decaying value at the left boundary is not mislabeled as a peak. The dynamic milligram axis, current value, bedtime intersection, and intake annotations use the same estimate. Time-axis labels align to either the hour or half hour instead of inheriting the current minute. Axis-label size is a device-local preference controlled from Settings.

The 40 mg line remains a low-residual visual reference with no effect or safety semantics. A separate configurable **Bedtime residual target** defaults to 30 mg and accepts 20–60 mg in Settings. It is a personal planning target, not a medically validated sleep-safety threshold. The chart uses it as its bedtime planning reference and annotates the estimated curve value where it crosses the configured bedtime.

The header prioritizes projected total caffeine at bedtime, then the current estimate, followed by dose-aware guidance for the built-in double-shot reference. `calculateLatestAllowableIntakeTime` adds that hypothetical intake to every loaded recorded intake and searches for the latest start that finishes before bedtime while keeping `totalLoadAt` at or below the planning target. Existing caffeine therefore consumes the available bedtime budget; if it already reaches the target, the UI reports that no additional caffeine fits. Changes to intake records, dose/duration, bedtime, half-life, or the target recompute the result. This replaces the former fixed bedtime-minus-eight-hours recommendation.

Sources:

- [McLellan et al. 2016 review](https://pubmed.ncbi.nlm.nih.gov/27612937)
- [Smith et al. 1999 randomized study](https://orca.cardiff.ac.uk/id/eprint/34474/)
- [Pharmacokinetics systematic analysis](https://pubmed.ncbi.nlm.nih.gov/35280254/)
- [FDA guidance for healthy adults](https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much)

The graph is an educational estimate of caffeine body burden. It is not a blood measurement, a guarantee of cognitive effect, or medical advice.
