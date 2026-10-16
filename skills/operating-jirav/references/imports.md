# Imports (Excel → Jirav)

**Scope: changes data.** Staff list and custom-table actuals change **every plan**; budgets change
**one plan**. Confirm the file, the target and (for budgets) the plan with the user before uploading,
and verify in a plan afterwards. Where it runs: Settings → Integrations (`/<tenant>/setup/integrations`);
where the data shows: [staffing.md](staffing.md), [custom-table-values.md](custom-table-values.md),
[plans.md](plans.md). Reading what was imported and when: [integrations.md](integrations.md).

**Always fetch Jirav's template first and edit that file**: never write a workbook from scratch (the
one exception: a first staff list, below). No OS file chooser is ever opened: the `imports` block
fetches the template, edits cells in the page, and hands the file to Jirav's upload code, so Jirav's
checks and result messages still run.

Which template (Jirav builds each one; the kit fetches it by kind):

| The user wants to load… | Fetch | Scope |
|---|---|---|
| Employees: a roster, hires, salary changes | `im.template('staff')` | Company: every plan |
| Actuals for custom-table lines (KPIs, non-GL data) | `im.template('customActuals')` | Company: every plan |
| A budget for **GL accounts** (Income Statement, Balance Sheet) | `im.template('budget', {planId})` | That plan |
| A budget for **custom-table lines** | `im.template('customBudget', {planId})` | That plan |
| **GL actuals** for a company whose accounting source is Excel (JiravExcel) | its own workflow: [excel-actuals.md](excel-actuals.md) | Company: every plan |

The two budget kinds need `planId` (`jirav.listPlans()`): each template holds only that plan's forecast
months, so a wrong plan window means fixing the plan first. GL actuals normally sync from the
accounting system ([integrations.md](integrations.md)); the Excel route is only for JiravExcel
companies: see [excel-actuals.md](excel-actuals.md).

## How

```js
// if jirav.imports is missing after the restore line, paste scripts/blocks/imports.min.js; open Settings → Integrations
const im = jirav.imports;
const t = await im.template('budget', {planId});                 // or 'staff', 'customActuals', 'customBudget'
const r = await im.findRow(t.i, 'Income Statement', {A: 'Rent', D: 'General and Administrative'});
const c = await im.monthColumn(t.i, 'Income Statement', '2026-07');
const f = await im.edit(t.i, 'Income Statement', {[c + r]: 2500});   // a new file; the template is untouched
await im.upload('budget', f.i);
```

- `sheet` is the sheet name; `null` means the first sheet (the only one in staff and custom templates).
- `im.rows(i, sheet)` reads a sheet (date cells as `YYYY-MM-DD`; stored values such as `"15.00000"`
  as numbers) to find rows and columns.
- Many values: build the edits object from the user's data; `edit` takes any number of cells.
- **Percent custom lines take fractions in a file** (`customActuals` and `customBudget`): 0.15 is
  15%, and 15 imports as **1,500%**, the opposite of typing in the grid. Divide the user's
  percentages by 100 before writing them, and read the template's existing values as fractions
  too. Check each line's Format first (`ct.structure()`, `NUMBER_PERCENT`), and after the import
  re-read the grid for anything over 100%.
- A file built elsewhere: `im.fromBase64(b64, name)` (`{append: true}` for further chunks). Edit
  Jirav's template rather than writing a workbook from scratch: a file re-saved by openpyxl was
  rejected ("Error during reading file content").
