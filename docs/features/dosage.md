---
id: dosage
type: feature
title: Dosage
summary: Combines Caffeine tracking with owner-only medication administration records and evidence-backed reference pharmacokinetics.
---

# Dosage

Dosage preserves the existing Caffeine intake and decay model and adds medication administration records. The system catalog contains Tylenol 500 mg immediate-release tablets, 튜란트캡슐 200 mg, 코슈정 60 mg, and 페니라민정 2 mg. `듀란트캡슐` is retained as a search alias for the official `튜란트캡슐` product name. Catalog records also define the user's one-tap default quantity, including 0.5 tablet for 코슈정 and 1 tablet for 페니라민정.

Catalog and pharmacokinetic profile rows are system reference data readable by authenticated users. Personal `dosage_intakes` rows are protected by sole-owner RLS and snapshot product, ingredient, amount, unit, route, and administration time so later catalog changes cannot rewrite history.

A successful medication insert returns its durable row and adds it to the visible log immediately. The log follows the date of a newly recorded dose, and its date selector exposes backdated records instead of limiting the UI to today.

The medication exposure chart renders every available medication/analyte series on one shared relative-exposure axis. It is centered on the current time with a visible window from 24 hours before now through 36 hours after now. Calculations use medication intakes fetched from the preceding seven days so changing the daily history date—or crossing midnight—does not reset ongoing exposure. Its simplified linear-absorption and exponential-elimination envelope uses the stored `tmax` and half-life ranges. Values are normalized against one labeled dose and may exceed 100% after repeated administrations; they are not blood concentrations or clinical dosing guidance.

Pharmacokinetic profiles remain `reference_only`. StudyOS displays sourced absorption and half-life ranges but does not infer medication blood concentration, clinical effect, interactions, adherence, or dosing recommendations. Acetylcysteine is modeled only from the parent-drug profile; the broader analytical `total acetylcysteine` measurement is intentionally excluded from the catalog and chart.
