---
name: budget-import
description: Takes the budget file a user provides (Excel or CSV, in their own layout) and loads it into a Jirav plan through Jirav's Budget Import template - mapped by account and department, without double-counting payroll when System Salaries already exist, and without wiping Balance Sheet balances - then verifies it. Use when the user asks to "import a budget", "load the budget from Excel", "put this budget in Jirav", "upload next year's budget", or hands over a budget file during account setup.
---

# Jirav Budget Import

Takes the user's budget file and loads it into a Jirav plan through Settings → Integrations → Budget → Excel Budget Import. The budget is the forward-looking core of a Jirav account, so it should land cleanly, by department, without double-counting payroll or disturbing the Balance Sheet.

**The numbers always come from the user's file.** Never invent, extrapolate or "fill in" budget values. No file, no import: ask for it. A line or month the file doesn't have stays blank, and you say so.

**Ask, don't assume.** Budget files are messy, and a wrong guess loads a wrong budget that looks right. Every decision listed in [section 4, Questions](#questions-one-batched-list) is the user's: ask it, in **one numbered list**, before you build the mapping. Never resolve one by picking the "obvious", "preferred", first, middle or best-tying option, and never decide it inside a proposal the user is only asked to approve.

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
3. **The user's file.** Read it in the workspace (the `xlsx` skill, or Python), not in Jirav. Read **every** tab, hidden ones included. List:
   - its account labels, and which rows are the file's own **subtotal or total rows** (Total Revenue, Gross Profit, Total OpEx, EBITDA, Net Income, Total <department>…) and total columns (quarters, FY). These are never imported: they are what you tie out to.
   - its department labels (a column, a block or sheet per department, or none)
   - its period columns, and what calendar month each is
   - every set of alternative numbers: scenarios, versions, cases, a scenario switch cell, older or hidden tabs
   - its units (a "$000" label, or none) and sign convention (expenses positive or negative, contra lines, net lines with mixed signs)
   - any Balance Sheet lines

   Prior-year actuals are **not** needed: the file is the budget. The last actual month's values are useful only to sanity-check units.
4. **Balance Sheet baseline.** On the Assets, Liabilities and Equity pages (Department filter All), record every account's balance for the last actual month and the first forecast month. This is what Verify compares against.
   - **Check the plan isn't already wiped.** Balances normally carry forward, except where Jirav's own A/R and A/P forecast moves them (System lines). A non-cash account that drops to 0 in the first forecast month, with a typed **Decrease** (or **Increase**, for a negative balance) on its own line equal to its whole last actual balance, was wiped by an earlier import. Tell the user and offer the repair in section 2 **before** importing; otherwise the template comes back with an empty Balance Sheet sheet.
5. **Staffing.** Check `jirav.listStaff(planId)` and the Salary Expenses account (Settings → Company → Plans; the name varies, e.g. Wages or Salaries and Wages). If staff exist, **System Salaries** already post to that account in every forecast month, by department. The wages rule below applies.
6. **Existing typed input and drivers.** The import replaces existing direct line input in the plan. Check `listPlanDrivers(planId)` and the plan grids for Manual Input rows, and tell the user anything that will be overwritten or stacked.

## 2. Balance Sheet rule (critical)

The template's **Balance Sheet** sheet comes prefilled: each account holds the last actual balance, carried flat across every forecast month. Uploading it unchanged leaves the plan's Balance Sheet exactly as it was (verified, including System Cash, A/R and A/P).

- **Default: leave the Balance Sheet sheet exactly as the template delivers it.** Don't edit it, and don't call `im.blankNumbers` on it.
- **Template's Balance Sheet sheet is empty** (no numbers from row 6): the plan was already wiped. Stop, tell the user, and run the repair below before building the file.
- **The user supplies budgeted balances:** fill only those accounts and months, and leave every other cell prefilled. Balance Sheet lines in the file are **not** by themselves a request to load them: ask (Questions, item 9). Never fill Cash or System lines (System Cash, A/R, A/P): Jirav calculates them.
- **Never blank Balance Sheet cells.** Blank cells are imported as **0**. Every non-cash account (bank sub-accounts, AR, inventory, fixed assets, liabilities, equity) then drops to zero for the whole forecast, and System Cash absorbs the difference.
- Always fetch a **fresh** template right before building, because the prefilled balances reflect the latest actuals.