- **Staff list, custom-table actuals:** `upload` sends the file and returns Jirav's result.
- **Budgets:** `upload` opens *Import Budget Data*, which waits for a real user event: **real-click
  inside the dialog once** (a script click doesn't count), on a blank area, not text (even if the plan list already shows), then `await im.finish('<plan name>')` picks
  the plan, presses UPLOAD TEMPLATE and returns the result. A click **outside** the dialog closes it
  without a message: take a fresh screenshot right before that click. If `finish` says "No dialog
  open", nothing was imported: run `upload` again.
- Results come from the alert log (`jirav.alerts()`); success alerts close themselves.
- Keep the untouched template (`im.list()`): for staff it is the restore file.
- Build each upload, including an undo, from a **freshly fetched** template, fetched right before
  building: staff and custom-actuals templates are prefilled with what Jirav holds now (the
  custom-actuals header moves with it), and the budget template's Balance Sheet with the latest balances.

## Per import

| | Template (`im.template`) | What the upload does | Undo |
|---|---|---|---|
| `staff` | **Not when an HR system is connected** (`getDataStatus().workforce.source` names it, e.g. `rippling-api`; the kit checks): then staff are changed in that system. With none connected the source is Excel (Jirav reports it as no source until a first import). The template is the current staff list, so editing it leaves everyone else unchanged; check its row count matches `listStaff` first. **With no staff list yet the template can't be fetched by script** (it redirects to a download): build the first file with these columns and pass it to `im.fromBase64`. Columns: Last Name, First Name, Department, Unique ID (`"20.0"`; match people by name), Hire Date, Termination Date, Job Title, Compensation Amount, Compensation Unit. Departments use the workforce names (`S&M: Sales`) | **Replaces the whole list**: people missing from the file are removed, others updated by Unique ID, new rows added | Upload the untouched template |
| `customActuals` | Row 1 `Version·2·type·custom lines`, row 3 `Table Name·Custom Line·` months as text, then one row per importable line, **prefilled with stored actuals** (an explicit empty cell for every month without a value). Header: with no data, Jan two years back → Dec next year (e.g. 2024-01 … 2027-12); once a line has data, its first data month → today. Find columns with `monthColumn`, not fixed letters; for a month outside the header it says which cell to add (`{AY3: '2019-01-01'}`) | **Every line in the file is re-imported**, and only the header's months change. An **empty cell** (`null`) **clears** that month; a cell absent from the row (as in a blank template row) leaves it as is. So delete the rows you're not changing, or build from a template fetched just before | Upload the same months with empty cells (`null`) |
| `budget` | Per plan, forecast months only, prefilled with the plan's typed values. *Income Statement*: one row per account × department (`Category`). *Balance Sheet*: prefilled with current balances | Values become typed input ("Manual Input" rows, department in `attrs.Department`). Jirav warns it "will replace any existing direct line input". **Empty Income Statement cells don't clear; empty Balance Sheet cells import as 0** | Delete the cells in the plan grid and SAVE ([plans.md](plans.md#type-values)) |
| `customBudget` | Per plan: header on row 4 (`Table Name·Custom Line·` forecast months), one row per line. Both custom templates list only lines with Allow Import = YES | As budget, for custom lines | As budget: click the cell on the custom-table page, **Delete**, SAVE |

For a budget, **leave the Balance Sheet sheet as the template delivers it** (the last actual balance
carried flat) unless the user supplies balances; then fill only those cells. **Never blank it:**
empty Balance Sheet cells import as **zero**, every non-cash account drops to 0 for the whole
forecast and System Cash absorbs the difference. Uploading the prefilled sheet unchanged leaves the
Balance Sheet as it was (verified). An **empty** Balance Sheet sheet in a fresh template means the plan
was already wiped: repair it first (the `budget-import` skill, section 2).
Check the Income Statement sheet too: any number already in it is re-imported as typed input.
Full budget loads (departments, wages vs System Salaries): the `budget-import` skill.

## Verify

Read the values back in a plan with `jirav.readGridValues` (an emptied row needs `{skipEmpty: false}`),
or `jirav.listStaff(planId)` for staff. After a budget, also check the first forecast month's Balance
Sheet balances still equal the last actual month's (or the user's balances). Custom actuals outside every plan's months show in no grid:
say so before importing, and verify by fetching the template again. Report what changed, and say how to undo it. An undo restores
the values, not the history: the import date (`getDataStatus()`) and the Audit Log keep the entry.
