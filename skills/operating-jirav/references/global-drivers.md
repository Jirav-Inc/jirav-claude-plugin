# Global drivers

**Scope: company-wide, in every plan.** Where:

- Settings → **Global Drivers** (`/<tenant>/setup/global-drivers`): the full list, add, edit,
  clone, delete.
- Also from inside any plan: a custom line's ⋯ → **Add Global Driver**, and ✎ / 🗑 on a **[GL]**
  row.

*(help)* Existing **Plans of Record are never changed** by new or edited global drivers.

**Every edit, wherever it's made, changes the driver in all plans**: an edit made in one plan
showed up in another (verified). Confirm explicitly, and name the plans that will change.

What a global driver is:

- Always type **Custom** (Input 1 · operator · Input 2), and only on **custom table lines** (not
  GL accounts).
- *(help)* It can reference only company-wide lines, not anything one plan has (e.g. a role that
  exists in one plan only).
- Its picker has **no Assumptions** category, because assumption values are per plan. Its Data
  Preview runs on Actuals.
- Dates default to Cutover Date → Max Date, resolved per plan. Start options: Specific Date, Min
  Date, Cutover Date, Max Date. Min Date also calculates over the actual months (verified on a plan
  driver).
- On a line, it **adds to** plan drivers (shown as **[GL] <name>**; plan 5 + global 7 = 12).
- Not included in `jirav.listPlanDrivers(planId)`.

## Find

```js
await jirav.listGlobalDrivers()
// [{id, name, type, tableId, table, lineId, line, start, end, inputs, misconfigured}]
```

`misconfigured: true` with `table: null` means the driver's custom table or line was deleted.
The driver is orphaned: it shows as "Invalid Entry" (red) and does nothing. Report orphans; don't
delete them unless asked.

## Add (Settings → Global Drivers)

1. **+ Add Global Driver** (next to the "Custom ⌄" group header; clicking the header collapses
   the list).
2. Driver Name; **Apply To Table(s) & Line(s)**: pick a table, then tick lines (or Select All).
3. Inputs: Input 1 / operator / Input 2, using the variable picker
   ([variable-picker.md](variable-picker.md), minus
   Assumptions).
4. **More Options**: Rounding · Frequency · Div/0 · Start / End Date Type · Description.
5. **Save** → toast "New driver(s) created for <line>". It appears in every plan's custom table as
   a child row **[GL] <name>** (read-only values).

## Edit, clone, delete

On the Global Drivers page, a row's **⋯** offers Add Global Driver · Edit Driver · Clone Driver ·
Delete Driver. Delete asks "Are you sure you want to delete this driver?" → **Yes**, and is
immediate. From a plan, ✎ / 🗑 on the [GL] row do the same thing, for every plan.

Verify with `jirav.listGlobalDrivers()`, and read the line in a plan with
`jirav.readGridValues({ match: /<line>/ })`.
