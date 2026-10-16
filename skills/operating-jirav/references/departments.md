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
| Chip × | Unmaps that source department |

Edits are batched behind SAVE CHANGES (as in Chart of Accounts); verified: MASTER ⋯ → Add Department
adds "New Department" at the bottom (rename it in place) → SAVE CHANGES; its ⋯ → **Delete removes
it with no confirmation** (still pending until SAVE CHANGES; Cancel undoes it). Departments are
company-wide: confirm before saving, and check `listDepartments()` after.
**Names must be unique:** a duplicate turns both rows red and disables SAVE (`jirav.saveBar()`
returns `blocked`). `getLimits().departments` → caps and `used: {total, top}` (Unassigned not counted, as in the header).
Menus here don't close with Escape: click empty space.
