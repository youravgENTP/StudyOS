---
id: caffeine
type: feature
title: Caffeine
summary: Records caffeine intake and estimates a time-varying body load from absorption and elimination.
---

# Caffeine

Caffeine records a source, dose, start time, and drinking duration. The default quick action represents one 1 fl oz espresso shot as 63.6 mg, based on USDA FoodData Central-derived data, and distributes intake uniformly over 60 minutes. The amount remains editable because preparation and cafe measurements vary substantially.

Each intake uses a one-compartment approximation with first-order elimination. During the drinking window, a constant input rate and elimination occur simultaneously; after drinking ends, the remaining amount decays exponentially. Multiple intakes are summed independently. The default adult half-life is 5 hours, within the roughly 3–7 hour range reported for healthy adults.

The 40 mg horizontal line is an evidence reference, not a medical threshold or measured plasma concentration. Reviews report improvements in alertness, vigilance, attention, and reaction time from low doses around 40 mg or 0.5 mg/kg, and a randomized double-blind study found performance effects at 40 mg. Individual response varies with tolerance, body size, genetics, smoking, medications, and health.

Sources:

- [McLellan et al. 2016 review](https://pubmed.ncbi.nlm.nih.gov/27612937)
- [Smith et al. 1999 randomized study](https://orca.cardiff.ac.uk/id/eprint/34474/)
- [Pharmacokinetics systematic analysis](https://pubmed.ncbi.nlm.nih.gov/35280254/)
- [USDA-derived espresso serving value](https://ific.org/resources/caffeine-calculator/)
- [FDA guidance for healthy adults](https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much)

The graph is an educational estimate of caffeine body burden. It is not a blood measurement, a guarantee of cognitive effect, or medical advice.
