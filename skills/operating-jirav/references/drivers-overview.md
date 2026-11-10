# Plan Drivers Page: Balance Sheet, CapEx, Allocations, Staffing

**Scope: this plan only.** The **Plan Drivers Page** (`…/drivers`; the plan's **fx** icon in the right rail opens it). Account drivers
(add, inputs) are in [plan-drivers.md](plan-drivers.md), inputs via the [variable picker](variable-picker.md); test on a plan copy
([plans.md](plans.md#copy-activate-delete)).

Which family (uses from Jirav's [Driver Overview](https://help.jirav.com/plans/drivers)):

| The user wants | Family | Where |
|---|---|---|
| Revenue, COGS, OpEx or a custom line from a rule (units × price, % of revenue, a target) | Standard plan driver | [plan-drivers.md](plan-drivers.md) |
| A balance that moves with activity (AR up by invoices, down by collections) | Balance Sheet | below |
| A shared cost spread across departments (facilities by headcount) | Allocation | below |
| A cost moved to another account or department (labor to COGS, a reclass) | Allocation | below |
| An asset bought and amortized (laptops for new engineers) | Prepaids & CapEx | below |
| Headcount that grows with the business, by role, not hire by hire (support reps per customer) | Staffing | [staffing.md](staffing.md#change) |
| A KPI formula that never changes between plans (EBITDA) | Global driver | [global-drivers.md](global-drivers.md) |

The page lists every plan driver by section, each with Add Driver / Add Asset. Global drivers aren't listed. Driver
names are cut to 40 characters. Revenue, COGS, OpEx, Other Income & Expense and Custom Lines drivers are made and
changed in [the driver form](plan-drivers.md#the-driver-form). The other sections are **inline grids**, filled with
`jirav.driverGrids` ([below](#the-grids)):

| Section | What it does |
|---|---|
| Balance Sheet | An Output (a BS account + Increase / Decrease) moved by Driver fx Rate. Adds "<Account> (driver)" lines that add to the system line. **Frequency N = every N months from Start**: a quarterly payout from Jul is Frequency 3, Start Jul; "annually in March" is Frequency 12, Start the first March, End Max Date. Row ⋯ → Edit Driver does nothing visible here: change a saved row in the grid (`set`) |
| Prepaids & CapEx Assets | An asset is a template with no date: nothing happens until a CapEx driver buys it. Monthly Amortization = (Cost − Residual) ÷ Amort Period per unit, starting after Amort Delay months (app source). **Dispose Asset** is a yes/no column (default no): yes books the amortized value off the asset at end of life. *(help)* When the Amort Period ends, the forecast gets a reversing entry that nets the accumulated depreciation against the asset (no cash effect) |
| Prepaids & CapEx Drivers | Buys an asset. Check the Expense Account's drivers first ([plan-drivers.md](plan-drivers.md#drivers-that-read-their-own-line)). **Incremental** = units bought: 1 a month × a 12,000 asset over 12 months gave +12,000 a month on the asset account and 1,000, 2,000, 3,000… amortization. **Balance** treats the driver as the total units owned: each month buys only the increase over the highest total so far (a drop removes nothing), so it doesn't count assets bought before (app source). Computer per hire: Driver `operand1: 'Headcount New'` (every department's new hires; one department's: `{path: ['Headcount New'], options: {Department: '<department>'}}`) × 1 |
| Allocations | Allocation Ratio × the Out line (or the Amount) moved to the In account and department. Adds a driver line per department under the account. Ratio 0.5 of Rent G&A moved 1,300 to M&S and −1,300 from G&A; the total is unchanged. Works between accounts too (OpEx → COGS). See [Allocations](#allocations). *(help)* One driver per receiving department, ratio e.g. the KPI Library's headcount distribution. **Not allowed between a Revenue and an Expense account** (Jirav refuses it) |
| Staffing | Driver-based hires: see [staffing.md](staffing.md#change) for how hires are worked out |

## The grids

Use `jirav.driverGrids` on the Plan Drivers Page (or the Global Drivers Page, or a
plan's Staffing page: [staffing.md](staffing.md#change); on any other page every call refuses). The kit works each cell through its own editor (typed, a list's choice, the Start / End
month dialog, the [variable picker](variable-picker.md)) and reads every value back from the grid. Each write is its
own browser call: `add`, then `set`, then (after the yes) `remove`. Each one checks first what the grid already holds,
so making it again after a dropped reply does nothing twice.

```js
const G = jirav.driverGrids;
G.sections()                // [{type, name, rows, form?}]  the grids on this page; form: made in the driver form
G.rows(type)                // [{index, name, id, newRow, misconfigured, missing, invalid?, cells: {field: shown value}}]
await G.add(type, {name})   // the section's own Add Driver / Add Asset, its Name typed -> {index, name, existed, expanded?}: a new
                            // row, not saved yet. An unsaved row with that name: returned as it is (existed: true). A SAVED
                            // driver with that name: refused {ok: false, exists: {id, name}, why}
await G.set(type, row, spec)   // row: its name (unique), index or {id}; spec: {field: value}
                            // -> {done, failed: [{field, error}], missing, id, saved, row, unchanged?, unchecked?, toggled?, expanded?,
                            //     waitsForSaveChanges? (an asset), more?, call?, pending?, errors? (Jirav's error messages, closed)}
await G.remove(type, row)   // row: its name or {id} (never an index) -> {asked: 'Delete Driver'} | {waitsForSaveChanges: true} (an asset)
                            //    | {alreadyGone: true} (no such row: deleted already)
```

**Per row:** propose it, and after the user's yes `add(type, {name})`, then in the next call one `set` by that name
with every field. `add` refusing with `exists` (a saved driver of that name): if your own earlier `add` + `set`
made it, it's done (check `rows()` against what you set); otherwise it may be the customer's, so never `set` it
without the user's word: pick another name. `set` starts no new cell after about 8 s: the fields it didn't reach come back in `more`, with `call`
(the same `set` for the rest), to make in the next call until a result has no `call`; `pending: true` means it stopped
waiting for Jirav (a save, the recalculation) and the call waits first. Then check:
- `failed` is empty. Each entry says why: no such column, an option that isn't a column ("Frequency is not a
  column here: set it in the Output picker's options"), a value Jirav works out, a Name over 40 characters, a
  choice that isn't listed. "Jirav marked the row invalid and did not save it" means Jirav refused the value
  (an End before the Start, or its server rejected the change, e.g. a circular reference: a driver whose Driver
  is its own Output account in the same month): the saved driver keeps its earlier value. Fix the value and `set`
  it again. A saved row's change counts as done only once Jirav has answered its save.
- `missing` is empty and `saved: true` with an `id`. Jirav saves a new row once every required field is
  filled, and each later change at once. `missing` lists the required fields still empty: the row isn't saved.
- `unchanged` lists fields whose cell already held the value asked (e.g. a new row's Start Cutover Date, End
  Max Date, or a value an earlier call set): left as they were, their editor not opened. A picker value with
  options is always set.
- `unchecked` (picker options the kit couldn't read back from the saved driver): check them in
  `listPlanDrivers`. `toggled` (list cells whose list opened closed and was opened again) is only a note, as is
  `expanded` (the section was collapsed: `add`, `set` and `remove` expand it with its title, as a user does).
- `add` uses only the section's own Add button; without one it refuses and says why.
- `row.cells` shows what each closed cell shows (`'Constant ⋄ 2'`, `'Headcount New ⋄ Research and Development'`,
  the operator as `plus` / `minus` / `multiply` / `divide`). Read the rest with `jirav.listPlanDrivers(planId)`
  ([plan-drivers.md](plan-drivers.md#find)) and log it.

These checks verify the driver's **settings** as Jirav saved them (`set`'s result, `listPlanDrivers`,
`listCapexAssets`), not the numbers it produces. For the numbers, read the account it writes to on its plan page
with `readGridValues` ([reading-grid-values.md](reading-grid-values.md)), e.g. a Balance Sheet driver on the
Liabilities page: `readGridValues({under: '<account>'})` lists "<Account> (driver)" (the drivers' running balance),
"Increase (driver)" / "Decrease (driver)" (each month's movement) and a row per driver. Hand-check a few months
against the rule, as in [plan-drivers.md → Verify](plan-drivers.md#verify).

`set` never deletes. A row left with `missing` or a failed field is the caller's to finish (`set` again) or
remove. Rows are found by name; two rows with one name need `{id}` (the error lists the ids). A Staffing row
whose name was cleared has `name: null`: use its index or `{id}`.

**Values**, by the cell's editor:

| Editor | Value |
|---|---|
| Text | A string or number, typed |
| List | The label as listed (`'Incremental'`, `'Round Up'`, `'Research and Development'`, an asset's name). The operator: `'+'`, `'-'`, `'*'`, `'/'`. Div/0: `'On'` / `'Off'` |
| Month (Start, End) | `'Cutover Date'`, `'Min Date'`, `'Max Date'`, or `['Specific Date', 2022, 'Jul']` |
| Picker | A number (a Constant), a name (`'Revenue'`), a path (`['OpEx', 'Bonus']`), or `{path, options}` ([variable-picker.md](variable-picker.md#the-kit)) |

**Fields** (`type`; required in bold; the grid's own field names, as `rows().cells` shows them):

| Section (`type`) | Fields | Picker options |
|---|---|---|
| Balance Sheet (`bs-ratio`) | `name`, **`allocation`** (Output), **`operand1`** (Driver), `operator` (default ×), **`operand2`** (Rate, default Constant 1), `divByZeroAsZero`, **`start`** (default Cutover Date), **`end`** (default Max Date), `description` | `allocation`: `Change` (`'Increase'` / `'Decrease'`), `Rounding`, `Frequency`. Rounding and Frequency aren't columns: they're in the Output picker's Driver Options. `operand1`, `operand2`: `Department`, `Range`, `Reduction` |
| Prepaids & CapEx Assets (`sys:capexAssets`) | **`sys:displayedName`** (Name), **`cus:assetAccountId`**, **`cus:assetContraAccountId`**, **`cus:expenseAccountId`**, **`cus:expenseDepartmentId`** (accounts and department by name), **`cus:amortPeriod`** (months), **`cus:assetCost`**, **`cus:residualValue`** and **`cus:amortDelay`** (Jirav fills 0). Amortized Value and Monthly Amortization are worked out; Dispose Asset is a checkbox the user ticks | none |
| Prepaids & CapEx Drivers (`capex`) | `name`, **`assetId`** (the asset's name), **`seriesType`** (Output Type: `'Balance'` / `'Incremental'`), **`operand1`**, `operator`, **`operand2`**, `divByZeroAsZero`, `frequency`, **`start`**, **`end`**, `description`. Round lists no choices here | `operand1`, `operand2`: `Department`, `Range`, `Reduction` |
| Allocations (`ISAllocation`) | `name`, **`destination`** (Allocation In: account + department receiving), **`source`** (Allocation Out: account + department giving), `amount`, **`ratio`** (Allocation Ratio), **`start`**, **`end`**, `description` | `destination`: `Department`, `Offset`. `source`: `Department`. `amount`: `Range`, `Reduction`. `ratio`: `Range` |
| Staffing (`staffing`) | `name` (new rows: "Staffing Driver #n"), **`deptId`** (Department), **`role`**, **`annualWages`** (Jirav fills 0), **`operand1`**, `operator`, **`operand2`**, `roundingMode` (`'Round'` / `'Round Up'` / `'Round Down'`), `divByZeroAsZero`, `frequency`, **`start`**, **`end`**, `description` | `operand1`, `operand2`: `Department`, `Range`, `Reduction` |

The form sections (`revenue`, `cogs`, `opex`, `otherIE`, `customLines`) are listed by `rows()` and removed with
`remove`; `add` and `set` refuse them, naming the driver form.

**Assets** wait for **SAVE CHANGES**: `set` returns `waitsForSaveChanges: true`, `saved: false` and no `id`. After the user's
yes, `await (await jirav.saveBar()).press()`; the asset then has its id. Read assets as saved with
`jirav.listCapexAssets(planId)` (`[{id, name, assetAccount, contraAccount, expenseAccount, department,
amortPeriod, cost, residual, amortDelay, ids}]`, names, with the raw ids in `ids`). While an asset change waits,
the CapEx Drivers' Add Driver is disabled: save the asset first, then add its driver.

**Remove** (only after the user's yes for that delete):
- A driver: `remove` (by name or `{id}`) → `{asked: 'Delete Driver'}`. Jirav's question is left open: answer it
  with `jirav.click({label: 'Yes', where: 'dialog: Delete Driver'})` in the next call, then check the id is gone
  from `listPlanDrivers`. Jirav asks this for a new row that was never saved too. `{alreadyGone: true}`: no such
  row (deleted already, or check the name); `{alreadyAsked: true}`: the question is already open.
- An asset: `remove` → `{waitsForSaveChanges: true}`. Delete Asset asks nothing: the row leaves the grid and
  `await (await jirav.saveBar()).press()` deletes it. Check with `listCapexAssets`.

## Accrue, then pay (bonus, commission)

Two Balance Sheet drivers on one liability, both reading the **expense line**,
never the liability itself (a driver reading its own line compounds); this is Jirav's own recipe
([Plan for Accrued Bonuses](https://help.jirav.com/plan-for-accrued-expenses)). In the Output picker
the Increase / Decrease choice is labelled **Measure Type** (`Change` in the kit):

Four browser calls, one write each (make any `call` a result returns before the next):

```js
// 1
await jirav.driverGrids.add('bs-ratio', { name: 'Accrue bonus' });
// 2
await jirav.driverGrids.set('bs-ratio', 'Accrue bonus', {
  allocation: { path: ['<liability>'], options: { Change: 'Increase', Frequency: 1 } },
  operand1: { path: ['OpEx', 'Bonus'], options: { Range: 'This Month' } }, start: 'Cutover Date' });
// 3
await jirav.driverGrids.add('bs-ratio', { name: 'Pay bonus' });
// 4
await jirav.driverGrids.set('bs-ratio', 'Pay bonus', {
  allocation: { path: ['<liability>'], options: { Change: 'Decrease', Frequency: 3 } },
  operand1: { path: ['OpEx', 'Bonus'], options: { Range: 'Last Quarter', Reduction: 'Sum' } },
  start: ['Specific Date', <year>, '<first payout month: Jan, Apr, Jul or Oct>'] });
// each set: failed [], missing [], saved: true; listPlanDrivers: output {account, change}, frequency
```

**Which liability:** use the one the user names. If the chart of accounts has no dedicated one (no "Accrued
Bonus" among the liabilities: `jirav.getChartOfAccounts()`), ask which existing liability to use (e.g. Accrued
Salaries and Wages) or whether they want a new account; adding an account is the user's decision and is done in
the chart of accounts ([chart-of-accounts.md](chart-of-accounts.md)), not by the kit on its own.

**Line up the start dates.** The accrual starts at the Cutover Date. The first payout pays its range (Last
Quarter: the three months before it), so pick its Start so that range begins exactly at the Cutover Date: with
quarterly payouts and a cutover at a quarter's start, Start = the cutover + 3 months. Otherwise (the cutover in
the second or third month of a payout period) no Start lines up; say so and ask the user:
- The payout right after that period also pays the period's actual months, which the accrual never booked, so
  the drivers' balance goes below zero by that amount. Right only if the books already hold that expense in the
  liability's actual balance.
- The following payout leaves the accruals from the cutover to the start of its range unpaid in the drivers'
  balance.

The Rate stays Constant 1 (×). Ranges in a driver count from the month being calculated: a payout in January is
October–December's expense (verified: each quarterly payout equalled the three accruals before it, including
months with different amounts). The expense itself comes from its own driver (e.g. % of salaries) on the OpEx
Bonus line. For another schedule (e.g. "pay every March and September"), set Frequency to the months between
payouts and pick a range covering the months since the last payout; check the first payouts against the
accruals after saving (only the quarterly version is verified).

## Allocations

- **Amount** blank: the ratio applies to the Out line's own value. Set: the ratio applies to that
  base instead (e.g. Staffing → Salaries).
- **Moving wages out of the wage line lowers the burden on it.** "% of Salaries" drivers (taxes,
  bonus) follow the reduced line and don't move with the cost: 25% of G&A wages to COGS cut those
  drivers by 25% and raised operating income. Say so in the proposal.
- **Check the In account's drivers** for ones that read their own line ([plan-drivers.md](plan-drivers.md#drivers-that-read-their-own-line)): they grow what you move in.
- **Check existing Allocations first** and follow the company's pattern. A common one: Out = a
  contra account ("COGS Allocation", "Facilities Allocation"), Amount = the base (Salaries,
  Building Rent), so the source line and its burden stay whole.
- In / Out are pickers ("Select To Where Money is Allocated" / "Select From Where Money is Taken"): the
  account by name, its department as the `Department` option. 25% of Rent moved from G&A to M&S:
  Two browser calls:
  ```js
  // 1
  await jirav.driverGrids.add('ISAllocation', { name: 'Rent share M&S' });
  // 2
  await jirav.driverGrids.set('ISAllocation', 'Rent share M&S', {
    destination: { path: ['Rent'], options: { Department: 'Marketing and Sales' } },
    source: { path: ['Rent'], options: { Department: 'General and Administrative' } }, ratio: 0.25 });
  ```
  `listPlanDrivers` names both ends: `destination` / `source` `{account: {id, name}, department: {id, name}}`.
- **Offset** (default 0) is in the Allocation In picker's Driver Options (collapsed): set it as the
  `destination`'s option, `{path: ['Rent'], options: {Department: 'Marketing and Sales', Offset: 1}}`; saved as
  `inputs.offset`.

Start Date **Min Date** makes a driver calculate over the actual months too where there are no
actuals (a custom-line driver filled Jan-21 onward). **It doesn't override imported actuals**: on an
account with actuals, the actual months keep them and the driver adds only from the cutover
(verified on a plan copy).

**Before building on an expense line** (a Balance Sheet driver such as a bonus accrual, or an
Allocation's Amount): read that line by department over the forecast months
(`readGridValues({under: '<account>'})`) and flag zeros, negatives or sudden drops. An earlier
Allocation out of salaries also lowers the %-of-salaries lines (bonus, taxes) and so anything built
on them; Auto-Forecast and drivers that read their own line do the same. Say what feeds the new
driver in the proposal.
