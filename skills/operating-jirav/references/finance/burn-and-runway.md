# Burn, runway and cash flow

Reading the values: `operating-jirav` →
[reading-grid-values.md](../reading-grid-values.md); reports:
[reports.md](../reports.md).

## Say which burn

"Burn" has no single meaning, so pick one, say it, and say where the numbers come from:

- **Net burn** (the default): the month's fall in cash, starting cash − ending cash. Includes
  financing (a loan drawn or equity raised makes it smaller), so say if the period had any.
- **Operating burn**: −(operating cash flow), when the user wants burn before financing and
  investing.
- **Gross burn**: total cash spent in the month, when the user says "gross".

A negative burn means cash grew: say "cash grew by X", not "burn of −X".

## Where the numbers are

- **A Cash Flow Statement report page** (template `cashFlowStatement` in `getReportSetup`): Operating,
  Investing and Financing sections, then **Starting Cash, Net Change in Cash, Ending Cash**. Its
  group's source can be **any active plan, the budget included**, or Actuals: that's the budget's
  cash flow. Plan pages have no Cash Flow page.
- **No such page**: the plan's Balance Sheet → Assets → the cash line (e.g. "Bank Accounts") by
  month; net burn = the month-on-month fall. Works for the budget plan too.
- Actual months: use Actuals up to the close month ([date-ranges.md](../date-ranges.md#today-vs-the-close-month)),
  as for any variance.

## Windows and averages

- "Trailing 12 months" ends at the close month, not today.
- **Budget vs actual burn:** check the budget plan covers every month of the window
  (`getPeriods(planId)`, actuals + forecast). If the window crosses into a year the budget doesn't
  cover, say which months have no budget and compare only the months both have; never average over
  missing months.
- Average burn = total burn over the months used ÷ that number of months; say the months.

## Runway

Runway = ending cash ÷ average net burn, in months, with the cash date and the months averaged.

- Burn ≤ 0 (cash growing): there's no runway figure; say cash is growing.
- Ending cash already ≤ 0: say the company is out of cash in that month; don't print a negative
  runway.
- A forecast that raises money later changes the answer: say whether the runway uses the plan's
  forecast cash (with the raise) or today's burn rate (without).

## Sanity checks on the cash flow

The classification (`operating-jirav` →
[variance-and-cash-flow-settings.md](../variance-and-cash-flow-settings.md),
`getCashFlowSetup()`) decides which section an account's change lands in. Before relying on
Operating vs Financing, check it and flag:

- **Loans, notes payable, lines of credit classed Operating.** Liabilities are Operating in the companies
  checked, long term ones included, so borrowing and repayments show up as operating cash. They're normally
  Financing.
- **Accumulated depreciation classed Investing.** The depreciation add-back then sits in Investing
  instead of Operating.
- Equity is normally Financing and fixed assets Investing; anything else unusual, name it.

Report these as findings; changing the classification is company-wide and the user's call.
