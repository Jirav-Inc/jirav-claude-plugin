# Custom table values

**Scope: per plan.** Where: the plan page, `/<tenant>/plan/x/<planId>/custom/<customTableId>` (or the
table under **Custom** in the plan sidebar). The table's lines and sections are defined
company-wide in [custom-table-structure.md](custom-table-structure.md). Lines can also be filled
by [plan drivers](plan-drivers.md) or [global drivers](global-drivers.md); those rows are
read-only. Find tables with `await jirav.listCustomTables()` → `[{id: "custom-xxxxxx", name}]`.

1. Open the table in the plan.
2. Check editability: `jirav.readGridValues({ editable: true })`. Actual months are read-only;
   forecast months are editable.
3. **Double-click** a cell (or click + Enter) → type → **Enter**. Repeat as needed. Point:
   `jirav.readGridValues.cellPoint('<line>', 'YYYY-MM')`. To **clear** a value: click it, press **Delete**.
4. **SAVE** in the bottom bar (CANCEL discards all pending edits). Line totals and drivers update
   only after SAVE. Reload and re-read to verify.

## What you type

- **Percent lines:** type whole percentages: `15` or `15%` is 15%, `0.15` is 0.15%.
  `readGridValues` returns percents as fractions (0.15 = 15%): multiply by 100 before typing a
  value you read.
- **Driven lines:** the line's own row is read-only; under it is an input row with the **same
  name**. Type there: `cellPoint('<line>', 'YYYY-MM', {index: 1})` (without `index` it throws
  "2 rows are labelled"). Input **adds** to the driver (driver 2,923 + typed 500 = 3,423). For a
  target total, type target − driver, or change the driver; say which you did.
- **Linked lines:** a line used by other lines' drivers (funnels, "LM" = last month) moves them
  too, in later months as well. After SAVE, re-read the lines that depend on it and report what
  moved.

## Quarters and years

The plan grid has monthly columns only. Roll months up by the line's **Period Value**
([custom-table-structure.md](custom-table-structure.md)): Sum → add the months, Ending Balance →
last month, Beginning Balance → first month, Average → average, Formula Based → read it from a
report. Say you rolled it up.

For bulk values users often import from Google Sheets or Excel (lines with Allow Import = YES). To import, see [imports.md](imports.md).


**The table's ⋮** (next to its title in the plan): Edit Custom Table (opens the structure page),
Show Comments, View Full Screen, Expand/Collapse Rows, Hide Rows with Zeroes, Hide Rows without
Drivers, Export as CSV, Export as Excel.
