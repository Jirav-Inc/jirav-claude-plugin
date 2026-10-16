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
// [{planId, shortName, name, type, editable, archived, startDate, cutoverDate, endDate, currency, autoRollForward, autoForecast, porTime}]
```

- `shortName` is what the UI shows ("2026 Rolling Fcst"); `name` is a description (often empty).
- **`planId` is an opaque id, never a name.** Most companies (12 of 16 checked) have one plan
  whose planId is literally `Budget`, usually their first plan, whatever it's called now
  (Auto-Forecast, Trended Forecast, Plan 12/23…). In 4 of them a *different* plan is named
  Budget, so `/plan/x/Budget/…` opened the wrong plan. Match the user's words against
  `shortName` only, take the `planId` from that row, and never build a URL or lookup from a name.
  `listPlans()` adds a `warning` to a planId that reads like a name.
- **A name that matches no plan exactly** ("our Rolling Forecast" when the plan is "2026 Rolling
  Fcst"): match loosely (case, abbreviations such as Fcst, a year), and for role words ("the budget",
  "the forecast") use [plan-roles.md](finance/plan-roles.md). Say which plan you
  picked and why; if more than one fits, ask.
- `type`: `PLAN_OF_RECORD` (often locked) or `ROLLING`. The plan of record can still show `ROLLING`:
  see [Plan of record and other plan facts](#plan-of-record-and-other-plan-facts).
- `editable: false` means **locked: do not edit**. A locked plan of record shows **PoR** and **View**
  tags by its name, no Actions button and no row ⋯ menus, and no cell is editable (seen).
- `cutoverDate` is the first forecast month; earlier months are actuals. **It is the source of
  truth.** Plan names can mislead ("Rolling Forecast (Jun)" had cutover July).
- **Subscription:** `await jirav.getSubscription()` → `subscription`: **Controller Essentials** (2 plans,
  e.g. Auto-Forecast and a budget; no clone, archive, delete or Make PoR, no row ⋯ in Manage Plans, no
  Assumptions or fx) or **CFO** (up to 5 active plans plus archived ones). Decide from that value, not
  from what the page shows.
- **Only active plans are listed.** Archived ones: `await jirav.listArchivedPlans()` (snapshots,
  former plans of record, with `type` and `porTime`). If the user asks for
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
  How Jirav picks it (tested, and in the app source):
  - Current POR = the **active** plan of type `PLAN_OF_RECORD`. **An archived PoR doesn't count.**
  - No active PoR (11 of 16 companies checked; Manage Plans shows "POR (0)") → Jirav **auto-picks** an
    active plan: latest cutover, then latest end, then most recently updated.
  - **Make PoR** on any plan turns the current PoR into a *former* PoR (`FORMER_PLAN_OF_RECORD`, still
    locked). So if the company's active PoR is its budget, a new PoR anywhere moves Current POR off
    the budget (to the new PoR if it's active, else to the auto-pick). One company makes each year's
    budget the PoR and archives the old ones as former PoRs.
  - The PoR is whatever the company chose: often the budget, sometimes a forecast or a test plan.
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

Copy before any large change, and test risky edits on the copy. (CFO only: Controller Essentials has
no clone, archive, delete or Make PoR.)

1. Plan header → **⌄** next to the plan name → **Manage plans**. The dropdown also lists active
   plans; clicking one **switches** plan. `jirav.menu()` returns the items with coordinates.
2. The plan's **⋯** → **Clone**. The copy is created **immediately**, in **Archived**, named
   `<name>_1`.
3. The copy's **⋯** → **Make Active**, which applies immediately. A company can have at most
   **5 active plans**. **At 5 the cap is silent:** Make Active is simply missing from archived rows'
   menus and Add New Plan is greyed out; the only hint is "(5 of 5)" by the Active heading. Tell
   the user which plans are active and ask which to archive or delete first.
   - **Do this before renaming.** Row ⋯ actions don't apply while the dialog has unsaved edits.
4. *(Optional)* rename it in the Name box → **Save**. Typing appends to the old name: select the field's
   text first (`input.select()` on the focused field), then type. ⚠️ **Escape closes the dialog and
   discards unsaved changes.**
5. Get the new `planId` from `jirav.listPlans()`. The UI doesn't show it. Open it with a full navigate (`jirav.go()` to a
   just-activated plan can land on the original).

A copy keeps the original's drivers, typed values and assumption values.

**A snapshot that stays archived** (month-end close): Clone (step 2), then rename it **in the Archived
section** and Save, without Make Active. The active plans don't change. Check it with
`listArchivedPlans()`. An archived plan can't be opened or used as a report source (its URL lands on
another plan; `jirav.go()` refuses it), so read anything you need from it **before** it's archived.

**Make PoR:** the row's ⋯ → **Make PoR**, on an active or an archived row. **There's no confirmation
and it can't be undone:** the row locks at once. Before it, check what Current POR shows now and what
it will show after (see Plan of record above), say so, and get a yes for that click.

**Which row a menu belongs to:** active rows' menus have **Archive**, archived rows' **Make Active**
(under the cap); check the Name next to the ⋯ you clicked. **Escape** closes Manage plans but can
leave an open row menu floating over the page: reload if one stays on screen.

⚠️ **Near the bottom of the dialog the row ⋯ menu opens upward**, and its **Delete** item can sit right
where the ⋯ was. Read the menu (`await jirav.menu.settled()`) and click items by label, never at the
⋯'s own position.

**Before deleting a plan,** check `por:Current POR` → `pointsTo`: if it's this plan, reports and
tiles using Current POR lose their plan. Say so and ask.

**Delete:** Manage plans → **⋯** → **Delete** → "Are you sure you want to delete this plan? You
cannot undo this action". The confirmation **doesn't name the plan**, so check the Name on the
row whose ⋯ you opened, and confirm afterwards with `listPlans()` / `listArchivedPlans()` (both
counts). A plan of
record can be deleted too. Only delete plans the user explicitly asked to remove. Other ⋯ items:
**Archive** ("may affect reports and dashboard tiles that it references" → Yes, Proceed). Archive and
Make Active apply at once, no Save.

## Periods and Manage Plans columns

Each row in Manage plans has **Actuals Period** and **Forecast Period** pickers (presets: from start
of last / this fiscal year, to end of this / next fiscal year, or Custom Range with year and month).
Moving the actuals end moves the forecast start with it. Apply → "Confirm Plan Date Changes" (may
change reports and dashboards using the plan) → Yes → **Save**. Tested on a copy: actuals to Apr-22
made May-22 a forecast month, and drivers recalculated over it (an Annual Target respread over 8
months). Check with `jirav.getPeriods(planId)`.

- **Auto Roll Forward** (+ Day): rolls the periods forward each month, on that day (not on the close
  month). `listPlans()` shows `autoRollForward`. The toggle is disabled unless the plan starts before
  this month and ends after next month.
- **Plan Details → View**: a hover tooltip (Created, Settings Updated, Content Updated, Archived).
- **Add New Plan** (CFO): adds a blank row; nothing is created until **Save**, which needs a name.
  Defaults: actuals from the start of last year through last month, forecast from this month to the
  end of next year (tested: Jan-25–Sep-26 / Oct-26–Dec-27). Set the periods with the pickers before
  Save. It creates an empty `ROLLING` plan (counts toward the 5 active).

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
   and returns its point; for a "Manual Input" row add `{parent: '<account>', rowDepartment: '<department>'}`), press **Enter** (typing straight away can drop keystrokes), select all,
   type the number, **Enter**. Repeat for more cells. **Tab** also commits, and opens the next
   month, so a row can be typed in one pass; Escape on an untouched cell changes nothing. To **clear** a typed value, click the cell and
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

- **Top-level account:** the Auto-Forecast row is **added** to typed values (typed
  1,000 + forecast 500 = 1,500). Turning it on can double-count. Drivers there may stop or keep
  counting: see [plan-drivers.md](plan-drivers.md#auto-forecast-and-drivers).
- **Account inside a group:** the group gets the Auto-Forecast row. The accounts' drivers and typed
  values show nothing while it's on. They aren't deleted: turning it off brings them back.
- **System Salaries** are zero while it's on.

It changes Revenue and COGS too. Before turning it on, tell the user which of these applies to the
lines they care about. Drivers: [plan-drivers.md](plan-drivers.md#auto-forecast-and-drivers). The
method and coverage (which accounts and departments) are company-wide:
[forecast-settings.md](forecast-settings.md).
