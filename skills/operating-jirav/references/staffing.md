# Staffing

**Scope: per plan.** Planned hires, raises, term dates and staffing drivers belong to one plan
(verified: a change in a copy left the original unchanged). Imported staff are the company's
employee list, shared by every plan. For every change, follow **Edits** in SKILL.md.

**Settings:** proration, counting leavers in headcount and the salary account are in
[company-settings.md](company-settings.md) (Staffing and Plans tabs); where imported staff come from
is in [integrations.md](integrations.md) (to replace them from Excel: [imports.md](imports.md#per-import)); how their departments map is in [departments.md](departments.md). Related: [plans.md](plans.md), [plan-drivers.md](plan-drivers.md),
[reading-grid-values.md](reading-grid-values.md).

## Read

```js
await jirav.listStaff(planId)   // [{id, name, role, department, hireDate, termDate, annualWages, kind: 'imported'|'planned', raises}]
await jirav.listDepartments()   // [{id, name, path, parent, unassigned}]
```

The page `/<tenant>/plan/x/<planId>/staffing` has four grids, readable with
`jirav.readGridValues({grid: n})`:

| grid | Section | Rows |
|---|---|---|
| 0 | **Headcount** by month | All → department → role → Imported Staff / Planned Hire / Driver. A person's row has `label` Imported Staff (or Planned Hire) and the name in `attrs['Full Name']` |
| 1 | **Salaries** by month (monthly cost) | same tree |
| 2 | **Manage Staff** | one row per person: Department, Role, Full Name, Hire Date, Annual Wages, Term Date |
| 3 | **Driver Based Hires** | one row per staffing driver (settings, no monthly values) |

`match` finds department rows too: `readGridValues({grid: 1, match: 'General and Administrative', maxDepth: 1})` is
that department's salaries by month. Read just after the page opens, the grids can still be empty (no rows, and a
warning that the grid has no period columns): `await jirav.waitIdle()` and read again.

Salaries flow to OpEx as **System Salaries** lines under *Salaries and Wages*: one per department
plus an *All* total. Don't add the total to the department lines. They're read-only on OpEx.

## Change

On the plan's Staffing page, use `jirav.driverGrids`
(`(await jirav.page()).blocks` says so). Each change is one call through the page's own controls, read back from the grid:

```js
const G = jirav.driverGrids;
// Manage Staff (sys:employee): nothing is stored until SAVE CHANGES
await G.add('sys:employee', { name: 'Jane Doe' })     // Add Planned Hire: a row at the bottom, its Full Name typed
await G.set('sys:employee', 'Jane Doe', { 'cus:depId': 'General and Administrative', 'cus:roleName': 'Support',
  'cus:hireDate': '2026-03-01', 'cus:annualWages': 90000 })   // -> {done, failed, missing, waitsForSaveChanges}
await G.set('sys:employee', 'Sam Lee', { 'cus:termDate': '2026-06-30' })   // '' clears it
await G.raise('Alex Kim', { percent: 5, date: '2026-07-01' })              // or {perYear: 3000} / {perMonth: 250}
                                                      // -> raises as {date, value, type} (listStaff names the date `from`)
await G.removeRaise('Alex Kim', '2026-07-01')
await G.remove('sys:employee', 'Jane Doe')            // Delete Planned Hire (imported staff can't be deleted)
await (await jirav.saveBar()).press()                         // SAVE CHANGES, after the user's yes; .discard() drops them all
// Driver Based Hires (staffing): saved by Jirav as soon as its required cells are filled ("New driver created")
await G.add('staffing', { name: 'Support per revenue' })
await G.set('staffing', 'Support per revenue', { deptId: 'General and Administrative', role: 'Support', annualWages: 60000,
  operand1: ['Revenue'], operator: '*', operand2: 0.000001, roundingMode: 'Round Up' })
await G.remove('staffing', 'Support per revenue')     // -> {asked: 'Delete Driver'}: after the user's yes, click its Yes
await jirav.click({ label: 'Yes', where: 'dialog: Delete Driver' })   // no success message: check listPlanDrivers
```

- **Columns:** Department (as listed), Role (Manage Staff: a role in use is reused when the name matches exactly; otherwise
  the text becomes a new role: reuse an existing one unless asked. Driver Based Hires: only the saved staff's roles; one
  not offered fails, the error lists those that are, and nothing more is set on the new row, so ask the user which), Full Name ("TBH" by default), Hire Date and Term Date
  (`YYYY-MM-DD`), Annual Wages (the full number: 90000, never "90k").
- **Imported staff:** only Term Date (when the import gave none) and raises change; the rest is the import's.
- **Raises** stay in this plan and work on imported staff too (verified: a 10% raise on an imported 125,000 salary
  added 1,041.67 a month in a copy; the original plan had no raise). One raise per month; a raise's date is no earlier
  than the cutover and the hire date. Left out, the date is the dialog's own (that earliest month).
- **Pending staff changes lock Driver Based Hires** (its Add Driver is disabled): SAVE CHANGES or discard first.
- **Driver-based hires:** Driver × Rate is the **total headcount needed** for that department and role, rounded to
  whole people per Round: hires = needed − existing employees, never below 0 (3 people + target 5 → 2 hires). If the
  need falls later, the driver's own hires are removed and counted as terminations; existing employees are never cut
  (app source). Role is one of the saved staff's roles. Start and End default to the plan's
  cutover and its last month. `operand1: ['Revenue']` picks by name: on a company whose revenue is just "Revenue" it's total
  revenue (every revenue account and department, This Month), but a sub-account named Revenue is taken instead where
  there is one. Read back which it took (`listPlanDrivers(planId)`, `inputs.formula.operand1`) and name it to the user. Salaries flow to the department; driver hires aren't in
  `listStaff()` (read them in the Staffing grids' Driver rows). Listed by `jirav.listPlanDrivers(planId)` as type
  `staffing`; also made on the Plan Drivers Page ([drivers-overview.md](drivers-overview.md#the-grids)). Example
  *(help)*: 1 CSM per $1M ARR = ARR × 0.000001, Round Up.

## Verify

SAVE CHANGES on Manage Staff shows no success message (`alerts({since})` stays empty); its result and the re-read are
the check. After saving, re-read `listStaff` and the headcount / salaries rows for the affected months
(e.g. a 120,000 hire adds 1 head and 10,000 a month from the hire date, less in a hire month
that starts after the 1st when Prorate Salaries is on; a 10% raise on it adds
1,000 a month from the raise date).

A driver-based hire's count: read the driver's input for the forecast months (revenue: `readGridValues({maxDepth: 0})`
on the plan's `revenue` page), work out Driver × Rate rounded per Round, take away the department's staff in that role,
and compare with the Driver rows in the Staffing grids. 0 hires is right when existing staff already cover the need:
say so, with the numbers.

## Gotchas

- **Put a hire in a forecast month: check it yourself.** Jirav saves a Hire Date in an actual month
  with no warning (SAVE stays enabled; the date picker only greys out days before today). The
  Staffing grids then count the person from that month, actuals included, while the P&L's actual
  months stay as imported, so the two disagree. Compare the date with the plan's cutover
  (`getPeriods(planId)`) before typing it. If the user gives a start date that's already in actuals
  ("started last month"), say so, propose the first forecast month, and ask.
- **"End of <month>"** for a term date is that month's last day (`2026-06-30`).
- **Which year a month means:** for a hire, "March" is the first March on or after the plan's first
  forecast month; for a term date, the first one after the hire date. Say which year you used.
- **Day of the month matters when Prorate Salaries is on** (Settings → Company → Staffing): a month's
  salary = annual ÷ 12 × days employed ÷ days in the month, both the hire day and the term day
  counted (verified: 120,000 hired on the 16th of a 31-day month = 5,161.29; leaving on the 15th of
  a 30-day month = 5,000). With it off, the hire and term months count in full *(from the app
  source)*. A date with no day ("June") → use the 1st, and say so.
- **Headcount in a term month** follows "Include terminated employees in head count for the month
  of termination": on, the leaver still counts that month.
- **"How many people" with no month given:** answer for the last closed month (actuals) and, if the
  question is about the plan, also for the end of the forecast; name the month(s).
- **A Term Date before the Hire Date is accepted** (SAVE stays enabled): check it yourself.
- **After a hire, check OpEx moved** (its System Salaries line for that department). Staffing
  salaries reach OpEx only through the company's **Salary Expenses** account
  (`getCompanySettings().plans.salaryExpenses`, Settings → Company → Plans). It's often not set
  (10 of 16 companies checked); then staffing shows salaries but OpEx has none (seen: salaries in every
  forecast month on the staffing page, nothing in OpEx). Check it before any staffing change and tell the user;
  setting it is company-wide and their call.
- **No staff, but salary actuals:** when `listStaff` is empty, say the staff list isn't loaded
  rather than answering "0 people".

- A staffing driver shows 0 headcount when its driver is empty in the forecast (e.g. a plan with no
  forecast revenue).
