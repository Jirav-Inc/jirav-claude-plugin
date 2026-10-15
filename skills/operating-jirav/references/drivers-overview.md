# Drivers overview (fx): Balance Sheet, CapEx, Allocations, Staffing

**Scope: this plan only.** The plan's **fx** icon (right rail) opens `…/drivers`. Account drivers
(add, inputs) are in [plan-drivers.md](plan-drivers.md), inputs via the [variable picker](variable-picker.md); test on a plan copy
([plans.md](plans.md#copy-activate-delete)).

Which family (uses from Jirav's [Driver Overview](https://help.jirav.com/plans/drivers)):

| The user wants | Family | Where |
|---|---|---|
| Revenue, COGS, OpEx or a custom line from a rule (units × price, % of revenue, a target) | Standard plan driver | [plan-drivers.md](plan-drivers.md) |
| A balance that moves with activity (AR up by invoices, down by collections) | Balance Sheet | below |
| A shared cost spread across departments (facilities by headcount) | Allocation | below |
| A cost moved to another account or department (labor to COGS, a reclass) | Allocation | below |
| An asset bought and amortized (laptops for new engineers) | Prepaids & CapEx | below |
| Headcount that grows with the business, by role, not hire by hire (support reps per customer) | Staffing | [staffing.md](staffing.md#change) |
| A KPI formula that never changes between plans (EBITDA) | Global driver | [global-drivers.md](global-drivers.md) |

The page lists every plan driver by section, each with Add Driver / Add Asset. Global drivers aren't listed. Driver names are cut to 40 characters. These sections are **inline grids**: double-click a cell to edit it
(pickers open for account and driver cells), Enter to commit. Tested on a plan copy:

| Section | Columns | Saves |
|---|---|---|
| Balance Sheet | Name, **Output** (a BS account + Increase / Decrease), **Driver** (variable picker), fx, Rate, Div/0, Start, End. **Rounding and Frequency aren't columns**: Output cell → "Select Balance Sheet Driver Output" → **Driver Options** (collapsed; its chevron expands it). Hovering the Output cell shows them; `listPlanDrivers` has `frequency` | At once ("New driver created") when Output and Driver are set. Adds "<Account> (driver)" lines that add to the system line. **Frequency N = every N months from Start**: a quarterly payout from Jul is Frequency 3, Start Jul; "annually in March" is Frequency 12, Start the first March, End Max Date |
| Prepaids & CapEx Assets | Name, Asset Account, Asset Contra Account, Expense Account + Department, Amort Period, Asset Cost, Residual Value, Amort Delay → Amortized Value, Monthly Amortization, Dispose Asset | **SAVE CHANGES** (enabled once Name is set). An asset is a template with no date: nothing happens until a CapEx driver buys it. *(help)* Monthly Amortization = (Cost − Residual) ÷ Amort Period; Dispose Asset removes it from the Balance Sheet at end of life |
| Prepaids & CapEx Drivers | Name, **Asset**, **Output Type** Balance / Incremental (units), Driver, fx, Rate, Round, Div/0, Freq, Start, End | At once. Check the Expense Account's drivers first ([plan-drivers.md](plan-drivers.md#drivers-that-read-their-own-line)). **Incremental** = units bought: 1 a month × a 12,000 asset over 12 months gave +12,000 a month on the asset account and 1,000, 2,000, 3,000… amortization. *(help)* **Balance** sets the asset balance instead of adding to it. Computer per hire: Driver New Headcount × 1 |
| Allocations | Name, **Allocation In** (IS account + department receiving), **Allocation Out** (account + department giving), Amount, **Allocation Ratio** (variable picker, e.g. Constant 0.5), Start, End | At once, when the ratio is set ("New driver created"; default name "Allocations Driver #n"). Adds a driver line per department under the account. Ratio 0.5 of Rent G&A moved 1,300 to M&S and −1,300 from G&A; the total is unchanged. Works between accounts too (OpEx → COGS). See [Allocations](#allocations). *(help)* One driver per receiving department, ratio e.g. the KPI Library's headcount distribution; **not allowed between Revenue and Expense accounts** |
| Staffing | See [staffing.md](staffing.md#change) (driver-based hires) | |

## Allocations

- **Amount** blank: the ratio applies to the Out line's own value. Set: the ratio applies to that
  base instead (e.g. Staffing → Salaries).
- **Moving wages out of the wage line lowers the burden on it.** "% of Salaries" drivers (taxes,
  bonus) follow the reduced line and don't move with the cost: 25% of G&A wages to COGS cut those
  drivers by 25% and raised operating income. Say so in the proposal.
- **Check the In account's drivers** for ones that read their own line ([plan-drivers.md](plan-drivers.md#drivers-that-read-their-own-line)): they grow what you move in.
- **Check existing Allocations first** and follow the company's pattern. A common one: Out = a
  contra account ("COGS Allocation", "Facilities Allocation"), Amount = the base (Salaries,
  Building Rent), so the source line and its burden stay whole.
- Pickers: double-click In / Out → "Select To Where Money is Allocated" / "Select From Where Money
  is Taken" → search → account + Department dropdowns → SELECT. The first double-click can do
  nothing: do it again. **Driver Options** (Offset, default 0) is on the In side only, collapsed:
  only its chevron expands it.

Start Date **Min Date** makes a driver calculate over the actual months too (a custom-line driver
filled Jan-21 onward). Whether it overrides imported actuals is untested.

`jirav.menu()` reads ag-Grid lists; if it returns nothing for a picker, use the screenshot.
