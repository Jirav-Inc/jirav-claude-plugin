# Report editing

**Scope: company-wide.** An edit to a LIVE package changes it for everyone who opens it. "All Reports" (Jirav's
system package) and PUBLISHED packages can't be edited. Finding, reading and opening reports: [reports.md](reports.md).
Exports: [exports.md](exports.md). For every change, follow **Edits** in SKILL.md.

## Change packages and pages

Use `jirav.reports` (`(await jirav.page()).blocks` names it on a
report page). Each call is one step through Jirav's own screens. Packages and pages are named exactly (a package also
as `{id}`).

```js
const R = jirav.reports;
await R.packages.list()             // -> [{id, name, status, version}]
await R.packages.create(name)       // -> {ok, id} | {ok, already, id}   the 12 standard pages, under this name
await R.packages.clone(from, to)    // -> {ok, id, name, pages} | {ok, already, id}   a copy of a LIVE package, named `to`
await R.packages.rename(from, to)   // -> {ok, id} | {ok, already, id, absent?}
await R.packages.remove(name)       // -> {ok, gone} | {ok, gone, already, names}   Jirav asks nothing
await R.packages.open(name)         // -> {ok, id, pages: [names]} | {ok: false, pending: true, call, why}
await R.packages.pages({package, keep?: [names] | remove?: [names], add?: [{name, type}], rename?: {old: new}, order?: [names]})
                                    // Package Settings, one Save -> {ok, removed, renamed, added, pages}
                                    //   | {ok, already, pages, absent?, renamedBefore?} | {ok, …, more, call}
await R.pages.add(name, type)       // -> {ok} | {ok, already}   on the package open (packages.open), added last, saved at once
// the report page
await R.page.open(package, page)    // -> {ok, package, id, page, type, editable, why?}
await R.page.columns(spec)          // -> {ok, staged, unchanged, group, pending} | {ok, already, group?} | {ok, …, more, call}
await R.page.rows({hideZero})       // -> {ok, staged} | {ok, already}
await R.page.format({section: {list: value}})   // -> {ok, staged} | {ok, already}
await R.page.read()                 // the page as staged: getReportSetup's page + toggles, hideZero, format, pending, pristine, editable
await R.page.save()                 // SAVE CHANGES -> {ok, saved, version: [before, after], configMatches, errors?, differs?}
await R.page.cancel()               // -> {ok, dropped} | {ok, already}   drops what is staged (an open panel by its own Cancel)
```

Every call returns a promise, `page.read()` too: `await` it. In the results of `columns`, `rows` and `format`,
`pending: true` (with no `call`) means the edits are staged and the SAVE CHANGES bar is up, waiting for `save`.

**Packages and their pages:**
- `create` makes Jirav's standard set (Index, Executive Summary, Income Statement, Income Statement By Department,
  Balance Sheet, Cash Flow Statement, Workforce, Staff List, Custom, Goals, A/R Aging Summary, A/P Aging Summary)
  and names it.
- `pages` works on Package Settings' rows, with one Save for the whole spec:
  - `keep`: every other page is removed. `remove`: these pages. Give one, not both.
  - `add`: appended at the end.
  - `order`: the named pages go together, in that order, where the first of them stands; the others keep their order.
  - A name may be the page's name before this call's `rename` or after it.
- `type` (in `add` and `pages.add`), as Jirav lists it: `'Cover Page'`, `'Index Page'`, `'Text Page'`,
  `'Executive Summary'`, `'Income Statement'`, `'Income Statement by Department'`, `'Balance Sheet'`,
  `'Cash Flow Statement'`, `'Workforce'`, `'Staff List'`, `'Custom'`, `'Goals'`, `'A/R Aging Summary'`,
  `'A/P Aging Summary'`, or `'Dashboard: <dashboard name>'`.
- **Page names are unique in a package**: Jirav refuses a second page with a name, and so does a spec that would give
  two pages one name.
