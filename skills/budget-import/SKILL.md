---
name: budget-import
description: Takes the budget file a user provides (Excel or CSV, in their own layout) and loads it into a Jirav plan through Jirav's Budget Import template - mapped by account and department, without double-counting payroll when System Salaries already exist, and without wiping Balance Sheet balances - then verifies it. Use when the user asks to "import a budget", "load the budget from Excel", "put this budget in Jirav", "upload next year's budget", or hands over a budget file during account setup.
---

# Jirav Budget Import

Takes the user's budget file and loads it into a Jirav plan through Settings → Integrations → Budget → Excel Budget Import. The budget is the forward-looking core of a Jirav account, so it should land cleanly, by department, without double-counting payroll or disturbing the Balance Sheet.

**The numbers always come from the user's file.** Never invent, extrapolate or "fill in" budget values. No file, no import: ask for it. A line or month the file doesn't have stays blank, and you say so.

Runs on top of the `operating-jirav` skill: use its kit (the restore line, the `jirav.imports` block, `readGridValues`, `listPlanDrivers`) and its Edits rules (propose once, get an explicit yes, verify, log). The user signs in; never type credentials.

## When to use

- "Import a budget", "load the budget from Excel", "put this budget in Jirav"
- Account setup, right after: cash account, departments, staff roster, workforce → master department mapping, System Salary account, and the budget plan window
- The user attaches or points to a budget file (attached in the chat, or in a connected folder)

## 1. Lay of the land (read-only)

1. **Target plan.** Use `jirav.listPlans()` and `jirav.getPeriods(planId)`.
   - The forecast window should be the 12 months of the fiscal year being budgeted. If the budget covers only part of the window, fill only those months (blank Income Statement cells change nothing) and say which months stay unbudgeted.
   - The plan must be editable.
   - **Which plan, by subscription** (`await jirav.getSubscription()`):
     - **Controller Essentials** has one budget plan and can't add plans. Loading next year's budget into it **overwrites this year's**, and the rest of this year's budget vs actual is lost. Say so first, and offer to export the current budget (a plan-grid Excel export, [exports.md](../operating-jirav/references/exports.md)) or to wait until year-end.
     - **CFO**: a new plan for the budget is **Add New Plan** ([plans.md → Periods](../operating-jirav/references/plans.md#periods-and-manage-plans-columns)): set the actuals to end the month before the budget year and the forecast to the budget year, then Save. At the 5-active-plan limit, ask which plan to archive; if it's the Current PoR, say what reports will show instead ([plans.md → Plan of record](../operating-jirav/references/plans.md#plan-of-record-and-other-plan-facts)).
   - Check `getAutoForecast(planId).plan.enabled`. A budget plan normally has Auto-Forecast off: while it's on, it hides typed values and drivers on accounts inside a group (the elimination driver and imported budget values included), adds to typed values on top-level accounts (drivers there may stop: check `misconfigured`), and zeroes System Salaries.
2. **Departments.** `getSubscription().departments` says whether the company has departments. If it does, use `jirav.listDepartments()` and `getDepartmentMappings()`: the template has one row per account × master department, so departments must be set before the import.
3. **The user's file.** Read it in the workspace (the `xlsx` skill, or Python), not in Jirav. Find its account labels, its department labels (a column, a sheet per department, or none) and its month columns. A file with no departments, in a company that has them: ask which department each section goes to; don't guess. Prior-year actuals are **not** needed: the file is the budget.
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

**Morph the user's file into the template** (in the workspace, before touching Jirav):
1. **Map accounts:** each line of the user's file → a template `B` (Account Name). Match exact names first, then obvious variants ("Salaries" → Wages). Every mapping that isn't exact goes in the proposal for the user to confirm.
2. **Map departments:** each line → a template `D` (master department). Use the file's own department labels; if the file has none, the departments the user named in step 1.3.
3. **Map months:** the file's month columns → the template's forecast-month columns. Months in the file outside the plan's forecast window can't be imported: list them. Annual-only figures: ask how to spread them (evenly, or by a pattern the user gives); never pick one silently.
4. **Normalise signs** to the template's conventions (above), and roll several file lines that map to one account × department into one value (say which).
5. **Unmapped lines:** list every line, with its annual total, that has no account or department in Jirav. Never drop one silently. The user decides: map it to an existing account, or add the account in Jirav first.
6. **Tie out:** the mapped totals by section must equal the file's totals by section, less only the listed unmapped lines.

Then build the edits object from the mapping. Large budgets can be sent in several `im.edit` calls, each on the previous call's file (`im.edit(f.i, …)`); keep the last one.

## 5. Propose once

One message with:
- the plan and its months
- a table of totals by section (revenue, COGS, gross margin, OpEx including salaries, operating income) from the user's file, and the same totals as mapped into the template (they must tie)
- the account and department mappings that weren't exact matches, and every unmapped line with its total
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

- Revenue, COGS, OpEx and other income/expense totals equal the user's file (less any unmapped lines the user agreed to leave out).
- Gross margin = revenue − COGS.
- OpEx = the imported OpEx lines + System Salaries + the elimination drivers (which should net the salaries to zero).
- Wages = the intended source only: the imported value (with the driver), budget wages (with the plug), or System Salaries only (if roster-owned).
- **Balance Sheet:** every non-cash account's first-forecast-month balance equals the baseline from step 1.4 (or the user's supplied balances), and Assets = Liabilities + Equity. Cash may move: by the change in Net Income from the new budget. Any non-cash account newly at 0 means the balances were wiped: run the repair in section 2.
- Spot-check one department for one month.

Afterwards, restore the Department filter to its original value.

## 8. Report

Report to the user:
- the section totals table
- the mappings used, and any lines or months that weren't imported
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
- Put each line in the department the user's file gives it. If that isn't where the company's actuals for that account usually sit (e.g. revenue budgeted under S&M but booked to Unassigned), flag it: budget vs actuals by department won't line up.
- If the roster's department mix differs from the actual wage mix by department, flag it: a department-level budget vs actuals view will show the difference.
- Auto-Forecast on in the budget plan hides or adds to the imported values and drivers, the elimination driver included ([plans.md → Auto-Forecast](../operating-jirav/references/plans.md#auto-forecast)). Keep it off unless the user wants it.
- Driver menus open with a short animation. When scripting clicks, pause about 1 s between opening a menu and clicking an item.