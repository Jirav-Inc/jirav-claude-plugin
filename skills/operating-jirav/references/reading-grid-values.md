# Reading values

**Scope: read-only.** Reads what the current page shows; changes nothing.

`jirav.readGridValues(opts)` (block `scripts/blocks/grid-values.min.js`, pasted after the core) reads
**financial values by period** from the page's data grid. It reads the grid's data model
directly, so it includes rows scrolled out of view or inside collapsed groups, and returns raw
numbers (no parsing of `$1,234` or `(5.0%)`).

| Use it on | Notes |
|---|---|
| Plan pages (Revenue, OpEx…, Staffing) | rows by account, department and driver; actual/forecast columns |
| Custom table values in a plan | `/plan/x/<planId>/custom/<id>`; [GL] and driver rows included |
| Report pages with tables | columns by source (actuals, plans), variance columns |
| The plan's Assumptions panel | `{ grid: 1, skipEmpty: false }`; each value is in `attrs.Value` |

**Not for** lists or setup pages (Global Drivers, the custom table editor, Manage Plans): use the
core `list*` lookups. On a grid with no period columns it returns a `warning` saying so.

**It only returns what the current page has loaded.** To read another plan, report, department
or scenario, `jirav.go(...)` there (or change the page's filter) first. If it throws "No data
grid on this page", wait with `await jirav.ready()`, or the page has no grid (dashboards, text
pages).

## Options

```js
jirav.readGridValues()                                        // everything, compact table form
jirav.readGridValues({ under: 'OpEx', maxDepth: 2 })          // a subtree
jirav.readGridValues({ match: /^Revenue$/ })                  // rows by label (string = contains, RegExp = exact control)
jirav.readGridValues({ rowKind: 'account' })                  // only leaf accounts (see Row kinds)
jirav.readGridValues({ from: '2026-04', to: '2026-06' })      // columns whose whole range is inside these months
jirav.readGridValues({ grain: 'month' })                      // drop FY / quarter / range columns
jirav.readGridValues({ kind: 'forecast' })                    // forecast months only (actual | forecast)
jirav.readGridValues({ editable: true })                      // add per-cell editability (plan pages)
jirav.readGridValues({ notes: true })                         // include the Notes column text (report pages)
```

Defaults: `skipHeaders: true` (drop section headings), `skipEmpty: true` (drop rows with no values
in the selected columns: before an edit, read with `skipEmpty: false`, since forecast months are often
blank and the row would vanish). With several grids on one page the result is an array; pick one with
`{ grid: 0 }`.

## Output

```json
{ "context": {"page": "SaaS P&L", "parent": "Monthly Report Package Mar 26", "section": "Reports", "tenant": "…"},
  "columns": ["Jan-26", "Feb-26", "Mar-26", "FY-26"],
  "periods": ["2026-01", "2026-02", "2026-03", "2026-01..2026-12"],
  "kinds":   ["actual", "actual", "forecast", null],
  "grains":  ["month", "month", "month", "year"],
  "sources": ["2026 Rolling Fcst"],
  "attrs": [],
  "rowFields": ["label", "depth", "kind", "type", "attrs", "Jan-26", "Feb-26", "Mar-26", "FY-26"],
  "rows": [["Revenue", 1, "line", "MONETARY", null, 250448, 281205, 218050.66, 2842937]],
  "truncated": {"kept": 5, "total": 57} }
```

- **Columns**
  - `grains`: month, quarter, year, or range. FY and total columns are **not** months; don't
    add them to monthly sums.
  - `kinds`: `actual` or `forecast` per month column, on plan and report pages. It's `null` for
    FY, range and total columns. On report pages: `variance` (Δ), `variancePercent` (% next to a
    Δ, a fraction: −0.11 = −11%) and `percentOf` ("% of Revenue" columns). These carry the same
    `period` as the value columns beside them, and `{kind: 'actual'|'forecast'}` leaves them out.
  - `departments`: appears when columns are departments (e.g. "Income Statement by Dept").
    The `Total` column is marked. Their `periods` are the full range the page covers.
  - `sources`: the plan(s) or scenario(s) the numbers come from. When columns come from
    different sources (e.g. BvA pages: Actuals vs Budget, with the same column label twice),
    `columnSources` gives the source for each column. Columns without a source (Δ, %) are `null`.
