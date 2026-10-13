# Integrations (where actuals come from)

**Scope: company-wide, read-only here.** Settings → Integrations (`/<tenant>/setup/integrations`). Related:
[company-settings.md](company-settings.md) (close month), [staffing.md](staffing.md).

## Read

```js
await jirav.getDataStatus()
// {accounting: {source, company, connected, lastChartOfAccounts, lastTrialBalance, lastBudgetFile},
//  workforce: {source, lastStaffImport}, customTables: {lastActualsFile, lastBudgetFile, googleSheet}, closeMonth}
```

Use it before trusting actuals (month-end, variance work): say which system feeds them, when they
last arrived, and the close month. Flag `connected: false` (the accounting link needs
re-authorising) and imports that are months old. The page's **Status** box shows the same.

## What's on the page

| Section | Options |
|---|---|
| Actuals → Accounting | QuickBooks, Xero, NetSuite, Sage Intacct, QuickBooks Desktop. Brings the chart of accounts and trial balances (actuals). One is selected |
| Actuals → Workforce | ADP, Gusto, Paychex, UKG, BambooHR, Paylocity, Justworks, TriNet, or an Excel template. Brings **imported staff** (see staffing.md) |
| Actuals → Custom Tables | Google Sheets (linked, optional auto-import) or Excel template |
| Budget | Excel imports for accounting budgets and custom-table budgets |

## Don't, without the user

- **Connect / Disconnect** a system: it starts a sign-in (OAuth) in another product. The user does it.
- **Import** a file (budgets, staff list, custom-table actuals): see [imports.md](imports.md).

How often a connected accounting system syncs is set in [company-settings.md](company-settings.md)
(QuickBooks Import: Automatic / Manual).
