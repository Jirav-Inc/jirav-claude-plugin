# Plans

**Scope: per plan.** Finding, opening and reading plans; copying, activating and deleting them; typing values; and
turning Auto-Forecast on or off. Related: [plan-drivers.md](plan-drivers.md), [assumption-values.md](assumption-values.md),
[custom-table-values.md](custom-table-values.md). For
every change, follow **Edits** in SKILL.md.

**Settings:** the company's Auto-Forecast method in [forecast-settings.md](forecast-settings.md); fiscal
year, close month and the Unmapped category in [company-settings.md](company-settings.md).

## Find

```js
await jirav.listPlans()
// [{planId, shortName, name, type, editable, archived, startDate, cutoverDate, endDate, currency}]
```

- `shortName` is what the UI shows ("2026 Rolling Fcst"); `name` is a description (often empty).
- **`planId` is an opaque id, never a name.** Most companies (12 of 16 checked) have one plan
  whose planId is literally `Budget`, usually their first plan, whatever it's called now
  (Auto-Forecast, Trended Forecast, Plan 12/23…). In 4 of them a *different* plan is named
  Budget, so `/plan/x/Budget/…` opened the wrong plan. Match the user's words against
  `shortName` only, take the `planId` from that row, and never build a URL or lookup from a name.
  `listPlans()` adds a `warning` to a planId that reads like a name.
