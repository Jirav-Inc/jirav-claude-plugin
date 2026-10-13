# Chart of Accounts

**Scope: company-wide.** Settings → Chart of Accounts (`/<tenant>/setup/coa/is/revenue`, or
`/coa/bs/assets`; bare `/setup/coa` redirects to the dashboard). Jirav's own "master" accounts,
and which accounting-system accounts feed each one. A mapping change re-sorts **all actuals,
every plan and every report**: read freely, change only on explicit request. Related:
[integrations.md](integrations.md), [departments.md](departments.md).

## Read

```js
await jirav.getChartOfAccounts()
// [{section, mode: 'manual'|'auto', accounts: [{key, name, category, mappedFrom: [source account names]}], notMapped: [...]}]
```

Sections: revenue, cogs, opex, otherIncome, otherExpense (Income Statement); bankAccounts,
otherCurrentAssets, fixedAssets, otherAssets, currentLiabilities, longTermLiabilities, equity
(Balance Sheet). `mode: auto` = the section mirrors the accounting system's accounts one to one.
Every section has an **Unmapped** master account: source accounts landing there are worth flagging.

## The page

Sidebar: Income Statement (Revenue, Cost of Sales & Operating Expenses, Other Income & Expense,
All IS Sections), Balance Sheet (Assets, Liabilities, Equity, All BS Sections), All Sections.
Each row: master account on the left, mapped source accounts as chips on the right.

| Control | What it does |
|---|---|
| Section title ⋯ | *Automatically mirror <accounting system>* or *Manage manually* |
| Account ⋯ | Add Account (below it, named "New Account"), Move, Delete |
| Chip × | Unmaps that source account |
| Click the right-hand field | Picker of source accounts **not yet mapped** in this section (so unmap first to move one) |

Edits are batched: **SAVE CHANGES** at the bottom stores them, **Cancel** discards (verified with an
unsaved test account). Saving a mapping change hasn't been tested.
