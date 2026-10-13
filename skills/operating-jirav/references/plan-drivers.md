# Plan drivers

**Scope: one plan.** Where: the plan page (an account's or custom line's ⋯ → Add Driver). A plan
driver is a rule that fills forecast months in **this plan only**: a fixed spread, growth, % of
another account, or a formula. Copying a plan copies its drivers. For rules that apply in every
plan, see [global-drivers.md](global-drivers.md).

**Settings:** company-wide date ranges used in driver inputs are in [date-ranges.md](date-ranges.md);
Auto-Forecast can override plan drivers ([forecast-settings.md](forecast-settings.md)).

Drivers on the same line **add together**, so check for existing ones before adding. That
includes [GL] global drivers on custom lines. Inputs can use [assumptions](assumption-values.md) and [date ranges](date-ranges.md).
For every change, follow **Edits** in SKILL.md. Offer to try it on a copy of the plan first
([plans.md → Copy](plans.md#copy-activate-delete)); the user may choose the live plan.

## Find

```js
await jirav.listPlanDrivers(planId)            // another company: listPlanDrivers(planId, 'company name')
// [{id, name, type, page, account, department, inputs, misconfigured}]  this plan's drivers (no global ones)
```

`account` and `department` are names. `type` is the internal kind (Fixed Spread = `annual_spread`,
`annual_target`, `capex`…), except Custom drivers, whose `type` is the page (`revenue`, `opex`…). `misconfigured: true` means the
driver isn't producing values; that's often Auto-Forecast (below), so flag it to the user.

## Add

1. Open the plan page with the account (e.g. `revenue`).
2. Click the **⋯** at the far left of the account's row (or a custom table line's) → **Add
   Driver**. A custom line's menu also has **Add Global Driver**, which creates a *global* driver
   ([global-drivers.md](global-drivers.md)). Only the types the
   account allows are offered: Annual Target · Fixed Spread · Growth on Historicals · Periodic
   Growth · Amount per Headcount · % of Another Account · Custom.
3. Hover the type → **Apply To Department(s)** (search; All, Unassigned, each department) → click
   one. **All creates one driver per department** (there's no single shared driver). Use the
   department the user names; if none, ask (the account's actuals by department are a good hint).
4. The editor opens above the grid:
   - **Driver Name**: replace the default ("Custom Driver #1") with something meaningful.
   - **Apply to Account(s) & Department(s)**: prefilled.
   - **Inputs**: these depend on the type.
     - Fixed Spread: Fiscal Year(s) · Annual Amount · Monthly Allocation.
     - Custom: Input 1 · operator (× by default) · Input 2 (Constant 1 by default). Each input
       opens the [variable picker](variable-picker.md). **A flat amount per month** = Custom, Input 1 Constant <amount>
       × Constant 1 (verified).
     - Others: see *Driver types* below.
   - **More Options**: Rounding · Frequency (1 = monthly) · Div/0 · Start Date Type (Specific
     Date, Min Date, Cutover Date (default), Max Date) · End Date Type (default Max Date) ·
     Description.
   - **Explicit Spend** (Annual Target, Fixed Spread): overrides chosen months with a fixed amount.
     *(help)* It can be linked to a custom-table line, so someone else maintains those months.
5. **Save** → toast "New driver(s) created for <Account> (<departments>)". A child row per
   driver (fx icon) appears under the account.

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

*(help)* items: Jirav's [Standard Drivers](https://help.jirav.com/standard-drivers) article.

| Type | Inputs | Behaviour |
|---|---|---|
| Annual Target | Fiscal Year(s) (All Forecast Years / a year / Custom Range) · Annual Amount · Allocation (Even split / Seasonality of prior year) · Add Explicit Spend | Spreads what's left of the target over the forecast months, after subtracting **that department's** actuals for the year. 1.2M for FY22 on Unassigned (no actuals) gave 171,428.57 × 7 months. *(help)* Amount must be positive. Once YTD actuals pass the target, every remaining month is **0**: say so when actuals are running hot |
| Fixed Spread | Fiscal Year(s) · Annual Amount · Allocation (Even split / Seasonality of prior year) · Add Explicit Spend | *(help)* Spreads the amount once and **ignores actuals**: 12,000 → 1,000 a month; with 2,700 of actuals in Jan–Feb the year ends at 12,700, not 12,000. Amount must be positive |
| Growth on Historicals | Growth type (Historical Period Over Period % Change) · Base: Same Month Last Year / Last Year (Full Year) / Constant | Needs two years of history. Without it, a confirm dialog warns; Continue saves with 0% growth, so each month repeats the same month last year. *(help)* The rate is last year's total ÷ the year before's (12,000 vs 10,000 = 20%), applied to the base: Feb last year 1,200 → 1,440. Base Last Year (Full Year) adds an Allocation (Even / Seasonality) |
| Periodic Growth | Periodic # or % Increase · "Increase by X every N Month(s)" · first increase: In Forecast / Relative Month / Specific Month · Base: Actuals (last month, last 3/6/12 avg, last quarter/half, since last year, this year) / Constant / Custom | Steps count from the last actual month: 10% every 3 months on a 2,600 base gave 2,600 Jun–Jul, 2,860 from Aug, 3,146 from Nov |
| Amount per Headcount | Amount · Cumulative or New headcount · Headcount Department (All / This Department / one) | 100 × headcount, per department (24 staff → 2,400). The amount can be an assumption |
| % of Another Account | Select Account (account + department, "This …" allowed) · percentage (type 10 for 10%) · optional Create Assumption | 10% of Revenue → COGS = 10% of that month's revenue |
| Custom | Input 1 · fx (+ − × ÷) · Input 2; each input an account, headcount, custom line, assumption or constant ([variable picker](variable-picker.md)) | A flat amount = Constant × Constant 1 (verified). Div/0 (default On) handles ÷ 0. Example: Advertising = Revenue (This Department) × an assumption |

### Driver inputs

Each input is chosen in the [variable picker](variable-picker.md).

## Edit or delete

1. Click the driver's child row. The **Formula** bar shows its summary with **✎** and **🗑** at the
   right. ⚠️ Rows labelled **[GL]** are global drivers: ✎ and 🗑 there change them **for every
   plan** (see [global-drivers.md](global-drivers.md)).
2. ✎ → the same editor ("Edit This Driver") → change it → **Save** → toast "Driver updated".
   *(help)* The **type can't be changed**: to switch (say Growth on Historicals → Amount per
   Headcount), delete the driver and add a new one. Propose both steps together.
3. 🗑 → "Delete Driver: Are you sure…?" → **Yes**. No toast follows: verify with `listPlanDrivers`.
   ✎ and 🗑 are icons at the Formula bar's right end: take their position from a screenshot.

A driver's type can't be changed: delete it and add a new one. The row's **⋯** also has Edit
Driver, Clone Driver, Clone, Clone To and Delete Driver.

Several drivers on one line **add up**, including [GL] global drivers (plan 5 + global 7 = 12,
verified).

## Auto-Forecast overrides drivers

If Auto-Forecast is on for the plan and covers the account, it **silently wins**:

- the drivers stay, but produce nothing (`misconfigured: true` in `jirav.listPlanDrivers`);
- an **Auto-Forecast** line supplies the values instead.

Turning Auto-Forecast off for the plan brings the drivers back. So before adding a driver, check
`(await jirav.getAutoForecast(planId)).plan.enabled`. If it's on, ask the user whether to turn it
off for this plan, or to exclude the account in the company's Custom Auto-Forecast settings
([plans.md → Auto-Forecast](plans.md#auto-forecast)).

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

## Drivers overview (fx)

Balance Sheet, CapEx, Allocation and Staffing drivers live in inline grids on the fx page: see
[drivers-overview.md](drivers-overview.md).

## Not yet covered

- Custom-table, Output and KPI-based driver inputs beyond Constant and account elements.
- Whether Min Date drivers override imported actuals.
