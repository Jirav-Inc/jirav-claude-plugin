---
name: budget-import
description: Loads an annual budget into a Jirav plan from Excel through Jirav's Budget Import template - by department, without double-counting payroll when System Salaries already exist, and without wiping Balance Sheet balances - then verifies it. Use when the user asks to "import a budget", "load the budget from Excel", "put this budget in Jirav", "upload next year's budget", or needs budget numbers in a plan during account setup or for a demo account.
---

# Jirav Budget Import

Loads an annual budget into a Jirav plan through Settings → Integrations → Budget → Excel Budget Import. The budget is the forward-looking core of a Jirav account, so it should land cleanly, by department, without double-counting payroll or disturbing the Balance Sheet.

Runs on top of the `operating-jirav` skill: use its kit (the restore line, the `jirav.imports` block, `readGridValues`, `listPlanDrivers`) and its Edits rules (propose once, get an explicit yes, verify, log). The user signs in; never type credentials.

## When to use

- "Import a budget", "load the budget from Excel", "put this budget in Jirav"
- Account setup, right after: cash account, departments, staff roster, workforce → master department mapping, System Salary account, and the budget plan window
- Building a demo or training account with made-up budget numbers

## 1. Lay of the land (read-only)

1. **Target plan.** Use `jirav.listPlans()` and `jirav.getPeriods(planId)`.
   - The forecast window should be the 12 months of the fiscal year being budgeted. If the budget covers only part of the window, fill only those months (blank Income Statement cells change nothing) and say which months stay unbudgeted.
   - The plan must be editable.
   - Check `getAutoForecast(planId).plan.enabled`. A budget plan normally has Auto-Forecast off, because it overrides drivers, including the wage elimination driver.
2. **Departments.** Use `jirav.listDepartments()` and `getDepartmentMappings()`. The template has one row per account × master department, so departments must be set before the import.
3. **Where the prior-year actuals sit.** On each plan page (Revenue, COGS, OpEx, Other), read the prior fiscal year by account, switching the page's Department filter to each department.
   - Revenue, COGS and Other often sit in one department (Unassigned, or wherever the company maps unassigned GL activity); OpEx sits by department. Read where they are; don't assume.
   - The filter is sticky across plans: note its value first and restore it afterwards.
4. **Balance Sheet baseline.** On the Assets, Liabilities and Equity pages (Department filter All), record every account's balance for the last actual month and the first forecast month. This is what Verify compares against.
   - **Check the plan isn't already wiped.** Balances normally carry forward, except where Jirav's own A/R and A/P forecast moves them (System lines). A non-cash account that drops to 0 in the first forecast month, with a typed **Decrease** (or **Increase**, for a negative balance) on its own line equal to its whole last actual balance, was wiped by an earlier import. Tell the user and offer the repair in section 2 **before** importing; otherwise the template comes back with an empty Balance Sheet sheet.
5. **Staffing.** Check `jirav.listStaff(planId)` and the Salary Expenses account (Settings → Company → Plans; the name varies, e.g. Wages or Salaries and Wages). If staff exist, **System Salaries** already post to that account in every forecast month, by department. The wages rule below applies.
6. **Existing typed input and drivers.** The import replaces existing direct line input in the plan. Check `listPlanDrivers(planId)` and the plan grids for Manual Input rows, and tell the user anything that will be overwritten or stacked.

## 2. Balance Sheet rule (critical)

The template's **Balance Sheet** sheet comes prefilled: each account holds the last actual balance, carried flat across every forecast month. Uploading it unchanged leaves the plan's Balance Sheet exactly as it was (verified, including System Cash, A/R and A/P).

- **Default: leave the Balance Sheet sheet exactly as the template delivers it.** Don't edit it, and don't call `im.blankNumbers` on it.
- **Template's Balance Sheet sheet is empty** (no numbers from row 6): the plan was already wiped. Stop, tell the user, and run the repair below before building the file.
- **The user supplies budgeted balances:** fill only those accounts and months, and leave every other cell prefilled.
- **Never blank Balance Sheet cells.** Blank cells are imported as **0**. Every non-cash account (bank sub-accounts, AR, inventory, fixed assets, liabilities, equity) then drops to zero for the whole forecast, and System Cash absorbs the difference.
- Always fetch a **fresh** template right before building, because the prefilled balances reflect the latest actuals.