- **Row kinds (`kind`)**
  - Plan pages:
    - `account`: a leaf account. Editable per department.
    - `group`: an account that contains other accounts. **Don't sum it with its children.**
    - `driver`: a driver line under an account (its values are part of the account's).
    - `total`: a top-level computed row, e.g. Gross Profit or Operating Income.
    - `line`: other sub-lines, e.g. System Salaries or Manual Input.
  - Report pages:
    - `section`: a row whose values total the rows under it ("Revenue", "OpEx by Department"),
      even when a published pack shows it folded as one row.
    - `subtotal`: "Subtotal …" / "Total …" rows. A section and its subtotal carry the **same** total.
    - `line`: everything else: accounts, KPIs, Gross Margin, Net Income.
    - `header`: a label row with no values (only when headers are included).
    - **Never sum a depth on a report page.** One Executive Summary had Revenue (section) +
      Subtotal Revenue (same 250,448), and OpEx twice (OpEx by Department and OpEx by Acct, both
      180,413) next to KPIs at the same depth. Take a total by label (`match: 'Subtotal OpEx'`,
      `'Net Income'`), or sum `rowKind: 'line'` under one section.
  - For "top expenses" questions use `rowKind: 'account'` (or `'group'` for categories). Empty rows
    are skipped by default, so fewer than N rows means only that many have values: say so.
  - **Locked plans** carry no account tags. `jirav.readGridValues` then infers kinds from structure and adds
    `kindsInferred` to the output. The results matched the tagged kinds in testing, but say so if
    precision matters.
  - **Plan pages repeat earlier sections.** Each income statement page carries the lines above
    it: the Cost of Sales page also lists the Revenue accounts, OpEx shows Gross Profit, and Other
    shows Operating Income. When gathering accounts across pages, read each page's own section
    (`under: '<section label>'`), or de-duplicate by label. For a section total use
    `match` on the page's section label. Don't sum `total` rows.
  - **Rows nest**: `under` returns the account rows and their sub-lines (System Salaries, Manual Input…).
    Don't sum every row: filter by `rowKind` or `maxDepth`.
  - **Labels are the company's own** ("Operating Expenses" in one company, "OpEx" in another). Read
    `{maxDepth: 1}` first to see them; an `under`/`match` that hits nothing comes back with a `note`.
  - **Contra / negative lines** (e.g. "COGS Allocation" inside Payroll Related) are normal. When
    ranking "biggest" lines, rank by value and mention large negative lines separately.
- **`type`**
  - `MONETARY` / `monetary`: currency.
  - `NUMBER:PERCENT2` / `percentage`: a **fraction**. 0.09 = 9%, and −68.79 = −6,879% (values
    can exceed ±1). Custom-table grids take percents typed as whole numbers (9 = 9%): multiply by 100 before
    typing a value back.
  - `NUMBER`: a plain number.
- **`attrs`**: row attributes, e.g. `{ Department: 'All' }` on plan pages.
- **`truncated`**: filters removed rows. It doesn't mean data is missing.

## Size

A full plan page is ~50 KB. Filter to what the task needs; typical filtered reads are 2–5 KB.

## Sanity checks

Before reporting numbers, glance at the totals (`rowKind: 'total'`, or `maxDepth: 0`) for the
same months. Large sign flips or outliers (e.g. Gross Profit −14.8M in a month that's otherwise
~+150K) are worth telling the user about. Say what you saw; don't "fix" it.

## Not covered

- Dashboard tiles (charts) aren't grids. Open the underlying report instead.
- For bulk data or files, prefer the page's **Share & Export**, or the Google Sheets / Excel
  import-export flows.
