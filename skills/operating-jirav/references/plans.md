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
  former plans of record), with `type`, `porTime`, `archiveTime`, `editable`, `startDate`, `cutoverDate` and `endDate`:
  an archived plan's periods come from these (`getPeriods` covers active plans only). If the user asks for
  "all plans", say that archived plans aren't included.

Actuals vs forecast months:

```js
await jirav.getPeriods(planId)          // another company: getPeriods(planId, 'company name'); company only: getPeriods(null, name); active plans only
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
  - The PoR is whatever the company chose: usually this year's budget, changed once a year (former
    PoRs are prior budgets); sometimes a forecast or a test plan, or none. A monthly PoR is rare.
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

Read them with `jirav.readGridValues` (see [reading-grid-values.md](reading-grid-values.md)). Plan grids
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
no clone, archive, delete or Make PoR.) `jirav.managePlans` works Manage plans (plan menu ⌄ → Manage plans) as a user
does, from a plan page; a plan is its name or `planId`, archived ones too:

```js
const M = jirav.managePlans
await M.clone('Budget FY26')            // -> {cloned: 'Budget FY26_1', planId, archived: true}  made at once, in Archived
await M.rename('Budget FY26_1', 'Budget FY26 copy')   // the Name box, then the dialog's Save -> {renamed, planId}
await M.activate('Budget FY26 copy')    // Make Active -> {active: true} | {full: true, active: [...]}
await M.archive('Budget FY26 copy')     // -> {asked: 'Archive Plan', warning}: after the user's yes, M.confirm()
await M.remove('Budget FY26 copy')      // -> {asked: 'Delete plan', warning}: after the user's yes, M.confirm()
await M.confirm()                       // Jirav's yes, then read back -> {done: true, archived | deleted}
await M.cancel()                        // the user said no: Jirav's no, the dialog closed
```

- **Clone, rename and Make Active apply at once** (Jirav asks nothing): call them only after the user's yes. Each
  waits until Jirav's plan lists and the dialog show the change, so its result is the check; made again, they say
  `already` / `unchanged` / `alreadyGone`.
- **"A copy named X"** is `clone`, then `rename` of the copy to X. **The copy is archived** (not in reports or the
  plan menu): say so, and if the user will work in it, propose `activate` in the same question (it needs the yes).
- **A company can have at most 5 active plans.** At 5, `activate` returns `{full: true, active}` (Jirav's own
  menu just lacks Make Active): tell the user which plans are active and ask which to archive or delete first.
- **A copy keeps** the original's drivers, typed values and assumption values. Its `planId` is in the result.
  Open it with a full navigate (`jirav.go()` to a just-activated plan can land on the original).
- **A snapshot that stays archived** (month-end close): `clone`, then `rename` it while it's archived, without
  `activate`. The active plans don't change. An archived plan can't be opened or used as a report source (its URL
  lands on another plan; `jirav.go()` refuses it), so read anything you need from it **before** it's archived.
- **Archive** may affect reports and dashboard tiles that use the plan: say so in the question.
- **Before deleting a plan,** check `por:Current POR` → `pointsTo` (`jirav.listReportSources(company)`, see Plan of record above): if it's this plan, reports and tiles using
  Current POR lose their plan. Say so and ask. Jirav can't undo a delete, and its question doesn't name the plan
  (the kit opened it on that plan's row). Only delete plans the user explicitly asked to remove. A plan of record
  can be deleted too.

**Make PoR** (no kit call): Manage plans → the row's ⋯ → **Make PoR**, on an active or an archived row. **There's no
confirmation and it can't be undone:** the row locks at once. Before it, check what Current POR shows now and what
it will show after (see Plan of record above), say so, and get a yes for that click. Rows have no name in `where`:
find the row's ⋯ as the `icon:more` just before the Name box holding the plan's name in `jirav.ui({within: 'dialog:
Manage Plans', offscreen: true})`, and read its menu by label. **Escape** closes Manage plans and discards unsaved
changes.

## Periods and Manage Plans columns

Each row in Manage plans (plan menu ⌄ → Manage plans) has **Actuals Period** and **Forecast Period** pickers.
Moving the actuals end moves the forecast start with it. Move a plan's actuals with `jirav.managePlans`, which works
those controls as a user does:

```js
await jirav.managePlans.periods('Plan 03/22', { actualsEnd: '2025-01' })   // and/or actualsStart; plan by name or planId
// -> {asked: 'Confirm Plan Date Changes', from: ['2020-09','2024-12'], to: ['2020-09','2025-01'], warning}
await jirav.managePlans.confirm()   // after the user's yes: Jirav's Yes, then Manage plans' Save; -> {done, plan, actuals, forecast}
await jirav.managePlans.cancel()    // the user said no: nothing saved
```

Call it from any page of that plan's company that shows the plan menu (a plan page). `periods` stops at Jirav's
question; `{unchanged: true}` when the plan already has those months. **`warning`** is Jirav's own text when the
actuals end moves later: "data you have previously entered into the forecast area [will] be overridden with actuals
data up to <Month, Year>". Tell the user before the yes: moving the end back later doesn't bring those values back;
offer a copy of the plan first. Tested on a copy: actuals to Apr-22 made May-22 a forecast month, and drivers
recalculated over it (an Annual Target respread over 8 months). `confirm()` waits for Jirav to finish recalculating and reads the periods back (as `jirav.getPeriods(planId)`):
its result is the check.

- **An archived plan** (a copy, a snapshot): its periods change the same way and it **stays archived**; don't make it
  active for this. Jirav asks nothing (`asked: null`), so get the user's yes before `periods`, then `confirm()` saves.
- **A plan of record or a former one:** Jirav locks its periods (the pickers are disabled); `periods` says so.

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
System-calculated lines (e.g. "System Salaries" from staffing) and the margin % rows aren't editable.
Before proposing, check the account has no Auto-Forecast or driver adding to what you type (see Auto-Forecast below
and [plan-drivers.md](plan-drivers.md)). Drivers on one account × department, from `jirav.listPlanDrivers(planId)`
(names; `planId` from `listPlans()`): `d.account === account && d.department === department`, or an Allocation
(`ISAllocation`, whose `account` is null) with `d.destination` or `d.source` `.account.name === account &&
.department.name === department` (In adds to the row, Out takes its share of what you type). Or read the page's
driver rows: `readGridValues({under: account, rowKind: 'driver', skipEmpty: false})`, each with its Department. A
driver doesn't make the Manual Input row read-only, so `set`'s `readOnly` doesn't flag it.

The forecast months: `(await jirav.getPeriods(planId)).plan.forecast` → `[first, last]` (`YYYY-MM`).

On **Plan > Revenue, COGS, OpEx or Other**, use `jirav.gridEntry`
(`(await jirav.page()).blocks` names it there). It types a row's months through the grid's own editor in one call, reads each
one back, and saves only when you call `save()`:

```js
const E = jirav.gridEntry;
await E.ready()                       // after the page opens: waits for the grid's rows
E.read(account, department, months?, parent?)
  // -> {row, values: {'YYYY-MM': number | null}, staged: [month]}; null = no value that month; row null + why when
  //    this view has no input row for it (e.g. a department with no values)
await E.set({account, department, values: {'YYYY-MM': number | ''}, parent?})
  // -> {row, staged: [{month, value, was}], unchanged, readOnly: [month], failed: [{month, why, staged?, value?}],
  //     cleared: [month], note?, switchedFilter?: {from, to}, filterRestored?, refused?, stagedBefore?,
  //     unexpectedStaged?, more?, call?}      never saves; one set at a time, and not while a save() runs (it throws)
await E.save()      // only after the user's yes -> {ok, saved: [{month, value}], failed: [{month, value, wanted, why?}],
                    //    errors, filterRestored?} | {ok: false, pending: true, call, why}
await E.cancel()    // the bar's Cancel: every staged cell dropped
```

A page's accounts: `jirav.readGridValues({under: '<section>', rowKind: 'account', skipEmpty: false})` (the section
label, e.g. OpEx, from `readGridValues({maxDepth: 1})`; `rowKind: 'group'` for groups such as Payroll).

**Per edit, one question:**

1. **Read** the current values with `read` (don't ask yet). Values are the stored numbers, decimals included (the
   grid may show them rounded); months don't need to be next to each other.
2. **`set`** once per row with every month. Check `failed` is empty (each entry says why); `readOnly` lists
   months that can't be typed (actuals, calculated cells; skipped, nothing typed). It doesn't flag drivers: check
   them first (above). `unchanged` lists months already at that value (not typed, so a `set` made again types
   nothing twice). `set` starts no new month after about 9 s: the months left come back in `more`, with `call` (the
   `set` for them), to make in the next call. Several rows can be staged, one `set` each,
   before one `save()`: its `saved` and `failed` entries then name each one's account and department. `set`
   returns once the bar's Save is up (it slides up a moment after the last edit), so nothing needs a wait.
   **Save sends every staged cell**, not only this `set`'s:
   - `stagedBefore` (`[{account, department, month, value}]`): cells already staged when `set` ran. Any that no
     `set` of yours staged must be in the question, or `cancel()` first and `set` again.
   - A `failed` entry with `staged: true` is staged at `value`, not the value asked: Save would store it. `set` that
     month again (it stays staged; Jirav never unstages a cell), or `cancel()`.
   - `unexpectedStaged`: cells staged during the `set` that it didn't ask for: `cancel()` and `set` again.
   - `row.path`: the input row isn't directly under the account (the full path of the row typed): name it.
3. **Ask once**, showing account, department, months, `was` → `value` for each staged month, the scope (this plan
   only), any `note` (e.g. a clear that removes the department's Manual Input row) and every other staged cell
   (above).
4. **Their yes → `save()`.** It presses the bar's Save once and waits for Jirav to store and reload the rows.
   Each call returns within about 15 s: while it returns `{ok: false, pending: true, call, why}`, call `save()` again (Save
   isn't pressed again). **Never press Save another way** (`(await jirav.saveBar()).press()`, a click) while a save is pending.
   - `ok: true`: `saved` is read back after Jirav reloaded the rows. A repeat call returns the same result with
     `again: true`.
   - `failed`: the months that didn't store (Jirav's messages in `errors`). "still staged": `save()` again or `cancel()`.
   - `why: 'Save is disabled: …'`: a save or cancel started outside the kit is running, or the kit's own Save that
     `save()` stopped waiting for after 3 minutes (`why` says which): once the bar closes, `read` and `set` again
     if needed. With Cancel enabled, Jirav disabled Save for these edits (from Jirav's code; these grids never do
     it, not seen): `cancel()`.
   - **A no → `cancel()`**: every staged cell is dropped.
5. **Verify** with `read` after `save()`: it reads the rows Jirav reloaded after the save (the same values and totals
   as after a page reload), so no reload is needed. Report old → new with periods and department, and log it with
   these columns (plus `note` if useful; [build-log.md](build-log.md)):
   `await jirav.log({skill: 'operating-jirav', plan, object_type: 'plan-values', object: account, department,
   periods: 'Jun-22..Nov-22', old, new, scope: 'plan', verified: 'pass'})`.

**Put back** what you changed with one `set` of the `was` values (`was: null` → `''`), then ask and `save()` as above;
the put-back is a change too: log it as its own row.

**Clear** a month with `''`. The row reads 0 while staged and empty after Save. When a clear leaves the department
with no values on that account, `note` says its Manual Input row leaves the All view: **say so when asking**. A
month that is already empty is `unchanged` (nothing typed).

**A department with no values on the account** has no Manual Input row in the All view: to find one, take the names
from `jirav.listDepartments()`; `read(account, name)` returns `{row: null, why}` for each. `set` switches the
**Department** filter to it (`switchedFilter`) and types into the account row there, which creates the row;
`save()` or `cancel()` switches the filter back (`filterRestored`); a `set` that staged nothing switches it back
itself. The switch is **refused while edits are staged** (`refused`, `stagedBefore`: nothing typed): save or
cancel them first, so such a row gets its own `set` → question → `save()`. The filter is a button labelled with
its value (`button "All"` in `jirav.ui()`); `E.filter()` reads it and `await E.department(name)` sets it (it
throws while edits are staged or a save runs). It's remembered across plans: leave it as you found it.

`set` throws, before typing, on a month that isn't `YYYY-MM`, a value that isn't a number or `''`, or a label shared
by several rows (pass `parent`, a label above it; the error lists them).

**Other plan pages** (the Balance Sheet pages): click the cell (`jirav.readGridValues.cellPoint('<row label>',
'YYYY-MM')` scrolls it into view and returns its point; for a "Manual Input" row add `{parent: '<account>',
rowDepartment: '<department>'}`), press **Enter** (typing straight away can drop keystrokes), select all, type the
number, **Enter**; **Tab** also commits and opens the next month. Escape on an untouched cell changes nothing. To
**clear** a value, click the cell and press **Delete**. Then **SAVE** in the bottom bar (CANCEL discards every
pending edit). `readGridValues` shows typed values before they're saved: after SAVE reload the page
and read again.

Copying a block of cells in with Ctrl+C / Ctrl+V doesn't work from Claude's browser: type a row with `gridEntry.set`
(or cells one at a time on the other pages), or import ([imports.md](imports.md)): custom-table lines, or a budget
file for typed plan values. Right-clicking a cell gives Copy, Copy with Headers, Reset Columns and Export
(CSV / Excel; capture first, see [exports.md](exports.md)).

## Auto-Forecast

**On / off is per plan.** Plan → Actions → **Enable / Disable Auto-Forecast** → toggle → SAVE (in a narrow pane
the side panel is wider than the screen: take the toggle's point with `jirav.at`, which scrolls it in). A
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
