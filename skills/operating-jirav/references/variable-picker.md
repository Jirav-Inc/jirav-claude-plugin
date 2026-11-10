# Variable picker ("Select Driver Input")

**Scope: a shared control, not a place.** It opens wherever Jirav asks for a series or a driver
input: plan drivers ([plan-drivers.md](plan-drivers.md)), global drivers (Assumptions only when the company has assumption tables),
Balance Sheet, CapEx and Allocation drivers ([drivers-overview.md](drivers-overview.md)), staffing
drivers ([staffing.md](staffing.md)), Variance Rules, Goals and report lines. A Balance Sheet driver's Output and
an Allocation's In / Out open the same picker under other titles ("Select Balance Sheet Driver Output", "Select To
Where Money is Allocated", "Select From Where Money is Taken").

- **Data Elements** tree: Income Statement (Revenue, Cost of Sales, Operating Expenses, Other
  Income & Expense, Margins), Balance Sheet, Staffing (Headcount New, Headcount Cumulative, Headcount
  Terminated, Salaries, …), KPI Library, Assumptions, Custom (custom tables), Driver Logic (Constant,
  Periodic Change, Output).
- Click an element's name (not its arrow) to configure it in the side panel:
  - **Data Selection.** For an account element: Account and Department, each offering **This
    … Account** / **This Department**, All, or a specific one. "This …" makes one formula work
    for every account and department the driver is applied to. A Staffing element shows two **All**
    choices: Department, then Role.
  - **Time Options → Range.** The Ranges dialog; see [date-ranges.md](date-ranges.md#the-ranges-picker). A
    multi-month range adds **Reduction**: Sum (default), Min, Max, Product, Average, Standard
    Deviation, Variance. "Trailing 3 months" is the 3 months *before* the current calendar month, so it
    can be forecast months; for actuals use a Close-Month range ([date-ranges.md](date-ranges.md#today-vs-the-close-month)).
  - **Driver Options** (collapsed; its chevron expands it): a Balance Sheet Output's **Rounding** and
    **Frequency**; an Allocation In's Offset. A Balance Sheet Output's Increase / Decrease is **Measure Type**.
  - **Data Preview.** The values the input will return. Check it before Select.
- An assumption needs no options: pick it, then SAVE. A Constant takes a typed value (**Value**). The
  confirm button reads **Select**, or **Save** when the input already held a value (a Rate's default
  Constant 1).
- The picker's **Search** box filters the tree to matching names.

## The kit

`jirav.pickers` (in the core) works the picker, the Ranges dialog and the Start / End month dialog through their
own controls and reads each choice back before confirming. The driver form and the Plan Drivers Page grids use
it for you (`driverForm.set({input1: …})`, `driverGrids.set(type, row, {operand1: …})`); call it yourself only
for a picker another screen opened.

```js
const P = jirav.pickers;
await P.pick(value)          // into the topmost open picker, then its Select / Save -> {ok, path, options} ({ok, path: 'Constant', value} for a number)
await P.range(name)          // in an open Ranges dialog: a default or custom range by name, then its Save -> {ok, range}
await P.month(title, value)  // in an open month dialog ('Start' / 'End'), then its Save -> {ok, value}
await P.choose(path, {confirm})  // search and pick a node without options -> {ok, path, confirmed?} | {ok: false, why}
await P.cancel()             // the open pickers' Cancel -> how many closed
P.top()                      // the topmost open picker, or null
```

- `pick(value)`: a number is a Constant; a name (`'Revenue'`) or a path (`['OpEx', 'Bonus']`) is searched and
  picked with the panel's defaults (All, This Month). A name the tree shows more than once (an account and its
  KPI Library copy, e.g. `Accounts Payable (A/P)`) is refused, listing each one's path: pass a path with an
  ancestor that tells it apart (`['Current Liabilities', 'Accounts Payable (A/P)']`). `{path, options}` also sets
  side-panel choices, by the label the panel shows:

  | Option | Value |
  |---|---|
  | `Department` | a department's name, or `'This Department'` |
  | `Range` | a default or custom range's name (`'Last Quarter'`) |
  | `Reduction` | `'Sum'`, `'Average'`, … (a multi-month range) |
  | `Rounding` | a Balance Sheet Output's Driver Options: `'None'` (default), `'Round'`, `'Round Up'`, `'Round Down'` |
  | `Frequency` | a Balance Sheet Output's Driver Options: every N months (`Frequency: 3`) |
  | `Offset` | an Allocation In's Driver Options: a number (default 0) |
  | `Change` | `'Increase'` / `'Decrease'` (a Balance Sheet Output's Measure Type) |

  A Staffing element's Role isn't set by the kit (it stays All): the user sets it on the screen. If anything
  fails, `pick` cancels the picker and throws why (an unknown option names the known ones; "nothing named …").
- `range(name)` clicks the range's name only, never its EDIT / REMOVE.
- `month(title, value)`: `'Cutover Date'`, `'Min Date'`, `'Max Date'`, or `['Specific Date', 2022, 'Jul']`. If anything
  fails, `month` discards the dialog and throws why (and says so if the dialog is still open).
