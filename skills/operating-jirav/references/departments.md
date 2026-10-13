# Departments

**Scope: company-wide.** Settings → Departments (`/<tenant>/setup/departments/manage`). Jirav's
"master" departments, and which accounting-system departments (QuickBooks Class or Location) and
workforce departments feed each one. Changes re-sort actuals and staff for every plan: change only
on explicit request. Related: [chart-of-accounts.md](chart-of-accounts.md), [staffing.md](staffing.md).

## Read

```js
await jirav.listDepartments()        // [{id, name, path, unassigned}]  ids as used in plans (ext:N)
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
| Department ⋯ | Add Department, Move, Delete |
| Chip × | Unmaps that source department |

Edits are batched behind SAVE CHANGES (as in Chart of Accounts). Saving hasn't been tested.
Menus here don't close with Escape: click empty space.
