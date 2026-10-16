# Report editing

**Scope: company-wide.** An edit to a LIVE package changes it for everyone who opens it; a PUBLISHED
package can't be edited. Finding, reading and opening reports: [reports.md](reports.md). For every
change, follow **Edits** in SKILL.md, and check the result with `jirav.getReportSetup(reportId)`.

## Where things are

Package-level (the report name ▾ in the header):

| Control | What it does | Saves |
|---|---|---|
| Picker: package names | Switch package; PUBLISHED section and **View All Published** list snapshots | — |
| **Manage packages** → **Add Package** | New package with the standard page set (copy of "All Reports"), named "All Reports N" | Immediately |
| Manage packages → row ⋯ → **Clone** | Copy of the package, named "<name> 1" | Immediately |
| Manage packages → rename (type in the name field) / **Move** / **Delete** | Delete has **no confirmation**: the row just disappears from the list | Only on **Save** in the dialog. **Close** discards |
| Manage packages → row ⋯ → **Publish Report**, **Share Package** (emails, as Share below) | Same as the header buttons | — |
| Header **PUBLISH** | Asks for a name (default `<package> <Mon YY>`), then creates a frozen PUBLISHED copy and opens it. The LIVE package stays | Immediately |
| Header **Actions → Add New → Report**, or sidebar ⊕ | Add a page: Name + template (Cover, Index, Text, Executive Summary, Income Statement, IS by Department, Balance Sheet, Cash Flow, Workforce, Staff List, Custom, Goals, A/R and A/P Aging, Dashboard: <name>). New grid pages default to Actuals, This Month. **Pick the template explicitly**: the dialog has a preselected default (one package: Index Page), and a missed click adds that page type silently | Immediately (added at the end) |
| Header **Share & Export → Share** | Shares the package with people or groups and **emails them**. Rarely used: only when the user asks, naming who; confirm first | Not tested: adding a person may send at once, before Done. Never type into the field to explore |
| Header **Share & Export → Export as …** | PDF / Excel / Google Sheet: see [exports.md](exports.md) | — |

Page-level:

| Control | What it does |
|---|---|
| Sidebar: hover a page → ⋮ | Rename, Delete, Move Up / Move Down (save at once; first/last page shows only one), Clone (same package), Clone To (ticks the *other* packages, then Save) |
| Page title ⋮ | Refresh, Export as Excel / Google Sheet ([exports.md](exports.md)), Expand / Collapse (All), Reset Row Expansion, Auto Size Columns |
| Right rail: Format (%) | Per row type (Row, Header, Sub Header, Total, Sub Total): font style / colour, fill, alignment, alternate-row colours. Per number type (Currency, Decimal, %): decimals, negatives `(100)`, **Display Scale** Whole / Thousands / Millions (no "K" or "000s" label appears anywhere: say the scale in a page title or note), symbols, errors. APPLY, then SAVE CHANGES |
| Right rail: Comments | Per page. Box (500 chars) → COMMENT posts at once. Comment ⋮: Reply, Resolve, Edit, Delete (confirms). Only post when asked; @mentions were not tested and may notify |
| Right rail: **Edit columns** | Department filter (tick departments; empty space closes it), Show Notes, Show Account Codes, Partial Total footnote, Merge headers, Show % Columns Of; column groups (⊕ adds one); per group: column headers, **Primary Source** (source: plans, Actuals, Current PoR; **not Goals**, though tiles can use Goals; Date Range, Show Dates By, multi-select: Months / Quarters / Year Halves / Years / Total), **Comparison Source #1/#2** (source + Relative Date Range: Same as Primary, Previous period / year, Next period / year, Year total, Year-to-date total), **Variance #** and **Variance %** (formula per Revenue and Expenses: A − B or B − A). Show % Columns Of: Revenue, Cost of Sales, OpEx, Net Income, Category, Sub Category (adds a % column after each value). Group ⋮: Rename, Clone, Delete, Move Left / Right. **Year total** puts the comparison's full-year figure beside every month |
| Right rail: Edit rows | Depends on the template (below). Every template has **Hide rows with zero amounts**, on by default: rows you add stay invisible until they have values |
| Right rail: **Package Settings** | One table of every page: Report Period and Column 1–3 Source / Period. Tick pages, set a value in the top row, **Apply**, then **SAVE**. Use this to roll a whole package to a new month |
| Text areas (✎) | Header text and "Tile Area" notes: a rich-text box (style, bold, italic, list). Type, click outside, then SAVE CHANGES |

**Edit rows by template:**

| Template | Options |
|---|---|
| Income Statement (and By Department) | Hide individual rows |
| Executive Summary, Custom | **Sections** of lines: Add Line (any series from the [variable picker](variable-picker.md), Depth from "Subtotal Only" to "Children up to max level", Subtotal show/hide), Add Table, Add Separator, Add Section. Executive Summary adds an Income Statement summary: Hide toggles per line, **Add Account Group** under Revenue / COGS / OpEx (name + accounts; the rest roll into "Other …"), Show OpEx By Account / Department / Department, Account, Show Headcount Summary |
| Balance Sheet | Hide Assets / Liabilities / Equity section |
| Workforce | Hide Cumulative Headcount / New Headcount / Salary Run Rate section |
| Staff List | (stored) hide terminated, actuals employees, planned hires, driver-based hires, Annual Wages column |
| Cover | Company, Title, Subtitle lines, each ✎. Stored as plain text: "Prepared on <date>" does **not** update itself |

**Saving page edits:** text areas and Edit columns / Edit rows **APPLY** only preview. A **SAVE CHANGES** bar
appears at the bottom (header buttons go grey) and nothing is stored until you click it; **Cancel**
or navigating away discards. Package Settings saves with its own **SAVE**.

## Gotchas

- **Applying a panel with no changes still leaves a pending SAVE CHANGES bar**, and while a right-rail
  panel is open `jirav.saveBar()` can't see the bar ("Please save or discard pending changes" blocks
  other panels). Close the panel (Discard), then Cancel the bar.
- In cover and text fields, select text with a triple-click; Ctrl+A doesn't select there.
- **Deleting a published snapshot (View All Published → ⋯ → Delete) happens at once, with no
  confirmation.** Say which snapshot before clicking.
- Manage packages hides Publish / Share in a row's ⋯ while the dialog has unsaved changes.
- Date ranges in Edit columns and Package Settings are the company's ranges
  ([date-ranges.md](date-ranges.md)); **+ ADD** there creates a company-wide range.

**Before building a comparison:**
- Relative ranges (This Month, This Year-to-date) follow **today**, not the close month: one "Current
  Mo" column showed Oct-26 while the close month was Apr-26. For closed-month comparisons use a
  Close-Month range ([date-ranges.md](date-ranges.md#today-vs-the-close-month)).
- **Actuals vs a rolling plan over closed months shows 0 variance**: a rolling plan's closed months
  *are* actuals. Compare to the budget (or a plan that wasn't rolled forward) for real variances.
- What each Δ means depends on the group's formula per section: [reports.md](reports.md).
