# Assumption values

**Scope: per plan, one value per assumption (not per month).** Where: a plan page → the
**Assumptions** panel in the right-hand toolbar. The assumptions themselves are defined
company-wide in [assumption-tables.md](assumption-tables.md). Global drivers can't use
assumptions.

On a plan page, click the **Assumptions** icon in the right-hand toolbar ("psychology", third
icon). The panel has two tabs: **All** (every table) and **This Table** (assumptions used on this
page). Double-click a Value → type → Enter → **APPLY**. There's no plan sidebar page for
assumptions.

- Read values while the panel is open: `jirav.readGridValues({ grid: 1, skipEmpty: false })`. Each
  row's `attrs.Value` holds the value.
- Copying a plan copies its assumption values.
- Percent assumptions store a fraction (0.1 = 10%). For "grow 10%", either use a Number
  multiplier of 1.1 with ×, or a Percent of 10% in a formula that adds 1.

Use an assumption in a driver: variable picker → **Assumptions** → table → assumption → SAVE
([variable-picker.md](variable-picker.md)).
