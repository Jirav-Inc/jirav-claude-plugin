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
4. **SAVE** in the bottom bar (CANCEL discards all pending edits). Reload and re-read to verify.

For bulk values users often import from Google Sheets or Excel (lines with Allow Import = YES). To import, see [imports.md](imports.md).


**The table's ⋮** (next to its title in the plan): Edit Custom Table (opens the structure page),
Show Comments, View Full Screen, Expand/Collapse Rows, Hide Rows with Zeroes, Hide Rows without
Drivers, Export as CSV, Export as Excel.
