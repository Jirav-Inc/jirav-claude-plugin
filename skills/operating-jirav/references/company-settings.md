# Company settings

**Scope: company-wide.** Settings → Company (`/<tenant>/setup/company/<tab>`), tabs General,
Accounting, Plans, Staffing, Labels. Each changes every plan and report: follow **Edits** in SKILL.md
and only on request.

Read every tab at once with `await jirav.getCompanySettings()` → `{general, accounting: {fiscalYearStart,
currency, method, retainedEarnings, closeMonth, import, importAgingDetail}, plans: {salaryExpenses, cash},
staffing: {countLeaversInTerminationMonth, prorateSalaries, averageHoursPerWeek}, labels: [{standard, label, changed}]}`
(the values sit in shadow DOM on the page).

| Tab | Settings |
|---|---|
| General | Company name, logo. Short name (URL slug) is read-only |
| Accounting | Fiscal Year Start and Currency (both read-only), Accounting Method (Accrual / Cash), Retained Earnings account. **Close Month**: *<source> Close Month* (named after the accounting source, e.g. QuickBooks; follows the accounting system) or *Specific Date* + year + month. Switching to Specific Date **blanks the year and month** and narrows the selects: take their points again before clicking. QuickBooks Import: Automatic / Manual. Import AR/AP Aging Detail |
| Plans | Salary Expenses account (where staffing salaries post, e.g. *Salaries and Wages*; often not set, and then staffing never reaches OpEx: [staffing.md](staffing.md#gotchas); the list has no empty option), Cash account, and "Remove Unmapped category from all reports and plans" |
| Staffing | Count terminated employees in headcount for their termination month (on/off), Prorate salaries (on/off), average hours per week for hourly staff |
| Labels | Rename the standard statement labels (Revenue, COGS, Gross Margin, …). A label shows in the plan sidebar and page titles, but **plan grid rows keep the standard name** ("Revenue"), and so does `readGridValues`. **RESTORE DEFAULT LABELS applies at once, with no confirmation and no Save**: read the current labels first and say which custom ones it will wipe |

**Close month** drives "Close Month" date ranges and is what `jirav.getPeriods().closeMonth`
returns. `getPeriods()` also gives `closeMonthSource`:
- **`Specific Date`** (7 of 16 companies checked): set in Jirav, Settings → Company → Accounting → Close
  Month (year + month) → Save. It means "closed through that month", so closing the next month moves it
  forward one. Changing it **doesn't move any plan's actuals period** (roll that separately:
  [plans.md → Periods](plans.md#periods-and-manage-plans-columns)).
- **`Accounting system`** (9 of 16): read-only in Jirav; it follows the accounting system's own close
  date (`accountingCloseMonth`), which firms often never set, so it can sit months or years behind. With
  **no** accounting close date at all, Jirav reports the current month: treat that as unknown.

Compare it with the months that actually hold actuals (`getDataStatus().actualsThrough`): it can lag
them or run ahead. When they disagree, say so; for a stuck accounting-system date, suggest setting the
close date in the accounting system or switching to a Specific Date (the user's call).
