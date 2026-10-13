# Company settings

**Scope: company-wide.** Settings → Company (`/<tenant>/setup/company/<tab>`), tabs General,
Accounting, Plans, Staffing, Labels. Each changes every plan and report: follow **Edits** in SKILL.md
and only on request.

| Tab | Settings |
|---|---|
| General | Company name, logo. Short name (URL slug) is read-only |
| Accounting | Fiscal Year Start, Currency (read-only), Accounting Method (Accrual / Cash), Retained Earnings account. **Close Month**: *QuickBooks Close Month* (follows the accounting system) or *Specific Date* + year + month. QuickBooks Import: Automatic / Manual. Import AR/AP Aging Detail |
| Plans | Salary Expenses account (where staffing salaries post, e.g. *Salaries and Wages*), Cash account, and "Remove Unmapped category from all reports and plans" |
| Staffing | Count terminated employees in headcount for their termination month (on/off), Prorate salaries (on/off), average hours per week for hourly staff |
| Labels | Rename the standard statement labels (Revenue, COGS, Gross Margin, …); RESTORE DEFAULT LABELS |

**Close month** drives "Close Month" date ranges and is what `jirav.getPeriods().closeMonth`
returns. It can lag the actuals actually loaded: when they disagree, say so.