**Repair, if Balance Sheet balances were wiped** (verified): a wipe is stored as one typed value per account, in the **first forecast month**, on the account's own **Increase** or **Decrease** line, equal to its whole last actual balance. Later months have nothing typed.
1. Confirm with the user (it edits the plan), then on each Balance Sheet page click each of those cells and press **Delete**, then **SAVE** (as for typed values in `operating-jirav`'s plans reference). Use `readGridValues.cellPoint('Decrease', '<first forecast month>', {index})` and match the value; several lines share the label.
2. Leave the **System** lines (System Cash, System Accounts Receivable, System A/P) alone: they're calculated.
3. Reload and check every non-cash account carries its last actual balance again, and that Assets = Liabilities + Equity.
4. Fetch a fresh template: its Balance Sheet sheet is prefilled again.

## 3. Wages rule (critical)

If System Salaries are already set (staff imported, salaries flowing to the Salary Expenses account), importing a budget that also carries wages **double-counts payroll**. In the test account, imported wages of $371,300 plus System Salaries of $354,000 showed as $725,300 a month.

The approach is the user's choice (Questions, item 8): offer all three below, say Option 1 is recommended, and wait for the answer. Then do it for **each department**.

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

Never pick the approach yourself, and never import wages on top of System Salaries.

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

**Morph the user's file into the template** (in the workspace, before touching Jirav), in this order: questions, mapping, tie-out. Don't build the edits object before the questions are answered.

### Questions: one batched list

After section 1 (and the file read in 1.3), send the user **one message** with a numbered list of every question that applies. Each question names the file lines (with annual totals) and the Jirav options, offers a recommendation where you have one, and is a question, not a statement. Ask, whenever:

1. **Alternative numbers.** The file has more than one scenario, version, case, block or tab for the same lines (hidden and "old" tabs included, and even when a switch cell or tab name marks one as active): which is the budget, **for which months** (a budget can take one scenario for some months and another for the rest). Test each candidate against the file's subtotal rows month by month and report what you find as evidence, but never decide by it. Never sum scenarios.
2. **Units.** No unit label: ask (compare with the last actual month to suggest one). A label ("$000", "in thousands"): state the multiplier in the list for the user to confirm.
3. **Periods.** Columns that are not calendar months (quarters, P1–P12, fiscal labels, a fiscal year not starting in January): confirm which month each is, against the plan window. Quarterly or annual figures: how to spread them to months (evenly, or a pattern the user gives). A **missing** month, or a month that is blank or all zero while the others have values: blank (unbudgeted), zero, or values the user gives. Never interpolate, copy a neighbour, or take it from another tab.
4. **One line, several possible accounts.** For each file line, list every Jirav account that could hold it, by name **and** by meaning, in any section, including accounts with actuals the line probably covers (e.g. "Software & Subscriptions" → Software, or partly Hosting; "Commissions" → Commissions, or Partner Commissions in COGS; "Travel & Meals" → Travel, Meals & Entertainment, or a split; "Rent & utilities" → Rent and Utilities). An exact name match does not end the search. More than one candidate: ask which, or how to split.
5. **No account.** A line with no candidate account: map it to an account the user names, add the account in Jirav first, or leave it out. Never drop or map one silently.
6. **Several lines, one account.** Two or more file lines (or file departments) that would land in the same account × department: list them and ask to confirm the roll-up. Also ask when a dedicated account exists for one of them (Bonus → Bonus Pay or Wages).
7. **Departments.** A file department that matches no Jirav department, matches several (Sales & Marketing → Sales, Marketing), or is missing (lines with no department, in a company that has departments): ask where each goes. Non-exact one-to-one renames (R&D → Engineering, Ops → Operations) go in the list to confirm.
8. **Payroll.** The file has wages and System Salaries exist: driver, plug or roster-owned (section 3).
9. **Balance Sheet lines in the file:** load them as budgeted balances (which accounts), or keep the prefilled balances.
10. **Signs** the conventions below can't settle: a net line with mixed signs (Interest income (expense), net), or a line whose sign could mean either direction.
11. **Stacking.** A mapped account already has a driver or typed input in the plan (section 1.6): import on top, replace, or leave that line out.

Questions that don't apply are left out; plain facts (an exact one-candidate match, a normal sign flip of an all-negative expense section) are stated, not asked. If an answer raises a new question, ask it before going on. Controller Essentials' overwrite (step 1.1) is asked first, in the same message.

### Mapping

From the answers:
1. **Accounts:** each file line → a template `B` (Account Name), as answered.
2. **Departments:** each line → a template `D` (master department), as answered.
3. **Months:** the file's period columns → the template's forecast-month columns, as answered. Months outside the plan's forecast window can't be imported: list them.
4. **Units and signs:** apply the multiplier, then the template's sign conventions (above). Contra-revenue stays negative.
5. **Roll-ups and splits:** sum the confirmed many-to-one lines; split the confirmed one-to-many lines.
6. **Never imported:** the file's subtotal and total rows and columns, the scenarios and tabs not chosen, and the lines the user left out. List them.

### Tie-out: month by month, to the file's own subtotals

For **every month** and **every subtotal or total row in the file** (Total Revenue, Gross Profit, Total OpEx, EBITDA, Net Income, Total <department>…), recompute the row from the mapped values (back in the file's units and signs) and compare it with the file's own number. Do the same for any quarter or year total columns. Where the file has no subtotal rows, tie each section's mapped total to the sum of the file's lines, by month.

- A difference is allowed only when it equals lines or months the user chose to leave out: show it as such.
- Any other difference: stop, show the months and amounts, and ask. Never import a mapping that doesn't tie.
- Annual totals alone are not a tie-out: one month off in one direction and another off in the other still ties annually.

Then build the edits object from the mapping. Large budgets can be sent in several `im.edit` calls, each on the previous call's file (`im.edit(f.i, …)`); keep the last one.

## 5. Propose once

After the questions are answered, one message with:
- the plan and its months
- the full mapping: every file line → account × department, with its source (tab, scenario and months), and any multiplier, sign change, spread, roll-up or split; then every line, row, column or month **not** imported, and why
- the tie-out: a month-by-month table of each file subtotal row against the mapped value (difference 0, or the left-out lines), and the section totals (revenue, COGS, gross margin, OpEx including salaries, operating income) for the year
- the wages approach the user chose (driver, plug, or roster-owned blank)
- the Balance Sheet treatment the user chose: carried forward as prefilled, or the user's balances
- that the import replaces direct line input in **this plan only**

Get an explicit yes. If the user changes anything, update the mapping and the tie-out and propose again. Never upload before the yes. On a first edit in the session, also ask where to keep the build log (in the questions message).

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

- Revenue, COGS, OpEx and other income/expense totals equal the user's file **for every month** (less any lines the user agreed to leave out), and the file's own subtotal rows (Gross Profit, Net Income…) match month by month.
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
