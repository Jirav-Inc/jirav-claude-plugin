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
last arrived, and the close month. The page's **Status** box shows the same.

- **`source: null`** means no accounting system is selected (4 of 16 companies checked).
- **`JiravExcel`** is the Excel actuals source: the **Manual import** card under Integrations →
  Actuals → Accounting (Excel, Template, IMPORT). It's switched on per company (offered in 5 of 16
  checked; rarely selected), so the card isn't always there. A file source has no live link:
  `connected` is always `false`, so judge it by the last import (Chart of Accounts / Trial Balance
  "Last Import") and `actualsThrough`. While it's the source every connector card is greyed out.
  Importing: [excel-actuals.md](excel-actuals.md).
- **`connected: false`** on a connector often just means an unused connection (one company's last
  trial balance was 2022). Flag it as needing attention only when the company expects syncs (recent
  imports, or QuickBooks Import set to Automatic); otherwise say "not connected; last import <date>".
- The `last…` fields are **import dates, not data freshness**: an import that changed nothing still
  moves them.
- **Which months hold actuals:** `actualsFrom` / `actualsThrough` (first and last month with any
  Revenue, COGS or OpEx actual). Say "actuals through <actualsThrough>; closed through <closeMonth>":
  the close month can lag the data (closed Apr-26, actuals through Oct-26) or run ahead of it
  (closed May-24, actuals through Oct-21). `null` means no Income Statement actuals at all.

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
