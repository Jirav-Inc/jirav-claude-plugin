# Plan drivers

**Scope: one plan.** Where: the plan page (an account's or custom line's ⋯ → Add Driver). A plan
driver is a rule that fills forecast months in **this plan only**: a fixed spread, growth, % of
another account, or a formula. Copying a plan copies its drivers. For rules that apply in every
plan, see [global-drivers.md](global-drivers.md).

**Settings:** company-wide date ranges used in driver inputs are in [date-ranges.md](date-ranges.md);
Auto-Forecast hides or adds to plan drivers ([below](#auto-forecast-and-drivers)).

Drivers on the same line **add together**, so check for existing ones before adding. That
includes [GL] global drivers on custom lines. Inputs can use [assumptions](assumption-values.md) and [date ranges](date-ranges.md).
For every change, follow **Edits** in SKILL.md. Offer to try it on a copy of the plan first
([plans.md → Copy](plans.md#copy-activate-delete)); the user may choose the live plan.

## Find

```js
await jirav.listPlanDrivers(planId)            // another company: listPlanDrivers(planId, 'company name')
// [{id, name, type, page, account, department, frequency, start, end, output?, destination?, source?, asset?, inputs, misconfigured}]  output: Balance Sheet drivers' {account, change}  this plan's drivers (no global ones); frequency = every N months from start
```

`account` and `department` are names (the id if Jirav has no name for it). `start` / `end` use Jirav's names for the form's date types: `CUTOVER` =
Cutover Date, `START` = Min Date, `END` = Max Date (a Specific Date is a month). `type` is the internal kind (Fixed Spread = `annual_spread`,
`annual_target`, `capex`…), except Custom drivers, whose `type` is the page (`revenue`, `opex`…). `misconfigured: true` means the
driver isn't producing values; that's often Auto-Forecast (below), so flag it to the user.

`inputs` is the driver's settings as Jirav stores them, with ids; the only names inside it are each input's
`range`: `{rangeId, name}` (e.g. `inputs.formula.operand1.range`; a range Jirav no longer has: `{rangeId, name:
null}`). Beside `inputs`, on the driver itself (an id Jirav no longer has: `{id, name: null}`):
- an Allocation (`type: 'ISAllocation'`) has `destination` / `source` `{account: {id, name}, department: {id, name}}`;
- a CapEx driver has `asset: {id, name}`; the plan's assets themselves: `await jirav.listCapexAssets(planId)`
  ([drivers-overview.md](drivers-overview.md#the-grids));
- a Staffing driver's `department` is the name (its id is `inputs.deptId`; a department Jirav no longer has: `null`).

Everything else in `inputs` stays as ids: an input's account and department (`operand1.dataSelector.filters`:
`{dimId: 'sys:opexAccount', filter: {SingleElement: {elementId: 'ext:3'}}}` is account key 3). Match them with
`jirav.getChartOfAccounts()` (`key`, without `ext:`) and `jirav.listDepartments()` (`id`), or read them as
names in the grid's cells (`driverGrids.rows(type)`, [drivers-overview.md](drivers-overview.md#the-grids)). The
top-level `account`, `department` and `output.account` are names (the id if Jirav has no name for it).

## Add

1. Open the plan page with the account (e.g. `revenue`).
2. Open the form through the screen (Jirav's menus; [navigation.md](navigation.md#working-a-screen)):
   - **An account:** its row's **⋯** → hover the type → **Apply To Department(s)** (search; All, Unassigned, each
     department) → the department. **All creates one driver per department** (there's no single shared driver).
     Use the department the user names; if none, ask (the account's actuals by department are a good hint).
     ```js
     await jirav.click({ label: 'more', where: 'row: Rent' });
     await jirav.click({ label: 'Custom', where: 'menu' }, { hover: true });
     await jirav.click({ label: 'Marketing and Sales', where: 'menu' });
     ```
   - **A custom table line** (the plan's custom table page): its **⋯** lists the types directly: those under
     **Add Driver** add a plan driver; those under **Add Global Driver** a *global* one
     ([global-drivers.md](global-drivers.md)). Both are called "Custom": the first is the plan driver
     (`{label: 'Custom', where: 'menu', nth: 0}`).
   - **The Plan Drivers Page** (`…/drivers`, the plan's fx icon): a section's **Add Driver** (Revenue, COGS, OpEx, Other Income & Expense,
     in that order) → the type. Nothing is prefilled: set `applyTo: ['<account>', '<department>']`.
   - **A Balance Sheet account** (the plan's Assets, Liabilities or Equity page): its row's ⋯ → **Increase Driver** /
     **Decrease Driver** ([below](#balance-sheet-drivers-from-an-account-row)).
   Only the types the account allows are offered: Annual Target · Fixed Spread · Growth on Historicals ·
   Periodic Growth · Amount per Headcount · % of Another Account · Custom.
3. Fill it with [the driver form](#the-driver-form), check `failed`, get the user's yes, then `save()`.
4. A child row per driver (fx icon) appears under the account; verify with `listPlanDrivers` (below).

### The driver form

Every Add Driver, and the formula bar's edit, opens the same form. The `jirav.driverForm` reads it, fills it
through its own controls and saves it with its own Save:

```js
const f = jirav.driverForm;
f.read()          // {open, type, mode: ADD|EDIT, name, applyTo, input1, operator, input2, rounding, frequency, div0, start, end, fields, description, valid}
                  // {open: true, loading: true} while it's still drawing; set() and save() wait for it
await f.set({ name: 'Travel at 1% of revenue', input1: ['Revenue'], operator: '*', input2: 0.01 })
                  // -> {done, failed: [{field, error}], form, more?, call?}   doesn't save; call: the fields not reached yet
await f.save()    // after the user's yes, in its own browser call -> {ok, message: 'New driver(s) created for …'} | {ok: false, why}
                  //    | {ok: false, confirm} | {ok: false, exists, why} | {ok: true, already: true, saved} | {pending: true, call}
```

`save` presses Save once. A new driver (Add or Clone) whose name the plan already has on the same account and
department (a global driver: table and line) is refused (`exists` names it): an earlier Save made it, so check it.
Where the form's targets can't be read (Balance Sheet drivers, whose Output is a data selector, and plan drivers on
custom lines), the check is by name alone: any driver of that name in the plan refuses it. Jirav allows the same
name twice: only if the user wants a second one, `save({sameNameOK: true})` (it overrides either check). A question
Jirav asked is returned again by a repeat `save()`, never answered or Saved twice. Made again after a dropped reply: while Jirav is still saving it only waits
(`pending`: make its `call`), and once the form has closed it reads the driver from Jirav (`already: true`).

`set` (every field optional; one that fails doesn't stop the others):
- `name`; `applyTo: ['<account or table>', '<department or line>']` where the form opens with nothing prefilled
  (the Plan Drivers Page, the Global Drivers Page).
- `input1`, `input2` (Custom): a number is a Constant; `['<name>']` is picked in the
  [variable picker](variable-picker.md) by searching that name, with the picker's defaults: `['Revenue']` is total
  Revenue, every account and department, This Month. `{path, options}` also sets the picker's side panel, e.g.
  `{path: ['Revenue'], options: {Range: 'Last Quarter'}}` or `{path: ['Revenue'], options: {Department: 'This Department'}}` (option keys:
  [variable-picker.md](variable-picker.md#the-kit)). `operator: '+' | '-' | '*' | '/'`.
- `rounding` (as the dropdown lists it), `frequency`, `div0: 'On' | 'Off'`, `start` / `end`: `'Cutover Date'`,
  `'Min Date'`, `'Max Date'`, or `['Specific Date', 2022, 'Jan']`, `description`. More Options is opened as needed.
- `fields: {'<label as the form shows it>': value}`: the type's own controls. A text field is typed, a dropdown
  chosen (the value as listed), a checkbox set (`true` / `false`), an input button picked (a number, a name).
  `read().fields` lists them.

| Type | `fields` (as the form labels them) |
|---|---|
| Annual Target | `Fiscal Year(s)` (All Forecast Years / a year / Custom Range) · `Annual Target` · `Monthly Allocation (adjusted for actuals)` (Evenly split across months / Seasonality of prior year) · `Add Explicit Spend` (checkbox) |
| Fixed Spread | `Fiscal Year(s)` · `Annual Amount` · `Monthly Allocation (unadjusted for actuals)` · `Add Explicit Spend` |
| Growth on Historicals | `Growth Assumptions` (Historical Period Over Period % Change); the base (Same Month Last Year) is a button with its own dialog |
| Periodic Growth | `Growth Assumptions` (Periodic # Increase / Periodic % Increase) · `Enter a number or assumption name` (the increase). "Every N Month(s)" has no label, and the first increase and base are buttons with their own dialogs: set those in the screen |
| Amount per Headcount | `Headcount Department` (All / This Department / one) · `Amount per Headcount` |
| % of Another Account | `Select Input Option` (the account, picked like an input) · `% of Another Account` (type 5 for 5%) |
| Custom | none: `input1`, `operator`, `input2` |

A control the kit doesn't fill (a button with its own dialog) comes back in `failed`: do that step on the screen as
a user would, or tell the user which button is left for them.

`save()` refuses a form Jirav marks invalid (`why: 'form not valid'`, with the form). If Jirav asks something
first, the question comes back unanswered as `confirm: {title, text, buttons}`, e.g. Growth on Historicals in a
plan with too little actuals history: "Are you sure? There is not enough data in the actuals period for
historical calculation…" (Cancel / Continue). Put it to the user; answer with
`jirav.click({label: 'Continue', where: 'dialog: Are you sure?'})` only after their yes to that question.

### Balance Sheet drivers from an account row

An Assets, Liabilities or Equity account's ⋯ → **Increase Driver** / **Decrease Driver** opens the same form
(type `bs-ratio`). Its Apply To is the output, filled from the row (`applyTo: 'Assets ⋄ Computer Equipment ⋄
Increase'`); `set({applyTo})` can't change it (its own dialog). Fill `name`, `input1`, `operator`, `input2` as for
Custom. `listPlanDrivers` shows `output: {account, change: 'increase'|'decrease'}`. On the account page it shows only
as "<Account> (driver)", a line with no menu: edit or delete it in the Plan Drivers Page's Balance Sheet grid
([drivers-overview.md](drivers-overview.md)).

### Which driver for which ask

| The user wants | Driver |
|---|---|
| An annual number, re-spread as actuals come in ("hit 2M this year") | Annual Target |
| An annual number, spread once, ignoring actuals | Fixed Spread |
| "Grow at the historical rate" (needs 2+ years of actuals) | Growth on Historicals |
| Step-ups: "+5% every quarter", "+2k a month" | Periodic Growth |
| A per-employee cost: software, benefits, equipment (New for one-time costs) | Amount per Headcount |
| A cost as a share of another line: payroll tax, commissions, merchant fees, COGS % | % of Another Account |
| A flat amount, "same month last year × 1.1", or any formula | Custom |
| Move or reclass a cost to another account or department (labor to COGS, overhead across departments) | **Allocation**, not Custom drivers ([drivers-overview.md](drivers-overview.md#allocations)) |

- Put any rate the user might change into an [assumption](assumption-values.md), not a constant,
  so a scenario changes one number.
- "X% YoY" is ambiguous: each month = same month last year × (1+X) (the default, keeps
  seasonality, see the example under Verify), an Annual Target of last year × (1+X), or a Periodic
  Growth step every 12 months. Say which you chose.
- Budget wages on top of System Salaries: cancel the salaries with a Custom driver (Staffing →
  Salaries, This Department × −1), recipe in the `budget-import` skill.
- Payroll burden is several drivers: % of Another Account on salaries (tax, bonus) plus Amount per
  Headcount (benefits), with the rates as assumptions.

### Driver types (tested on a plan copy)

Rules below come from live tests and Jirav's own calculation code; help article: [Standard Drivers](https://help.jirav.com/standard-drivers).

| Type | Inputs | Behaviour |
|---|---|---|
| Annual Target | Fiscal Year(s) (All Forecast Years / a year / Custom Range) · Annual Target (the amount) · Allocation (Even split / Seasonality of prior year) · Add Explicit Spend | Spreads what's left of the target over the forecast months, after subtracting **that department's** actuals for the year. 1.2M for FY22 on Unassigned (no actuals) gave 171,428.57 × 7 months. Even split = (target − Explicit Spend months − that year's actuals) ÷ the remaining forecast months; once YTD actuals pass the target, every remaining month is **0** (never negative): say so when actuals are running hot. A typed amount must be above 0 (an assumption can be 0) |
| Fixed Spread | Fiscal Year(s) · Annual Amount · Allocation (Even split / Seasonality of prior year) · Add Explicit Spend | (amount − Explicit Spend) ÷ 12, in forecast months only: it **ignores actuals**, and the shares for months already in actuals are dropped. 12,000 → 1,000 a month; with 2,700 of actuals in Jan–Feb the year ends at 12,700, not 12,000. A typed amount must be above 0 |
| Growth on Historicals | Growth type (Historical Period Over Period % Change) · Base: Same Month Last Year / Last Year (Full Year) / Constant | Needs two years of history. Without it, a confirm dialog warns; Continue saves with 0% growth, so each month repeats the same month last year. Growth = (last year's total − the year before's) ÷ the year before's (12,000 vs 10,000 = 20%), applied to the base: Feb last year 1,200 → 1,440. It's 0% if either year starts before the plan does. Base Last Year (Full Year) adds an Allocation (Even / Seasonality) |
| Periodic Growth | Periodic # or % Increase · "Increase by X every N Month(s)" · first increase: In Forecast / Relative Month / Specific Month · Base: Actuals (last month, last 3/6/12 avg, last quarter/half, since last year, this year) / Constant / Custom | Steps count from the last actual month: 10% every 3 months on a 2,600 base gave 2,600 Jun–Jul, 2,860 from Aug, 3,146 from Nov |
| Amount per Headcount | Amount · Cumulative or New headcount · Headcount Department (All / This Department / one) | 100 × headcount, per department (24 staff → 2,400). The amount can be an assumption |
| % of Another Account | Select Account (account + department, "This …" allowed) · percentage (type 10 for 10%) · optional Create Assumption | 10% of Revenue → COGS = 10% of that month's revenue |
| Custom | Input 1 · fx (+ − × ÷) · Input 2; each input an account, headcount, custom line, assumption or constant ([variable picker](variable-picker.md)) | A flat amount = Constant × Constant 1 (verified). Div/0 (default On: ÷ 0 gives 0) handles ÷ 0. Example: Advertising = Revenue (This Department) × an assumption |

### Driver inputs

Each input is chosen in the [variable picker](variable-picker.md).

## Edit or delete

1. Select the driver's row so the **Formula** bar holds it:
   `await jirav.driverForm.selectRow('<driver name>', {account: '<its account>', department: '<its department>'})`
   → `{ok, driverId, account, department}`. Names repeat (one driver per department): with several rows of that
   name it needs `department` or `id` (from `listPlanDrivers`) and refuses otherwise. Check `driverId` is the
   driver the user approved before Edit or Delete. (A row that already has focus, as a new driver's row has after
   saving, doesn't load the bar when clicked again; this handles it.) ⚠️ Rows labelled **[GL]** are global drivers: edit and delete there change them **for every plan**
   (see [global-drivers.md](global-drivers.md)).
2. **Edit:** `jirav.click({label: 'edit', where: 'formula: <driver name>'})` opens the same form (`mode: 'EDIT'`,
   "Edit This Driver"). `set` only what changes (the rest keeps its values), then `save()` → "Driver updated".
   The **type can't be changed** (the edit form shows it read-only): to switch (say Growth on Historicals →
   Amount per Headcount), delete the driver and add a new one. Propose both steps together.
3. **Delete:** `jirav.click({label: 'delete', where: 'formula: <driver name>'})` → "Delete Driver: Are you sure…?"
   → `jirav.click({label: 'Yes', where: 'dialog: Delete Driver'})`. Verify with `listPlanDrivers`, and wait for the
   row to leave the grid before clicking in it again (Jirav redraws it).

A driver's type can't be changed: delete it and add a new one. The row's **⋯** also has Edit
Driver, Clone Driver, Clone, Clone To and Delete Driver. *(help)* **Clone Driver** copies it onto
the same account and department (edit the copy afterwards); **Clone Driver To** opens a New Driver
form with the settings filled in and **Apply to Account(s) & Department(s)** empty. Double-clicking
a driver row also opens Edit. The edit form's **Edit All Drivers With Same Inputs** toggle applies
the change to every driver with identical inputs: leave it off unless the user means all of them.
Several driver rows can be selected and deleted together. Many drivers at once: one Add Driver with
several accounts or departments in **Apply to**.

Several drivers on one line **add up**, including [GL] global drivers (plan 5 + global 7 = 12,
verified).

## Auto-Forecast and drivers

If Auto-Forecast is on for the plan and covers the account ([plans.md → Auto-Forecast](plans.md#auto-forecast)):

- **Inside a group:** the drivers stay, but produce nothing (`misconfigured: true` in
  `jirav.listPlanDrivers`); the group's **Auto-Forecast** line supplies the values.
- **On a top-level account:** typed values stay and the Auto-Forecast line is added to them.
  Drivers there may stop (`misconfigured: true`) or keep counting; both have been seen. After
  turning it on, read `misconfigured` for each driver on the lines the user cares about.
- While it's on, the account rows have no **⋯** menu (Actions → Add New → Driver still shows).

Turning Auto-Forecast off for the plan brings the drivers back (values identical to before,
verified). So before adding a driver, check `(await jirav.getAutoForecast(planId)).plan.enabled`.
If it's on, ask the user whether to turn it off for this plan, or to switch the account off in the
company's Custom Auto-Forecast settings, which keeps the account's drivers working
([forecast-settings.md](forecast-settings.md); company-wide: every plan with Auto-Forecast on).

## Drivers that read their own line

A driver whose input is the line itself over a past range (`@type: "output"` in
`jirav.listPlanDrivers`, picker → Driver Logic → Output, or the same account; range Last Month,
T3M / T6M average) feeds on everything else on that line. **Anything you add there keeps growing**:
600 typed once into a line driven by its own T6M average raised the next seven months by about
1,066, still rising. A monthly addition (CapEx amortization, an Allocation In, typed values)
compounds faster. Before sending an amount into an account, check its drivers for this; if found,
tell the user and offer another account or changing that driver. After the change, read 6+ months
ahead: a line that keeps rising is this.

## Verify

Re-read the account with `jirav.readGridValues({ match: /^<Account>$/, from, to })`. Hand-check at least
two forecast months against the driver's logic, and check `jirav.listPlanDrivers(planId)` for the
inputs and `misconfigured` flags. Report old → new values.

**Example (tested on a plan copy): grow revenue 10% on the same month last year.**

- Custom driver on Subscription Revenue, departments All.
- Input 1 = Revenue · This Revenue Account · This Department · range "this month last year".
- × Input 2 = an assumption set to 1.1.
- Result: Jun-22 = Jun-21 84,800 × 1.1 = 93,280. Jul-23 = 102,608, so it compounds on the prior
  forecast year.

## Plan Drivers Page

Balance Sheet, CapEx, Allocation and Staffing drivers live in inline grids on the Plan Drivers Page: see
[drivers-overview.md](drivers-overview.md).

## Not yet covered

- Custom-table and KPI-based driver inputs (Constant, account elements and Output are covered).