- **Page ids change** after a Package Settings Save, and a renamed page gets a new URL slug: read the pages again
  (`packages.open`, `jirav.pageLinks()`) and work by names, never by an id read before.
- `listReportPages` lists "Executive Summary Chart" as an entry of its own beside Executive Summary (13 for the
  standard set); `packages.open` and Package Settings list 12.

**The page.** `columns`, `rows` and `format` only stage: each uses its panel's own APPLY, and nothing is saved until
`save`. The `columns(spec)` keys, all optional:
- `departments`: `[names]` (as `listDepartments()` names them) or `'All'`.
- `toggles`: `{'Show Notes': bool, 'Show Account Codes': bool, 'Show Footnote for "Partial Total"': bool}`.
- `group`: `1` (the first, the default), a group's name, or `'new'`. A new group starts as Actuals, This Year, months,
  no comparison; the keys given change it.
- Per group:
  - `source`: as Edit columns lists it (`'Actuals'`, a plan's name, `'Current PoR'`). Use the named plan, not
    Current PoR, unless the user asks for it.
  - `range`: a range's name as `jirav.listDateRanges()` lists it. It is picked in the Ranges dialog, never added or
    changed there.
  - `datesBy`: any of `['Months', 'Quarters', 'Year Halves', 'Years', 'Total']`.
  - `compare` (Comparison Source #1): `{source, relative}` or `false`. `relative`: `'Same as Primary'`,
    `'Previous period'`, `'Previous year'`, `'Next Period'`, `'Next Year'`, `'Year total'`, `'Year-to-date total'`
    (or Jirav's keys `0`, `PREVIOUS_PERIOD`, `-12`, `NEXT_PERIOD`, `12`, `YEAR_TOTAL`, `YEAR_TO_DATE_TOTAL`).
    **Year total** puts the comparison's full-year figure beside every month.
  - `varianceNumber` (Δ #): `{rev, exp}` or `false`, one formula per section (Revenue, Expenses), by its key:
    `PRIMARY_VS_COMP1` (primary − comparison) or `COMP1_VS_PRIMARY` (comparison − primary).
  - `variancePercent` (Δ %): `{rev, exp}` or `false`, keyed `minuend:subtrahend:divisor` of `SOURCE` (primary) and
    `COMPARE_TO` (comparison #1): `'SOURCE:COMPARE_TO:COMPARE_TO'` = (primary − comparison) / comparison.
  - A variance needs `compare` on. Comparison Source #2 and variances against it are by hand (below).

`rows({hideZero})` sets "Hide rows with zero amounts"; a new page already hides them. `format` takes a Format section
and list by their labels, and the value by its text: `{Currency: {'Display Scale': 'Thousands'}}`. Thousands and
Millions add no "K" or "000s" label to the page: say the scale in a title or note.

### Every change: show it, get the yes, one call

1. **Read first**: `R.packages.list()`, `R.packages.open(name)` (its pages), and for a page
   `jirav.getReportSetup(id)`, or `R.page.open` + `R.page.read()`.
2. **Show the user what will change**: package, page, each setting old → new, and that everyone who opens the package
   sees it. On a package others rely on, offer to work on a copy (below).
   - **A delete names exactly what goes.** For `keep`, work out every page it removes from `packages.open`'s list
     and name them all. Jirav asks nothing before deleting a package or a page.
3. **On the yes, make one call** per step, each in a browser call of its own. Several steps are several calls,
   covered by the same yes.
4. **Report from the result**, not from the screen: `removed`, `renamed`, `added`, `pages`; `saved`, `version`.

**Page edits** run the same way, except staging comes first:

1. Stage on the open page with `R.page.columns(…)`, `R.page.rows(…)` and `R.page.format(…)`.
2. Show the user `await R.page.read()`: sources, ranges, comparisons, Δ formulas, toggles, zero rows, format.
3. On the yes, `R.page.save()`. Without one, `R.page.cancel()`.
4. Report `saved` (and `version`), or what wasn't kept.

### Recipes

- **A package of chosen reports**: `R.packages.create('<new name>')`, then one
  `R.packages.pages({package: '<new name>', keep: ['Income Statement', 'Balance Sheet']})`. `rename`, `order` and
  `add` can go in the same call. The yes names the 10 pages `keep` removes.
  - **If `create` returns `already`**, a package with that name was there before: it may be someone's real package.
    Don't run `keep` on it. Open it, show the user its pages and what `keep` would remove, and ask again, or pick a
    new name.
- **A copy of an existing package**: `R.packages.clone('<package>', '<new name>')`, one call (Manage packages → the
  row's ⋯ → Clone → the copy's name → Save). The copy has the source's pages; `pages` lists them.
  - The copy's name follows `create`'s rules: up to 40 characters, not the source's own name, and not another
    package's name in a different case (Jirav compares names in any case). All of these are refused before anything
    opens. The exact name of another package returns `already` (below).
  - Only a LIVE package has a Clone. "All Reports" (the system package) isn't listed in Manage packages:
    `R.packages.create` makes a new package from it. A published package is refused too.
  - **If `clone` returns `already`**, a package with that name was there before: it may be someone's real package,
    not a copy. Don't change it. Show the user its pages (`packages.open`) and ask, or pick a new name.
- **A copy of one report** (a page): clone its package, then `R.packages.pages({package: '<new name>', keep:
  ['<the page>']})` if the user wants only that page. When the request doesn't say which (the whole package, or the
  page alone), ask before cloning. The yes for `keep` names the pages it removes from the copy.
- **A variance column group**: on the open page, `R.page.columns({group: 'new', source: 'Actuals', range: 'This
  Year', compare: {source: '<a plan as Edit columns lists it>', relative: 'Same as Primary'}, varianceNumber: {rev:
  'PRIMARY_VS_COMP1', exp: 'COMP1_VS_PRIMARY'}})`. Add `departments: ['<department>']` for a department filter. Then read, get the yes, and save. Say
  which way each Δ runs ([reports.md](reports.md#find-and-read)).
- **Remove one page**: `R.packages.pages({package, remove: ['Goals']})`. **Remove a package**:
  `R.packages.remove(name)`.

### Results that need you

- **`saved: false`** (`page.save`, `pages`, `create`, `rename`, `remove`): Jirav didn't keep it.
  - Tell the user what was not saved and why (`why`, `errors`; `differs` names the settings).
  - After a failed `page.save`, the page still shows the edits, unsaved, with no SAVE CHANGES bar. `page.cancel()`
    drops them.
- **`saved: true` with `ok: false` and `errors`**: GET shows it kept, but Jirav showed an error during the save.
  Tell the user the `errors`, and re-read to confirm what is there.
- **`saved: 'unknown'`**: the kit can't tell what was kept (Jirav's save didn't end in time, GET shows a change other
  than the one asked, or GET couldn't be read). Re-read (`R.page.read()` and `getReportSetup`, or
  `packages.open`) and tell the user what is there now. **Never retry blindly.**
- **`created: [{id, name}]`** (with `ok: false`) from `create` or `clone`: Jirav added that package before the call
  stopped. It stays. Never create or clone again; tell the user, and rename or remove it on their word.
- **`already`**: the effect is there, so nothing was done. **A typo can read as already**:
  - a page to `remove` that isn't there is listed under `absent`;
  - a page rename already made comes back as `renamedBefore`;
  - `packages.remove` of a name not there returns `names` (the packages there);
  - `packages.rename` whose `from` is missing but whose `to` exists is `already`, with `absent: from`;
  - `packages.clone` whose `to` exists is `already`, whatever that package holds.

  Compare the returned names with what the user asked before saying it's done.
- **Refused with `candidates`**: a name not found (in `keep`, `order`, a page to open, a column group), or one name
  that several things share (two packages, two column groups). Nothing was done: ask which, then give the
  exact name, or the package as `{id}`.
- **`editable: false`** (or a `why` naming the system package, a published package, or a read-only package): the kit
  treats "All Reports" and published packages as read only and refuses every write before any panel opens. Work on
  a LIVE package: a new one, or a copy.
- **`more` with `call`**: the call ran out of time. What it reached is saved (or, on a page, staged). Make `call`
  next, as written: it carries only what's left. **`pending` with `call`**: the package or page is still loading. Make
  `call`, then the same call again.
- **"unsaved changes (its SAVE CHANGES bar is up)"**: `packages.pages`, `pages.add` and `page.open` won't leave a page
  with staged edits. Save them (on the yes) or `R.page.cancel()` first.
- **An error thrown**: a key, toggle, section or list the kit doesn't know; a source, department or range not
  found; or a page whose Variance has one Calculation formula instead of Revenue / Expenses (the Balance Sheet). Its
  message names what it takes, or what is there. Any panel
  it opened is closed, and nothing is staged.
- **`ok: false` with only `why`** (or `exists`: a page with that name is already there): nothing was done, e.g. a
  name Jirav wouldn't take, or the company at its package limit. Tell the user the `why`.
- **`ok: false` with `differs`**: Jirav's staged page doesn't hold what the call set. Run `R.page.read()` and tell the
  user.

## Where things are

The header (the package name ⌄ opens the picker):

| Control | What it does |
|---|---|
| Picker: package names | Switch package; **View All Published** lists the published copies |
| Picker → **Manage packages (N)** | Packages as rows: name field, ⋯ (Publish Report, Share Package, Clone, Move, Delete), Add Package, Save, Close. Create, clone, rename and delete through the kit. Its **Close** goes back to the package list and leaves it open, over a backdrop that covers the page: by hand, `jirav.close()` next |
| **PUBLISH** | Asks for a name (default `<package> <Mon YY>`), then makes a frozen PUBLISHED copy and opens it. The LIVE package stays |
| **Share & Export → Share** | Shares the package with people or groups and **emails them**. Only when the user asks, naming who; confirm first. Not tested: adding a person may send at once, before Done. Never type into the field to explore |
| **Share & Export → Export as …** | PDF / Excel / Google Sheet: [exports.md](exports.md) |

The right rail, top to bottom (as `jirav.ui()` labels them): Comments (`icon:mode_comment`), Format (`icon:percent`),
Edit columns (`icon:view_column`), Edit rows (`icon:table_rows`), Package Settings (`icon:settings_applications`).

| Panel | What's there; the parts beyond the kit are by hand |
|---|---|
| **Edit columns** | Report level: Department Filter, Show Notes, Show Footnote for "Partial Total", Show Account Codes (some page types have more toggles: by hand). **Each group's tab** has its own Column Headers (header rows, **Merge headers when possible**, **Show % Columns Of**: None, Revenue, COGS, OpEx, Net Income, Category, Sub Category, adding a % column after each value), then Primary Source, Comparison Source #1 / #2, Variance # / %. Group ⋮: Rename, Clone, Delete, Move. Sources don't include Goals (tiles can show goals) |
| **Edit rows** | Depends on the template (below). Every template has Hide rows with zero amounts |
| **Format** | Per row type (Row, Header, Sub Header, Total, Sub Total): font style, colours, alignment. Per number type (an Income Statement has Currency $ and Percent %): decimals, negatives, Display Scale, symbols, errors. Colours are by hand |
| **Package Settings** | The pages as rows (name, type, ⋯ Add Report / Clone / Move / Delete), plus each page's Report Period and Column 1–3 Source / Period. To roll a whole package to a new month (by hand): tick pages, set a value in the top row, **Apply**, then **Save** |
| Comments | Per page. The box (500 characters) → COMMENT posts at once. Only post when asked; @mentions were not tested and may notify |

**By hand, for what the kit doesn't cover** (on the open page, after the yes for the whole change):
1. Open the panel with its rail button and act with `jirav.ui()` and `jirav.click`.
2. Press its **APPLY**, then use `R.page.read()`, `R.page.save()` and the results above, as for a kit call.
3. Leaving without APPLY: `R.page.cancel()`.

For example, Show % Columns Of is set in a group's tab, so each group has its own; `read()` shows it as that group's
`percentOf`.

**Edit rows by template:**

| Template | Options |
|---|---|
| Income Statement (and By Department) | Hide individual rows |
| Executive Summary, Custom | **Sections** of lines: Add Line (any series from the [variable picker](variable-picker.md), Depth from "Subtotal Only" to "Children up to max level", Subtotal show/hide), Add Table, Add Separator, Add Section. Executive Summary adds an Income Statement summary: Hide toggles per line, **Add Account Group** under Revenue / COGS / OpEx (name + accounts; the rest roll into "Other …"), Show OpEx By Account / Department / Department, Account, Show Headcount Summary |
| Balance Sheet | Hide Assets / Liabilities / Equity section |
| Workforce | Hide Cumulative Headcount / New Headcount / Salary Run Rate section |
| Staff List | (stored) hide terminated, actuals employees, planned hires, driver-based hires, Annual Wages column |
| Cover | Company, Title, Subtitle lines, each ✎. Stored as plain text: "Prepared on <date>" does **not** update itself |

**Text areas** (✎: header text, "Tile Area" notes) are rich-text boxes: type, click outside, then save as above. In
cover and text fields, select text with a triple-click; Ctrl+A doesn't select there.

## Gotchas

- **Panels close only with their own CANCEL / Discard** (`R.page.cancel()` does it). Never press Escape, never click
  outside a panel that has changes, and never navigate away from staged edits.
- **Sidebar page ⋮ menus** (Rename, Delete, Move, Clone) appear only under a real mouse hover, so the kit's clicks
  can't open them. Rename, delete, add and reorder pages with `R.packages.pages` (Package Settings).
- **Names typed in Manage packages and Package Settings count only about half a second after the last key**, once
  Jirav has validated them. A Save pressed sooner saves nothing, yet the screen closes. The kit waits for it; by
  hand, wait until Save is enabled, and read the result back.
- **Deleting a published copy (View All Published → ⋯ → Delete) happens at once, with no confirmation.** Say which
  copy before clicking.
- Manage packages hides Publish / Share in a row's ⋯ while it has unsaved changes.
- Date ranges in Edit columns and Package Settings are the company's ranges ([date-ranges.md](date-ranges.md)). A
  range the company doesn't have is its own change, with its own yes.

**Before building a comparison:**
- **"Budget" with no plan named**: when the user says "budget" and neither names a plan nor has a plan called a
  budget, ask which plan to compare against, listing the plans (`jirav.listPlans()`). Jirav has no budget type: a
  plan is `PLAN_OF_RECORD` or `ROLLING`, whatever it holds.
- **A range with no data**: when the period asked for has no data (a `warning` from `getReportSetup` that the page
  will be empty, or the values read back blank), tell the user. Don't pick another range in its place. A new date
  range is a separate, company-wide change ([date-ranges.md](date-ranges.md)), with its own yes.
- Relative ranges (This Month, This Year-to-date) follow **today**, not the close month: one "Current
  Mo" column showed Oct-26 while the close month was Apr-26. For closed-month comparisons use a
  Close-Month range ([date-ranges.md](date-ranges.md#today-vs-the-close-month)).
- **Actuals vs a rolling plan over closed months shows 0 variance**: a rolling plan's closed months
  *are* actuals. Compare to the budget (or a plan that wasn't rolled forward) for real variances.
- What each Δ means depends on the group's formula per section: [reports.md](reports.md).
