# Variable picker ("Select Driver Input")

**Scope: a shared control, not a place.** It opens wherever Jirav asks for a series or a driver
input: plan drivers ([plan-drivers.md](plan-drivers.md)), global drivers (no Assumptions category),
Balance Sheet, CapEx and Allocation drivers ([drivers-overview.md](drivers-overview.md)), staffing
drivers ([staffing.md](staffing.md)), Variance Rules, Goals and report lines.

- **Data Elements** tree: Income Statement (Revenue, Cost of Sales, Operating Expenses, Other
  Income & Expense, Margins), Balance Sheet, Staffing, KPI Library, Assumptions, Custom (custom
  tables), Driver Logic (Constant, Periodic Change, Output).
- Click an element's name (not its arrow) to configure it:
  - **Data Selection.** For an account element: Account and Department, each offering **This
    … Account** / **This Department**, All, or a specific one. "This …" makes one formula work
    for every account and department the driver is applied to.
  - **Time Options → Range.** The Ranges picker; see [date-ranges.md](date-ranges.md). A
    multi-month range adds **Reduction**: Sum (default), Min, Max, Product, Average, Standard
    Deviation, Variance. "Trailing 3 months" is the 3 months *before* the current one.
  - **Data Preview.** The values the input will return. Check it before SELECT.
- An assumption needs no options: pick it, then SAVE. A Constant takes a typed value.
