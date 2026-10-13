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
await jirav.listDepartments()   // [{id, name, path, unassigned}]
```

The page `/<tenant>/plan/x/<planId>/staffing` has four grids, readable with
`jirav.readGridValues({grid: n})`:

| grid | Section | Rows |
|---|---|---|
| 0 | **Headcount** by month | All → department → role → Imported Staff / Planned Hire / Driver → person |
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
| Add a planned hire | **Add Planned Hire** (or row ⋯ → Add / Clone Planned Hire). A new row "TBH" appears at the bottom of the grid: double-click Department (list), select Role and press Enter (list of existing roles), double-click Hire Date and type `YYYY-MM-DD` + Enter, double-click Annual Wages, type, Enter. Full Name can stay "TBH". SAVE CHANGES |
| Raise | Row ⋯ → **Plan Raise**: date, then $ per year **or** % of base salary → Add → Save in the dialog → **SAVE CHANGES** on the page. Also offered on imported staff (not tested there) |
| End someone's employment | Double-click **Term Date** (any row), type the date, Enter, SAVE CHANGES |
| Delete a planned hire | Row ⋯ → Delete Planned Hire, SAVE CHANGES. Imported staff can't be deleted or have their name, role, hire date or wages edited |
| Driver-based hires | **Add Driver** adds a row: Department, Role, Annual Wages, **Driver** ([variable picker](variable-picker.md)), **Rate**, Round, Div/0, Freq, Start, End. Driver × Rate is the **total headcount needed** for that department and role: hires are added only above the existing count (3 people + target 5 → 2 hires) and never terminated *(help)*; rounded to whole people per Round. Salaries flow to the department; driver hires aren't in `listStaff()`. **Saved as soon as the required fields are filled** ("New driver created"), not via SAVE CHANGES. Listed by `jirav.listPlanDrivers(planId)` as type `staffing`. Example *(help)*: 1 CSM per $1M ARR = ARR × 0.000001, Round up |

To scroll the Manage Staff grid to a row, the grid's API works where mouse scrolling doesn't:
`api.ensureIndexVisible(i)` on grid 2 (see reading-grid-values.md for getting the grid).

## Verify

After saving, re-read `listStaff` and the headcount / salaries rows for the affected months
(e.g. a 120,000 hire adds 1 head and 10,000 a month from the hire date; a 10% raise on it adds
1,000 a month from the raise date).

## Gotchas

- **Escape closes the Plan Raise dialog and loses what you typed.**
- A staffing driver shows 0 headcount when its driver is empty in the forecast (e.g. a plan with no
  forecast revenue).
