# Global drivers

**Scope: company-wide, in every plan.** Where:

- The **Global Drivers Page** (Settings → Global Drivers, `/<tenant>/setup/global-drivers`): the full list, add, edit,
  clone, delete.
- Also from inside any plan: a custom line's ⋯ → **Add Global Driver**, and ✎ / 🗑 on a **[GL]**
  row.

Existing **Plans of Record are never changed** by new, edited or deleted global drivers: they only
reach plans that are editable, and a plan of record is locked (from the app source).

**Every edit, wherever it's made, changes the driver in all plans**: an edit made in one plan
showed up in another (verified). Confirm explicitly, and name the plans that will change.

What a global driver is:

- Always type **Custom**: one **Input 1 · operator · Input 2**, and only on **custom table lines**
  (not GL accounts). There's no EBITDA element. A KPI with more steps (EBITDA margin = (Operating
  Income + D&A) ÷ Revenue) needs helper lines: an EBITDA line (Operating Income + D&A), then a
  margin line (EBITDA ÷ Revenue), or a plan driver. Say so before building.
- Its inputs are picked from company-wide data only (the picker offers nothing one plan has, e.g. a
  role that exists in one plan only).
- Its picker has an **Assumptions** category when the company has assumption tables; each plan
  uses its own value. Its Data Preview runs on Actuals, so it can't confirm forecast results.
- Before a ratio driver (÷ Revenue), check the denominator has forecast values in each plan, and keep
  More Options → **Div/0 On** (the default: ÷ 0 gives 0); otherwise it can return −100% every month.
- Dates default to Cutover Date → Max Date, resolved per plan. Start options: Specific Date, Min
  Date, Cutover Date, Max Date. Min Date also calculates over the actual months (verified on a plan
  driver).
- On a line, it **adds to** plan drivers and typed values (shown as **[GL] <name>**; plan 5 + global
  7 = 12), in every plan: say so before applying it to a line that already has values.
- Not included in `jirav.listPlanDrivers(planId)`.

## Find

```js
await jirav.listGlobalDrivers()
// [{id, name, type, tableId, table, lineId, line, start, end, inputs, misconfigured}]
```

`start` / `end` come as `{pointer: 'CUTOVER' | 'START' | 'END'}` = Cutover Date / Min Date / Max Date.

`misconfigured: true` with `table: null` means the driver's custom table or line was deleted.
The driver is orphaned: it shows as "Invalid Entry" (red) and does nothing. Report orphans; don't
delete them unless asked.

## Add (Global Drivers Page)

**+ Add Global Driver** (next to the "Custom ⌄" group
header; clicking the header collapses the list) opens the same form as a plan driver's, filled with
[the driver form](plan-drivers.md#the-driver-form). Apply To is a table, then its line:

```js
await jirav.click({ label: /Add Global Driver/ });
const s = await jirav.driverForm.set({ applyTo: ['<table>', '<line>'], name: 'Win rate',
  input1: ['<line A>'], operator: '/', input2: ['<line B>'], div0: 'On', start: 'Min Date' });
// s.failed: [] and s.form.valid; then, after the user's yes, in its own browser call:
await jirav.driverForm.save();   // -> {ok: true, message: 'New driver(s) created for <line>'}; a name the company already has: refused
```

Inputs come from the variable picker ([variable-picker.md](variable-picker.md)), by name. Several lines: pick
them on the screen (Select All, or each line's tick) and check `read().applyTo`. The driver appears in every
plan's custom table as a child row **[GL] <name>** (read-only values).

## Edit, clone, delete

On the Global Drivers Page, a row's **⋯** (`{label: 'more', where: 'row: <driver name>'}`) offers Add Global
Driver · Edit Driver · Clone Driver · Delete Driver. Edit opens the same form: `set` only what changes, then
`save()`. Delete asks "Are you sure you want to delete this driver?" → **Yes**
(`jirav.click({label: 'Yes', where: 'dialog'})`), and is immediate. From a plan, ✎ / 🗑 on the [GL] row do the same thing, for every plan.

With `jirav.driverGrids` the list reads as one section, `customLines` (`form: true`):
`jirav.driverGrids.rows('customLines')` lists each global driver by name and id, and
`await jirav.driverGrids.remove('customLines', '<driver name>')` (or `{id}`) opens the row's Delete Driver and
returns `{asked: 'Delete Driver', everyPlan: true}`, the question left open: answer it
(`jirav.click({label: 'Yes', where: 'dialog: Delete Driver'})`) only after the user's yes to deleting it from
every plan. Adding and editing stay in the driver form.

Verify with `jirav.listGlobalDrivers()`, and read the line in a plan with
`jirav.readGridValues({ match: /<line>/ })`.
