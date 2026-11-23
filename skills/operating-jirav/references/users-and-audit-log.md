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

## Groups (`/<tenant>/setup/access-config/groups`)

```js
await jirav.listGroups()   // [{id, name, members: [email], builtIn}]; All Users is built in: everyone, automatically
```

- **Add Group** (two buttons, above and below the list: either, `{label: 'Add Group', nth: 0}`) adds a row named
  "New Group": its name is `field "Group" [row: New Group]` (`jirav.fill` it; renaming a group is the same fill, and
  the row is then `row: <new name>`), its members `picker "Users" [row: <group>]`: click it, then the person's
  `option` (the list has a Search field), then `jirav.close()`.
- A group's ⋯ → **Remove Group** → Jirav's "Remove Group" question → **Remove**.
- Every change waits for **SAVE** in the bottom bar (`jirav.saveBar()`; `press()` in a call of its own), the removal
  too; Cancel discards. Check with `listGroups()`.

## Sharing a plan

A plan's **Share** (top right) → **Share** shares it with **people** (not groups): who, a name for the shared copy
(2–24 characters), a message, which part (Full / Restrict By Department / Custom Plan Access) and **Edit** or
**Comment Only** (there is no view-only level). **Manage Plan Sharing** lists what was shared
(`/plan/<slug>/<planId>/sharing-history`). Cancel on the Share form asks "Leaving share plan" (Leave closes it).
Sharing sends the person access at once: only when the user asks, naming the person.

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
