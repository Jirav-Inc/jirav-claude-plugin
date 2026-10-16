# Users and Audit Log

**Scope: company-wide.** Related: [company-settings.md](company-settings.md).

## Users (`/<tenant>/setup/access-config/users`, tabs Users / Groups / Roles)

```js
await jirav.listUsers()  // {users: [{name, email, role, lastActivity}], invitations: [{email, role, sends}], roles: [{name, admin, description}]}
```

Roles: Admin, Editor, Viewer: All, Viewer: Dashboard & Reports, Viewer: Dashboard & Reports Limited
(no salaries), Basic. Seats for Admins & Editors are capped (shown under the list).

**ADD USER sends an invitation email, and the Role dropdown on a row changes that person's access
at once.** Only when the user asks, naming the person and role. Not tested.

## Audit Log (`/<tenant>/setup/audit-log`)

Who changed what, when: answers "who changed this plan / table?". Read it with the kit, not the page:

```js
await jirav.readAuditLog({ from: '2026-10-01', to: '2026-10-16' })   // {from, to, count, truncated, rows}
// rows: [{id, time: '2026-10-14T16:00:02Z', local: '10/14/2026, 11:00:02 AM', user, area, category, item, action, plan}]
await jirav.readAuditLog({ from, to, area: 'Plan', user: 'x@y.com', details: true })   // + changes per row
// changes: [{name: '2022-06', type: 'OLD', value: '5'}, {name: '2022-06', type: 'NEW', value: ''}, ...]
```

- **All of it:** the page shows at most 100 rows; `readAuditLog` reads every entry in the range (one
  company had 438 in a month). Default range: the last 30 days. Filters: `area`, `action`,
  `category`, `user` (email).
- **Times are UTC** (the page shows them with no zone). Use `local` (the user's time) or convert
  `time`, and say which.
- **`item`** names what changed (a table, "Close Month", "Manual Line item"); **`details: true`**
  adds the old and new values (`OLD` / `NEW`), plus the row and column for plan values. A settings
  change appears as several rows, one per field (e.g. Close Month Setup, Close Month: 2022 Mar →
  2021 Apr).
- Areas include Actuals, Setup, Plan, Reports and **Forecast** (Budget import, Import); actions Create,
  Update, Delete, Import, and more.
- **Not everything is logged:** label renames, Restore Default Labels and dashboard edits (clone, tile
  moves, delete) left no entry. Never conclude "nobody changed it" from the log alone; say what the log
  covers.
- `jirav.readTableRows()` still reads the rows on screen if you need the page's view.
