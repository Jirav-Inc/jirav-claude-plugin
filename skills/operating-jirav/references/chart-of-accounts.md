# Chart of Accounts

**Scope: company-wide.** Settings → Chart of Accounts, one page per sidebar entry: `/<tenant>/setup/coa/is/revenue`,
`/is/cogs-opex`, `/is/other`, `/is/all-is`, `/bs/assets`, `/bs/liabilities`, `/bs/equity`, `/bs/all-bs`, `/all`
(bare `/setup/coa` redirects to the dashboard). Jirav's own "master" accounts,
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
(Balance Sheet). `notMapped`: source accounts in no master at all (an account sitting in
**Unmapped** is in that master's `mappedFrom`, not here). Read `mode` first:
- **`manual`**: Jirav's own master accounts with source accounts mapped to them. These sections have
  an **Unmapped** master account; source accounts landing there are worth flagging.
- **`auto`**: the section mirrors the accounting system's accounts one to one. There's **no
  Unmapped** account and every `mappedFrom` is empty, by design (each master *is* a source account):
  don't flag either. Accounts have no ⋯ in the UI.
- Switching a section to *Manage manually* is a whole-section change: "Please save the configuration
  to make further changes" (SAVE CHANGES, or Cancel). It needs an explicit yes, and must be saved
  before any account edit.

## The page

Sidebar: Income Statement (Revenue, COGS & OpEx, Other Income & Expense, All IS Sections), Balance
Sheet (Assets, Liabilities, Equity, All BS Sections), All Sections; the names follow the company's own
labels, so go by the URL. Each row: the master's name (`field "Master"`) on the left, its mapped source
accounts as chips (`picker`, named by the accounting system) on the right.

In `jirav.ui()` every row's controls carry `[row: <master>]` and each chip's × is
`icon:close [chip: <source account>]`. The section title's ⋯ is the `icon:more` with no row.

```js
await jirav.click({label: 'more', where: 'row: Depreciation'})     // a master's ⋯
await jirav.click({label: 'close', where: 'chip: Rent'})           // unmap Rent (back to Unmapped)
await jirav.click({kind: 'picker', where: 'row: Rent'})            // then pick from the open list:
await jirav.click({kind: 'option', label: /\bRent$/})               // choices read "<number> <name>"
await jirav.close()                                                 // the list stays open after a pick
```

A picker on a low row opens its list below the screen's edge: `ui()` then shows only its search box, so click
the option by query straight away (a query also looks below the fold).

| Control | What it does |
|---|---|
| Section title ⋯ | *Automatically mirror <accounting system>* or *Manage manually* |
| Account ⋯ | Add Account (below it, named "New Account": `jirav.fill` its Master field), Move, Delete (no question) |
| Chip × | Unmaps that source account: it goes back to **Unmapped** by itself (that's the undo of a mapping) |
| Click the right-hand field | Picker of this section's source accounts that sit in no other real master, those in **Unmapped** included: picking one moves it off Unmapped. One mapped to another master: unmap it there first |
| The **Unmapped** row | Greyed: no name to edit, its chips have no ×. Map an account onto a real master to move it |

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
