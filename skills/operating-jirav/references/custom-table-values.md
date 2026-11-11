# Custom table values

**Scope: per plan.** Where: the plan page, `/<tenant>/plan/x/<planId>/custom/<customTableId>` (or the
table under **Custom** in the plan sidebar). The table's lines and sections are defined
company-wide in [custom-table-structure.md](custom-table-structure.md). Lines can also be filled
by [plan drivers](plan-drivers.md) or [global drivers](global-drivers.md); those rows are
read-only. Find tables with `await jirav.listCustomTables()` → `[{id: "custom-xxxxxx", name}]`.

Type values with `jirav.gridEntry` (as on the account grids, [plans.md](plans.md)): on a custom table page
`account` is the line's name and there's no department.

```js
await jirav.go('/<tenant>/plan/x/<planId>/custom/<customTableId>')
const E = jirav.gridEntry; await E.ready()
await E.read('<line>', undefined, ['2026-07'])                     // -> {values: {'2026-07': number | null}}
await E.set({account: '<line>', values: {'2026-07': 5}})           // staged and read back; '' clears; never saves
await E.save()                                                     // after the user's yes: SAVE, then reads them back
```

Actual and driven months come back in `readOnly`, a line with no typed months as a failed month with its `why`.
Line totals and drivers update only after SAVE; `E.cancel()` drops what's staged. A clear shows in `staged` as
`value: 0` with the month in `cleared` (Jirav holds 0 until SAVE): it saves as empty, and `save()` reads it back so.

A section with a Subtotal shows its total on the section row itself (there's no separate Subtotal
row in the plan): `readGridValues` gives it as that row's values, kind `total`.

Auto-Forecast doesn't change custom-table values (verified).

## What you type

- **Percent lines:** type whole percentages: `15` or `15%` is 15%, `0.15` is 0.15%. An import file
  is the opposite: it takes fractions ([imports.md](imports.md)).
  `readGridValues` returns percents as fractions (0.15 = 15%): multiply by 100 before typing a
  value you read.
- **Driven lines:** the line's own row is read-only; under it is an input row with the **same
  name**. Type there with `parent` naming the line: `E.set({account: '<line>', parent: '<line>', values})`
  (without it, set says "2 rows are labelled" and lists them). Input **adds** to the driver (driver 2,923 + typed 500 = 3,423). For a
  target total, type target − driver, or change the driver; say which you did.
- **Linked lines:** a line used by other lines' drivers (funnels, "LM" = last month) moves them
  too, in later months as well. After SAVE, re-read the lines that depend on it and report what
  moved.

## Quarters and years

The plan grid has monthly columns only. Roll months up by the line's **Period Value**
([custom-table-structure.md](custom-table-structure.md)): Sum → add the months, Ending Balance →
last month, Beginning Balance → first month, Average → average, Formula Based → read it from a
report. Say you rolled it up.

- **Ratio and percent lines** (conversion %, margin %): Average takes the mean of the monthly %, which
  isn't the period's ratio. For "Q1 conversion" recompute from the component lines (Σ Leads ÷ Σ
  Traffic) and say so, or read a Formula Based line from a report.
- **Which quarter or year:** fiscal (`(await jirav.getPeriods()).fiscalYearStartMonth`) unless the user says calendar;
  say which you used.

For bulk values users often import from Google Sheets or Excel (lines with Allow Import = YES). To import, see [imports.md](imports.md).


**The table's ⋮** (next to its title in the plan): Edit Custom Table (opens the structure page),
Show Comments, View Full Screen, Expand/Collapse Rows, Hide Rows with Zeroes, Hide Rows without
Drivers, Export as CSV, Export as Excel.
