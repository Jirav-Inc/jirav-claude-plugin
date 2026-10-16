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
(Balance Sheet). Read `mode` first:
- **`manual`**: Jirav's own master accounts with source accounts mapped to them. These sections have
  an **Unmapped** master account; source accounts landing there are worth flagging.
- **`auto`**: the section mirrors the accounting system's accounts one to one. There's **no
  Unmapped** account and every `mappedFrom` is empty, by design (each master *is* a source account):
  don't flag either. Accounts have no ⋯ in the UI.
- Switching a section to *Manage manually* is a whole-section change: "Please save the configuration
  to make further changes" (SAVE CHANGES, or Cancel). It needs an explicit yes, and must be saved
  before any account edit.

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

Edits are batched: **SAVE CHANGES** at the bottom stores them, **Cancel** discards. Verified on a test
company (one section switched to manual, a master added, a source account moved onto it, then switched
back):
- **Manage manually** → SAVE turns each mirrored account into a master with its source account as a
  chip, and adds an **Unmapped** master.
- Moving a source account: its chip's × (unmap), then click the new master's right-hand field and pick
  it. **SAVE CHANGES re-sorts actuals at once** (no import): a report showed the account's whole
  history under the new master straight after.
- **Automatically mirror <system>** warns "Any manual configuration set in this group will be lost";
  SAVE rebuilds the masters from the source accounts. Values came back, but **an account's internal key
  changed** (3 → 8), so plan drivers, typed plan values and report rows that point at a master
  account may lose it. Before a mode switch, list what uses the section's accounts
  (`listPlanDrivers`, report setups) and tell the user; switching back is not a clean undo.
- Read `getChartOfAccounts()` before and after, and a report with actuals for the moved account.