- `type`: `PLAN_OF_RECORD` (often locked) or `ROLLING`. The plan of record can still show `ROLLING`:
  see [Plan of record and other plan facts](#plan-of-record-and-other-plan-facts).
- `editable: false` means **locked: do not edit**.
- `cutoverDate` is the first forecast month; earlier months are actuals. **It is the source of
  truth.** Plan names can mislead ("Rolling Forecast (Jun)" had cutover July).
- **Only active plans are listed.** Archived ones show only in Manage Plans. If the user asks for
  "all plans", say that archived plans aren't included.

Actuals vs forecast months:

```js
await jirav.getPeriods(planId)          // another company: getPeriods(planId, 'company name'); company only: getPeriods(null, name)
// {fiscalYearStartMonth: 'JANUARY', closeMonth: '2026-02',
//  plan: {actuals: ['2024-01','2026-02'], forecast: ['2026-03','2029-12'], editable: true}}
```

`closeMonth` is the company's last closed month. `plan.forecast` starts at the plan's cutover. The
two can differ, sometimes by many months (a plan may not be rolled forward, or the close month may
not be kept up), so say so when it matters.

## Plan of record and other plan facts

Facts for telling plans apart; which plan plays which role is the job skills' call.

- **No budget or forecast object.** Both are ordinary plans; the app doesn't record which is which.
- **Plan of record (PoR)** = the plan reports show as *Current PoR*: the `listReportSources(company)`
  entry with `id: 'por:Current POR'`, whose `pointsTo` is the plan's `shortName`. Ignore other
  `PLAN_OF_RECORD` entries (the plan's own row has its *description* in `pointsTo`, and comes first).
  The PoR is whatever the company chose: a budget, a rolling forecast, or a test plan.
- **Budget imports** go into one plan each and don't mark it as a budget ([imports.md](imports.md)).
- **The Auto-Forecast plan** ("Auto-Forecast", description "Jirav Intelligent Forecast") is created by
  the system; it can cut over at a fiscal-year start and often has the latest `updateTime`.
- **Goals** are company-wide targets with their own report source, not a plan.
- **Not rolled forward:** a rolling plan whose actuals end before the close month.
- **Close month vs actuals:** the close month can lag the actuals loaded in the plans
  ([company-settings.md](company-settings.md), `jirav.getDataStatus()`).

## Open

`/<tenant>/plan/x/<planId>/<page>` (the `x` segment is ignored). `jirav.pageLinks()` lists every
page of the open plan.

| Sidebar label | Page |
|---|---|
| Revenue | `revenue` |
| Cost of Sales | `cogs` (⚠️ not `cost-of-sales`, which redirects to the dashboard) |
| OpEx | `opex` |
| Other | `other` |
| Assets / Liabilities / Equity | `assets` / `liabilities` / `equity` |
| Staffing → All Tables | `staffing` ([staffing.md](staffing.md)) |
| A custom table | `custom/<customTableId>` |

The right-hand toolbar on plan pages has Comments, the **Assumptions** panel (see
[assumption-values.md](assumption-values.md)) and **fx**. The plan header's **Actions** menu has
Auto-Forecast and Add New (Driver, Global Assumption, Custom Table).

## Read

Paste `blocks/grid-values.min.js` (`jirav.readGridValues`, see [reading-grid-values.md](reading-grid-values.md)). Plan grids
are trees, and collapsed children are included in the read. Each row has an `attrs.Department`,
and columns are tagged `actual` or `forecast`.

```js
jirav.readGridValues({ under: 'Payroll Related', from: '2026-01', to: '2026-12' })
jirav.readGridValues({ maxDepth: 1, kind: 'forecast' })
jirav.readGridValues({ match: 'Salaries', editable: true })
```

Row kinds: `account` (leaf), `group` (contains accounts; don't sum it with its children),
`driver`, `total`, `line`. Account rows are totals across departments and read-only. Typed values
sit under them in "Manual Input" rows, one per department (`attrs.Department`).

## Copy, activate, delete

Copy before any large change, and test risky edits on the copy.

1. Plan header → **⌄** next to the plan name → **Manage plans**. The dropdown also lists active
   plans; clicking one **switches** plan. `jirav.menu()` returns the items with coordinates.
2. The plan's **⋯** → **Clone**. The copy is created **immediately**, in **Archived**, named
   `<name>_1`.
3. The copy's **⋯** → **Make Active**, which applies immediately. A company can have at most
   **5 active plans**.
   - **Do this before renaming.** Row ⋯ actions don't apply while the dialog has unsaved edits.
4. *(Optional)* rename it in the Name box → **Save**. ⚠️ **Escape closes the dialog and discards
   unsaved changes.**
5. Get the new `planId` from `jirav.listPlans()`. The UI doesn't show it. Open it with a full navigate (`jirav.go()` to a
   just-activated plan can land on the original).

A copy keeps the original's drivers, typed values and assumption values.

**Delete:** Manage plans → **⋯** → **Delete** → "Are you sure you want to delete this plan? You
cannot undo this action". The confirmation **doesn't name the plan**, so check the Name on the
row whose ⋯ you opened, and confirm afterwards with `jirav.listPlans()`. Only delete plans the
user explicitly asked to remove. Other ⋯ items: Make PoR (Plan of Record, which can't be undone;
don't, without the user) and **Archive** ("may affect reports and dashboard tiles that it
references" → Yes, Proceed). Archive and Make Active apply at once, no Save.

## Periods and Manage Plans columns

Each row in Manage plans has **Actuals Period** and **Forecast Period** pickers (presets: from start
of last / this fiscal year, to end of this / next fiscal year, or Custom Range with year and month).
Moving the actuals end moves the forecast start with it. Apply → "Confirm Plan Date Changes" (may
change reports and dashboards using the plan) → Yes → **Save**. Tested on a copy: actuals to Apr-22
made May-22 a forecast month, and drivers recalculated over it (an Annual Target respread over 8
months). Check with `jirav.getPeriods(planId)`.

- **Auto Roll Forward** (+ Day): rolls the periods forward each month. The toggle is disabled
  unless the plan starts before this month and ends after next month.
- **Plan Details → View**: a hover tooltip (Created, Settings Updated, Content Updated, Archived).
- **Add New Plan**: not tested.

## Type values

Typed values are stored per **account × department**, and only **forecast months** are editable.
System-calculated lines (e.g. "System Salaries" from staffing) aren't editable. Check first with
`jirav.readGridValues({ under: '<account>', editable: true })` and `jirav.getPeriods(planId)`.

1. Open the plan page and expand the account (its ▸) so its **Manual Input** row for the department
   is on screen (`cellPoint` below expands and scrolls for you).
   - No Manual Input row for that department yet? Select the department in the **Department**
     filter above the grid and type into the account row there, which creates it. Then set the
     filter back; it's remembered across plans.
   - An account with a driver isn't editable on its account row, even with the filter set: type
     into its Manual Input row.
2. **Click** the cell (`jirav.readGridValues.cellPoint('<row label>', 'YYYY-MM')` scrolls it into view
   and returns its point), press **Enter** (typing straight away can drop keystrokes), select all,
   type the number, **Enter**. Repeat for more cells. To **clear** a typed value, click the cell and
   press **Delete**.
3. **SAVE** in the bottom bar (CANCEL discards every pending edit). Totals recalculate only after
   saving.
4. Verify: `jirav.readGridValues` shows typed values **before** they're saved, so after SAVE reload
   the page (restore line) and read again. Report old → new values with periods and department.

Pasting a block of cells (Ctrl+C / Ctrl+V) doesn't work from Claude's browser: type cells one at
a time, or import ([imports.md](imports.md)): custom-table lines, or a budget file for typed plan
values. Right-clicking a cell gives Copy, Copy with Headers, Reset Columns and Export
(CSV / Excel; capture first, see [exports.md](exports.md)).

## Auto-Forecast

**On / off is per plan.** Plan → Actions → **Enable / Disable Auto-Forecast** → toggle → SAVE. A
badge shows next to the plan name while it's on. Read it with
`(await jirav.getAutoForecast(planId)).plan.enabled`. Turning it on in one plan doesn't change
any other plan (verified on a copy).

While on, it fills forecast months from history at the **top-level** accounts (an account not in
a group, or the group itself), per department. What happens to what's already there depends on
where it sits (verified on a copy):

- **Top-level account:** the Auto-Forecast row is **added** to typed values and drivers (typed
  1,000 + forecast 500 = 1,500). Turning it on can double-count.
- **Account inside a group:** the group gets the Auto-Forecast row. The accounts' drivers and typed
  values show nothing while it's on. They aren't deleted: turning it off brings them back.
- **System Salaries** are zero while it's on.

It changes Revenue and COGS too. Before turning it on, tell the user which of these applies to the
lines they care about. Drivers: [plan-drivers.md](plan-drivers.md#auto-forecast-and-drivers). The
method and coverage (which accounts and departments) are company-wide:
[forecast-settings.md](forecast-settings.md).
