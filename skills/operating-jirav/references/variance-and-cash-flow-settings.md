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

Columns: Data Element, Favorable Trend, Materiality Threshold. **ADD RULE** opens the [variable picker](variable-picker.md)
to choose the line; row ⋮: Edit Rule, Add Exception, Delete Rule. Saving not tested.

## Cash Flow (`/<tenant>/setup/cash-flow`)

Which cash-flow activity each balance sheet category and account falls under, as Operating /
Investing / Financing radio buttons (Account Classification). Drives the Cash Flow Statement.

```js
await jirav.getCashFlowSetup()  // [{key, name, parent, activity: 'operating'|'investing'|'financing'}]
```

Saving not tested.
