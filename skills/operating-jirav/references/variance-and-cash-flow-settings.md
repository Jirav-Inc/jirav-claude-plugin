# Variance Rules and Cash Flow settings

**Scope: company-wide.** Two small Settings pages that shape reports, not plan values. Follow
**Edits** in SKILL.md and only on request. Related: [reports.md](reports.md), [report-editing.md](report-editing.md),
[chart-of-accounts.md](chart-of-accounts.md).

## Variance Rules (`/<tenant>/setup/variances`)

When a variance counts as material and whether a positive one is good. Used by report variance
formatting (favourable / unfavourable colours).

```js
await jirav.getVarianceRules()  // [{line, favorable, valueThreshold, percentThreshold, match: 'OR'|'AND', exceptions}]
```

`favorable` POSITIVE / NEGATIVE / IGNORE is the page's Favorable Trend **Increase / Decrease /
Ignore**. It's applied to the **sign of a report's Δ cell**: a Δ is coloured favorable when it is
above 0 under POSITIVE or below 0 under NEGATIVE, and only when it's material (|Δ| above the
thresholds; 0 means any change) and the package has favorable/unfavorable formatting on. The Δ's own direction
comes from the report group's formula ([reports.md](reports.md), `variance.formula`), so a rule
and a formula can disagree: with COGS = Increase, a group computing expense Δ as Budget − Actuals
colours an under-spend green, while one computing Actuals − Budget colours an overspend green.
The app's defaults for a new company: COGS, OpEx, Other Expense and Liabilities = Decrease, the
rest = Increase, thresholds 0 (from the app source; companies change them).

Columns: Data Element, Favorable Trend, Materiality Threshold. **ADD RULE** opens the [variable picker](variable-picker.md)
to choose the line; row ⋮: Edit Rule, Add Exception, Delete Rule. **Edit Rule** opens a dialog:
Favorable Trend (Increase is Favorable / Decrease is Favorable / Ignore Trend), Materiality
Threshold (Variance % · AND/OR · Variance #) → **SAVE** saves the rule at once (verified, then set
back). Under OR, a non-zero % with a zero # (or the reverse) counts as 0% OR $0, so every change
is material; the dialog warns about it.

## Cash Flow (`/<tenant>/setup/cash-flow`)

Which cash-flow activity each balance sheet category and account falls under, as Operating /
Investing / Financing radio buttons (Account Classification). Drives the Cash Flow Statement.

```js
await jirav.getCashFlowSetup()  // [{key, name, parent, activity: 'operating'|'investing'|'financing'}]
```

As seen in the companies checked: liabilities (long term included, so notes payable and lines of
credit too) are Operating, fixed assets and accumulated depreciation Investing, equity Financing.
Loans often end up in Operating: see the checks in
[burn-and-runway.md](finance/burn-and-runway.md#sanity-checks-on-the-cash-flow).

**Each radio button saves at once** (no Save or confirmation; verified, and reverted the same way): company-wide, so confirm before clicking, and read `getCashFlowSetup()` after.
