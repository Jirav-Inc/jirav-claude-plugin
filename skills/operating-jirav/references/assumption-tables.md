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

- **Tables:** **Manage Tables** → **Add Assumption Table** creates "New Assumption Table" **at once**,
  and a rename is saved as soon as you leave the field: **DONE** only closes the dialog. So type the
  real name first time. Rows have a drag handle. A table's ⋮ has only **Delete**, which confirms
  ("…Plans referencing this assumption table will be affected") and is immediate.
- **Assumptions:** expand a table → **Add Assumption** → Name and Type (Percent % / Number # /
  Money $) → **SAVE** in the bottom bar. A row's ⋮ has Clone and Delete. Names must be unique
  **within a table**.
- **Typing a name:** select-all doesn't work in these fields (triple-click, Cmd+A and Ctrl+A all
  append). Click the field → End → Backspace once per character → type → Tab.
- **Check every save with `listAssumptions()`.** A failed SAVE shows no message: with a duplicate
  name the field says "Assumption table names must be unique" in red, SAVE gets a 400 error, and
  the bar stays. Special characters (`& / %`) in names are fine.