**Repair, if Balance Sheet balances were wiped** (verified): a wipe is stored as one typed value per account, in the **first forecast month**, on the account's own **Increase** or **Decrease** line, equal to its whole last actual balance. Later months have nothing typed.
1. Confirm with the user (it edits the plan), then on each Balance Sheet page click each of those cells and press **Delete**, then **SAVE** (as for typed values in `operating-jirav`'s plans reference). Use `readGridValues.cellPoint('Decrease', '<first forecast month>', {index})` and match the value; several lines share the label.
2. Leave the **System** lines (System Cash, System Accounts Receivable, System A/P) alone: they're calculated.
3. Reload and check every non-cash account carries its last actual balance again, and that Assets = Liabilities + Equity.
4. Fetch a fresh template: its Balance Sheet sheet is prefilled again.

## 3. Wages rule (critical)

If System Salaries are already set (staff imported, salaries flowing to the Salary Expenses account), importing a budget that also carries wages **double-counts payroll**. In the test account, imported wages of $371,300 plus System Salaries of $354,000 showed as $725,300 a month.

Do one of the following, for **each department**.

### Option 1 (preferred): eliminate System Salaries with a driver

One custom plan driver per department on the Wages account: `Salaries` from **'This Department'** × **Constant of -1**.

Steps (verified):

1. On the plan's OpEx page, set the Department filter to **All**. Expand Employee Compensation so that the **Wages** row shows.
2. Wages row **⋯** → hover **Custom** → under **Apply To Department(s)**, click **one department**.
   - Picking All also creates a pointless driver for Unassigned.
   - The editor's Apply-to field is an account picker, not a department picker.
3. **Driver Name:** `Elim System Salaries (<Dept>)`. The field takes at most **40 characters** and cuts longer names silently: shorten the department if needed.
4. **Input 1** → Data Elements → **Staffing** → click **Salaries** (the name, not the arrow).
   - Set **Department** to **This Department**. Leave Employee Role as All and Range as This Month.
   - The preview still shows the All total; it resolves per department on save.
   - Click **SELECT**.
5. Operator: leave **×**.
6. **Input 2** → Driver Logic → **Constant**. Clear the value (select-all can fail: End, then Backspace), type `-1`, press Tab (the preview shows -1), then **SAVE**.
7. **More Options → End Date:** if the budget covers only part of the forecast, set a Specific Date at the last budgeted month. Otherwise the driver cancels salaries to the end of the plan and the unbudgeted months show **zero wages**.
8. Click **Save**. Expect the toast "New driver(s) created for Wages (<Dept>)".
9. Repeat for each department with staff.

**Verify** with `readGridValues({under: 'Wages', kind: 'forecast'})`. For each department, System Salaries + the driver = 0, and Wages = the Manual Input value. Also check that `listPlanDrivers(planId)` shows `misconfigured: false`.

### Option 2 (not preferred): plug the difference

Put budget wages minus System Salaries in the Wages cells for each department and month, so that the total equals the budget. This breaks whenever the roster changes (hires, raises, terms). Use it only when the user asks or a driver isn't possible.

### Roster-owned wages

If the user wants the **roster to own wages**, leave the Wages cells blank in the Income Statement sheet (blank Income Statement cells don't clear anything). Neither option is needed then, but say so in the proposal.

Always state which approach you're taking. Never import wages on top of System Salaries silently.

## 4. Build the file

Always start from Jirav's own template for the target plan. A workbook written from scratch, or re-saved by openpyxl, can be rejected.

```js
// on /<tenant>/setup/integrations, after the restore line; paste blocks/imports.min.js if jirav.imports is missing
const im = jirav.imports;
const t = await im.template('budget', {planId});
const rows = await im.rows(t.i, 'Income Statement');   // header on row 5
```

**Income Statement sheet**
- Columns: A Fully Qualified Name, B Account Name, C Type, D Category (= master department), then one column per **forecast month** (E…P for 12 months, headers `YYYY-MM-01`).
- Find rows by `B` (account) + `D` (department). Only the listed account × department rows exist.
- Signs:
  - revenue positive
  - contra-revenue (Discounts & Returns) negative
  - COGS, OpEx and other expense positive
  - other income positive
- Parent accounts (e.g. Employee Compensation) also have rows. Leave them blank and fill the children.

**Balance Sheet sheet:** follow the Balance Sheet rule. By default, don't touch it.

Fill all Income Statement cells in one `im.edit(t.i, 'Income Statement', {cell: value, …})`, then check:
- the line and cell counts
- totals by section
- one sample row read back with `im.rows`
- that the Balance Sheet sheet still holds the prefilled balances (non-empty numeric cells from row 6)

**Keep the inputs.** The in-page file is lost on any page load, and `im.readBase64` can't write into the cloud workspace by itself. Keep the edits object (or the user's source file) so the file can be rebuilt, and upload in the same page session as the build.

**User's own budget file:** map their accounts and departments to the template's B and D values, and list anything that doesn't map. Never drop an unmapped line silently.

**Made-up numbers (demo or training):** base them on the prior-year actuals. Defaults that worked:
- Revenue lines grow monthly from a start point.
- COGS is a % of revenue.
- Wages are the prior-year Dec amount by department × 1.05. Where that is 0 (or far from) a department's System Salaries, use the System Salaries instead and say so: otherwise a department with staff budgets no wages.
- Payroll taxes are 8% of department salaries, benefits $1,200 per roster head per month, and bonus 7.5% of salaries.
- Rent, insurance and utilities are flat at the Dec run-rate × 1.03.
- Variable OpEx starts at the Dec run-rate × 1.03 and grows 0.5% a month.
- Depreciation is held flat.

Say that the numbers are fictitious.

## 5. Propose once

One message with:
- the plan and its months
- a table of totals by section (revenue, COGS, gross margin, OpEx including salaries, operating income) against the prior year
- the wages approach (driver, plug, or roster-owned blank)
- the Balance Sheet treatment: carried forward as prefilled, or the user's balances
- that the import replaces direct line input in **this plan only**

Get an explicit yes. On a first edit in the session, also ask where to keep the build log.

## 6. Upload

```js
await im.upload('budget', f.i);          // opens "Import Budget Data"
// if the dialog shows a spinner, real-click a blank area inside it once (a script click doesn't count)
await im.finish('<plan name>');          // selects the plan, presses UPLOAD TEMPLATE, returns Jirav's message
```

Expect `success: All rows were recognized and imported successfully.` Report any warning verbatim.

Re-importing the same plan overwrites typed values for every filled cell in the file. Re-send the full budget, not just the changed lines.

If the wages driver applies (Option 1), add it now, one per department.

## 7. Verify

On the plan with the Department filter set to **All**, read the forecast months with `readGridValues({from, to, kind: 'forecast'})` and check:

- Revenue and COGS totals equal the file's totals.
- Gross margin = revenue − COGS.
- OpEx = the imported OpEx lines + System Salaries + the elimination drivers (which should net the salaries to zero).
- Wages = the intended source only: the imported value (with the driver), budget wages (with the plug), or System Salaries only (if roster-owned).
- **Balance Sheet:** every non-cash account's first-forecast-month balance equals the baseline from step 1.4 (or the user's supplied balances), and Assets = Liabilities + Equity. Cash may move: by the change in Net Income from the new budget. Any non-cash account newly at 0 means the balances were wiped: run the repair in section 2.
- Spot-check one department for one month.

