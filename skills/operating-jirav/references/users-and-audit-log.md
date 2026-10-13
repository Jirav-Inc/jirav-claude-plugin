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

Who changed what, when: answers "who changed this plan / table?".

```js
jirav.readTableRows()  // [{Company, 'Date Time', 'User Email', Area, Sub, Category, Action}]  the rows on screen
```

Set **Range** / Start / End at the top first (default This Month). Area is Actuals, Setup, Plan,
Account or Reports; **Sub** is the plan name for plan changes; Action is Create, Update, Delete,
Import, Connect, Auto Import Completed, Upgrade. Each column header has a filter (▼). The page's own
query API refuses direct calls (403), so read the table.
