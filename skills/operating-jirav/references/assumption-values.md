# Assumption values

**Scope: per plan, one value per assumption (not per month).** Where: a plan page → the
**Assumptions** panel in the right-hand toolbar. The assumptions themselves are defined
company-wide in [assumption-tables.md](assumption-tables.md). Global drivers can use them too:
each plan reads its own value.

On a plan page, click the **Assumptions** icon in the right-hand toolbar ("psychology", third
icon). The panel has two tabs: **All** (every table) and **This Table** (assumptions used on this
page). Double-click a Value → type → Enter → **APPLY**. There's no plan sidebar page for
assumptions.

- **Read values with `await jirav.listAssumptionValues(planId)`**: every table's assumptions with
  their value in that plan, percents as fractions (Payroll Tax % `0.08` = 8%). No panel needed;
  values differ per plan (one Best Case had 650 where the Rolling Forecast had 800).
- To read or edit in the panel: it opens on **This Table**, which only lists assumptions the page uses and is empty on most
  pages (e.g. Assets): click **All** first. Then read with `jirav.readGridValues({ grid: 1, skipEmpty:
  false })`; each row's `attrs.Value` holds the value.
- **Type percents as whole numbers:** 9 means 9% (stored 0.09; the editor shows 8 for a stored 0.08).
- After **APPLY**, check it turned disabled, then read the value again. The panel is in shadow DOM, so
  check an edit with `readGridValues` or a screenshot, not the focused element.
- Copying a plan copies its assumption values.
- Percent assumptions store a fraction (0.1 = 10%). For "grow 10%", either use a Number
  multiplier of 1.1 with ×, or a Percent of 10% in a formula that adds 1.

Use an assumption in a driver: variable picker → **Assumptions** → table → assumption → SAVE
([variable-picker.md](variable-picker.md)).
