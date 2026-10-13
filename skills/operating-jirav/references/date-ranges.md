# Date ranges

**Scope: company-wide** (custom ranges are shared by every plan, report and tile). Where: the
Ranges picker, opened from a driver input's Range; there's no Settings page for them. Named,
relative periods ("Last Month", "Trailing 12 months", "Close Month") used by driver inputs,
and also by report columns and dashboard tiles. There are built-in **system** ranges and the
company's own **custom** ranges. Custom ranges are **company-wide**.

## Find

```js
await jirav.listDateRanges()
// [{id: "system:2" | "custom:2", name, type: 'system'|'custom', start: {pointer, shift}, end, width, dates: ['2025-10','2025-10']}]
```

`dates` is what the range resolves to today. **Check for an existing range before creating
one**: many companies already have what you need. For "this month last year", look for
`start: {pointer: 'THIS_MONTH', shift: -12}` with `width: 1`. Companies name it themselves (one calls it "LY LM (S)").

## The Ranges picker

Opened from a driver input's **Range** (Time Options), in plan or global drivers.

- **Default ranges** (system, not editable):
  - Last / This / Next Month, Quarter, Half, Year;
  - Last / This / Next Year-to-date and Year-to-last-month;
  - Trailing 3 / 6 / 12 months;
  - −1 | +1, −3 | +3, −6 | +6 months.
- **Custom ranges** are in a scrolling list. Hover one to see its dates and definition, plus
  **EDIT / REMOVE**. REMOVE asks "Are you sure?" without naming the range, but the range you
  hovered stays highlighted.

## Add a custom range

**+ ADD** (next to Custom Ranges) offers these fields:

- **Name.**
- **Start:** Auto, Current Month / Quarter Start / Half Start / Fiscal Year Start, or Close Month /
  Quarter Start / Half Start / Fiscal Year Start.
- **Width.**
- **End:** Auto.
- **Start Shift / End Shift:** −6…+6 months, or hover "0 Months ›" and type any number (e.g. −12).

**Save stores it for the whole company immediately**, before the driver is saved. Confirm
first, and give it a clear name.
