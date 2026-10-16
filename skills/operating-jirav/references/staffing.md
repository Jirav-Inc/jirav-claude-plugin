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

Salaries flow to OpEx as **System Salaries** lines under *Salaries and Wages*: one per department
plus an *All* total. Don't add the total to the department lines. They're read-only on OpEx.

## Change

All in Manage Staff / Driver Based Hires. **Manage Staff edits are batched: nothing is stored
until SAVE CHANGES** at the bottom (Cancel discards).

| Change | How |
|---|---|
| Add a planned hire | **Add Planned Hire** (or row ⋯ → Add / Clone Planned Hire). A new row "TBH" appears at the bottom of the grid: double-click Department (list), select Role and press Enter (list of existing roles; it also takes free text, so reuse an existing role unless asked), double-click Hire Date and type `YYYY-MM-DD` + Enter, double-click Annual Wages, type the **full number** (`90000`: "90k" is stored as 90, silently), Enter. Full Name can stay "TBH". SAVE CHANGES |
| Raise | Row ⋯ → **Plan Raise**: date, then $ per year **or** % of base salary → Add → Save in the dialog → **SAVE CHANGES** on the page. Works on imported staff too, and stays in this plan (verified: a 10% raise on an imported 125,000 salary added 1,041.67 a month in the copy; the original plan had no raise). To remove one: row ⋯ → Plan Raise → Remove → Yes → Save → SAVE CHANGES |
| End someone's employment | Double-click **Term Date** (any row), type the date, Enter, SAVE CHANGES |
| Delete a planned hire | Row ⋯ → Delete Planned Hire, SAVE CHANGES. Imported staff can't be deleted or have their name, role, hire date or wages edited |
| Driver-based hires | **Add Driver** adds a row: Department, Role, Annual Wages, **Driver** ([variable picker](variable-picker.md)), **Rate**, Round, Div/0, Freq, Start, End. Driver fx Rate (× by default) is the **total headcount needed** for that department and role, rounded to whole people per Round: hires = needed − existing employees, never below 0 (3 people + target 5 → 2 hires). If the need falls later, the driver's own hires are removed and counted as terminations; existing employees are never cut (app source). Salaries flow to the department; driver hires aren't in `listStaff()`. **Saved as soon as the required fields are filled** ("New driver created"), not via SAVE CHANGES. Listed by `jirav.listPlanDrivers(planId)` as type `staffing`. Example *(help)*: 1 CSM per $1M ARR = ARR × 0.000001, Round up |

To scroll the Manage Staff grid to a row, the grid's API works where mouse scrolling doesn't:
`api.ensureIndexVisible(i)` on grid 2 (see reading-grid-values.md for getting the grid).

## Verify

After saving, re-read `listStaff` and the headcount / salaries rows for the affected months
(e.g. a 120,000 hire adds 1 head and 10,000 a month from the hire date, less in a hire month
that starts after the 1st when Prorate Salaries is on; a 10% raise on it adds
1,000 a month from the raise date).

## Gotchas

- **Hire Date must be a forecast month.** A date in an actual month is accepted in the cell, but
  SAVE CHANGES stays disabled with no message (`jirav.saveBar().blocked`). If the user gives a
  start date that's already in actuals ("started last month"), say it can't be entered there,
  propose the first forecast month (`getPeriods`), and ask.
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

- **Escape closes the Plan Raise dialog and loses what you typed.**
- A staffing driver shows 0 headcount when its driver is empty in the forecast (e.g. a plan with no
  forecast revenue).
