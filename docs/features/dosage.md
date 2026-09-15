---
id: dosage
type: feature
title: Dosage
summary: Combines Caffeine tracking with owner-only medication administration records and evidence-backed reference pharmacokinetics.
---

# Dosage

Dosage preserves the existing Caffeine intake and decay model and adds medication administration records. The system catalog initially contains Tylenol 500 mg immediate-release tablets and 튜란트캡슐 200 mg. `듀란트캡슐` is retained as a search alias for the latter's official product name.

Catalog and pharmacokinetic profile rows are system reference data readable by authenticated users. Personal `dosage_intakes` rows are protected by sole-owner RLS and snapshot product, ingredient, amount, unit, route, and administration time so later catalog changes cannot rewrite history.

A successful medication insert returns its durable row and adds it to the visible log immediately. The log follows the date of a newly recorded dose, and its date selector exposes backdated records instead of limiting the UI to today.

The medication exposure chart keeps products in separate lanes and renders each available analyte independently. Its simplified linear-absorption and exponential-elimination envelope uses the stored `tmax` and half-life ranges. Values are normalized against one labeled dose and may exceed 100% after repeated administrations; they are not blood concentrations or clinical dosing guidance.

Pharmacokinetic profiles remain `reference_only`. StudyOS displays sourced absorption and half-life ranges but does not infer medication blood concentration, clinical effect, interactions, adherence, or dosing recommendations. Acetylcysteine keeps parent-drug and total-acetylcysteine half-life profiles separate because those measurements are not interchangeable.