Afterwards, restore the Department filter to its original value.

## 8. Report

Report to the user:
- the section totals table
- the assumptions behind the numbers
- how payroll was handled, with the per-department driver amounts
- the Balance Sheet check
- the checks that passed
- build-log rows: one `import` row (plan scope, line × month count, totals), plus one `plan-driver` row per elimination driver

**Undo:**
- Blank **Income Statement** cells don't clear typed values. Delete them in the plan grid and SAVE, or re-import corrected numbers.
- **Balance Sheet:** if balances were wiped, the repair in section 2.
- To remove a driver, click its child row under Wages → 🗑 in the Formula bar, then confirm with `listPlanDrivers`.

## Gotchas

- **Blank Balance Sheet cells import as zero; blank Income Statement cells change nothing.** Treat the two sheets differently.
- The template covers only the plan's **forecast** months. Wrong months mean the plan window needs fixing first.
- The Department filter on plan pages persists across plans and sessions. Note it before changing it, and restore it after.
- Budget each line in the department where its actuals sit, so budget vs actuals lines up.
- If the roster's department mix differs from the actual wage mix by department, flag it: a department-level budget vs actuals view will show the difference.
- Auto-Forecast on in the budget plan overrides drivers, including the elimination driver. Keep it off unless the user wants it.
- Driver menus open with a short animation. When scripting clicks, pause about 1 s between opening a menu and clicking an item.