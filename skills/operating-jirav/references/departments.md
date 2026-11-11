# Departments

**Scope: company-wide.** Settings → Departments (`/<tenant>/setup/departments/manage`). Jirav's
"master" departments, and which accounting-system departments (QuickBooks Class or Location) and
workforce departments feed each one. Changes re-sort actuals and staff for every plan: change only
on explicit request. Related: [chart-of-accounts.md](chart-of-accounts.md), [staffing.md](staffing.md).

## Read

```js
await jirav.listDepartments()        // [{id, name, path, parent, unassigned}]  ids as used in plans (ext:N); parent = the id it sits under
await jirav.getDepartmentMappings()  // [{key, name, accounting: [...], workforce: [...]}]
await jirav.getLimits()              // {departments: {total, top}, plans: {open, …}, staff, accounts, dashboards, …}
```

**Unassigned** catches anything not mapped. A source department in no master's list lands there.

## The page

Columns: MASTER, the accounting system (e.g. QUICKBOOKS), WORKFORCE; header shows
"Top level (n of 100) · Total (n of 100)".

| Control | What it does |
|---|---|
| MASTER ⋯ | Add Department, Add from Accounting |
| Department ⋯ | Add Department, Move, **Make Sub** (nests it under the department above; not on the first one), Delete |
| Chip × | Unmaps that source department: it goes back to **Unassigned** by itself |
| Click a row's ACCOUNTING or WORKFORCE field | Picker of the source departments in no other master (Unassigned ones included): pick one to move it |

Edits are batched behind SAVE CHANGES (as in Chart of Accounts); verified: MASTER ⋯ → Add Department
adds "New Department" at the bottom (rename it in place) → SAVE CHANGES; its ⋯ → **Delete removes
it with no confirmation** (still pending until SAVE CHANGES; Cancel undoes it). Departments are
company-wide: confirm before saving, and check `listDepartments()` after.
**Names must be unique:** a duplicate turns both rows red and disables SAVE (`jirav.saveBar()`
returns `blocked`). `getLimits().departments` → caps and `used: {total, top}` (Unassigned not counted, as in the header).
Menus and pickers here don't close with Escape: `await jirav.close()`. The name field is `field "Master ..."`
(query it by `where: 'row: <name>'`); the MASTER header's ⋯ is the `icon:more` with no row. In `jirav.ui()` a row's controls carry `[row: <master>]`
and each chip's × is `icon:close [chip: <name>]`, as in [chart-of-accounts.md](chart-of-accounts.md): moving
Product to another master is `jirav.click({label: 'close', where: 'chip: Product'})`, then
`jirav.click({kind: 'picker', label: 'Workforce', where: 'row: <master>'})` and the option (the accounting
picker is named by the accounting system).
