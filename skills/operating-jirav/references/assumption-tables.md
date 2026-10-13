# Assumption tables (definitions)

**Scope: company-wide.** Where: Settings → Assumptions (`/<tenant>/setup/assumptions/`). These are
named inputs, such as a growth rate or tax %, that plan drivers reference. Use them for any rate
a user might change, so a scenario can change one number instead of editing drivers. Defining an
assumption here gives it no value: values are set per plan in
[assumption-values.md](assumption-values.md). Deleting a table affects every plan that uses it.

## Find

```js
await jirav.listAssumptions()
// [{tableId: "keyAssumption-…", table, assumptions: [{id, name, type}]}]
// type: NUMBER_NUMBER | NUMBER_PERCENT | MONEY_MONEY
```

## Define

Settings → Assumptions: `/<tenant>/setup/assumptions/`. Keep the trailing slash; without it you
land on the dashboard.

- **Tables:** **Manage Tables** → Add Assumption Table → name it → **DONE** (saves). Rows have a
  drag handle. A table's ⋮ has only **Delete**, which confirms ("…Plans referencing this
  assumption table will be affected") and is immediate.
- **Assumptions:** expand a table → **Add Assumption** → Name and Type (Percent % / Number # /
  Money $) → **SAVE** in the bottom bar. A row's ⋮ has Clone and Delete.

