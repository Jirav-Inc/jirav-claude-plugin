# Dashboards

**Scope: company-wide.** Dashboards and their tiles belong to the company; changes show for
everyone. Tiles only *display* data from a source (Actuals, a plan, Current PoR); nothing here
changes plan values. Related: [reports.md](reports.md), [date-ranges.md](date-ranges.md). For
every change, follow **Edits** in SKILL.md.

## Find and read

```js
await jirav.listDashboards()                    // [{id, name, position}] position 1 = default
await jirav.listDashboardTiles(dashboardId)     // [{id, kind: CHART|TEXT, title, chart, source, compareTo, range, frequency, position}]
await jirav.getTileValues(dashboardId, tileId)  // {title, periods, columns?, rows: [[label, ...values]], overlay?}  tileId: the id, or the tile's exact title
```

`dashboardId`: the id, the name, or the URL slug (a name several dashboards share is refused, listing them).
A deleted dashboard's id still answers `listDashboardTiles` with `[]`, not an error: prove a dashboard is gone with
`listDashboards()` (or `D.remove`'s `gone`), not with an empty tile list.
Tiles are charts, so `jirav.readGridValues()` can't read them. `getTileValues` returns the numbers
behind a chart tile (e.g. Balance Sheet: Assets / Liabilities / Equity by month, overlay Cash On
Hand). `NUMBER` tiles have one `TOTAL` period such as `2026-07..2026-09`; percentages come back
as fractions (0.5786 = 58%). **With a comparison on**, each period comes back twice, and `columns`
says which is which: `value, compare`; `periods` gives each column its own dates (vs Previous Year, the
compare column is the year before). A tile with variances switched on (Tile Builder → Variance # / Variance %, on
Horizontal Bar, Number and Table) adds a column per period for each: `delta`, `deltaPct` (both on: `value, compare,
delta, deltaPct`). A dashboard page inside a report: its id is
`listReportPages(...).dashboardId`. Text tiles have no values (and often `title: null`): their content
comes back as plain text in `listDashboardTiles(...).text` and `getTileValues` → `{title, text}`
(pictures as "[image]").

## Open

`/<tenant>/dashboard/<dashboardId>` (redirects to `/dashboard/<name-slug>`), or
`await jirav.dashboards.open(name)` (below). Title: `<Dashboard> | Dashboard | <Company> | Jirav`.

## Where things are

| Control | What it does |
|---|---|
| Dashboard name ▾ → **MANAGE DASHBOARDS** | List (max 50), drag ⠿ to reorder, rename in the field; row ⋮ → Add / Clone (named "<name>_1") / Delete |
| **Actions → Add New** | Tile, Text Tile, Income Statement Tile, Balance Sheet Tile |
| Tile ⋯ | Edit, Clone, Delete, Export (PNG / PDF / SVG / CSV: [exports.md](exports.md)), Full Screen. Open one item with `await jirav.dashboards.tiles.menu(tile, item)` (tile by title or `{id}`) |
| Right rail ⚙ | **Dashboard Settings**: one row per chart tile (Name, Source, Compared to, Periodicity) and a bulk bar for many tiles; one Save |
| **Share & Export → Share** | Shares the dashboard with people or groups by name or email and **emails them**. Only when the user asks, naming who; confirm before Done. Not tested: adding a person may send at once, before Done. Never type into the field to explore |
| **Share & Export → Export as PDF** | See [exports.md](exports.md) |

**The Tile Builder** (Actions → Tile, or a tile's ⋯ Edit; **ADD** / **SAVE** / **CANCEL** top right): Tile Name;
type (Vertical Bar, Line, Horizontal Bar, Number, Table, Stacked Vertical Bar, Donut); Tile Data: Primary Source
(Actuals, each active plan, Current PoR, and **Goals**: unlike report columns, tiles can show goals; when you add or
change a tile, use the named plan, not Current PoR, unless the user asks for it by name), Comparison Source
(another source, Previous Year, Previous Period or None), Selection Type (Data Series / Dimensions), data series
list (⋮ per series, **ADD DATA SERIES**); Overlay line; Time: Date Range (company ranges), Show Dates, Show Actuals
Until; Data Display options. **Number, Donut and Horizontal Bar have no Show Dates**: they show the range's total.
The preview's **Data** tab shows the tile's numbers as a table. **Selection Type → Dimensions** replaces the series
list with **SELECT DIMENSIONS**: one element (e.g. Operating Expenses), "Show … By" Account or Department, plus
filters. It draws one series per account or department, and disables Horizontal Bar and Number. Tile ids differ in
a cloned dashboard: list them again.

## Change dashboards and tiles

Use `jirav.dashboards` (`(await jirav.page()).blocks` names it
on a dashboard). Each call is one step through Jirav's own screens and saves at once: there is no later Save.

```js
const D = jirav.dashboards;
await D.create(name)              // -> {ok, id} | {ok, already, id}      names up to 40 characters
await D.rename(from, to)          // -> {ok, id} | {ok, already, absent?}  absent: `from` isn't there, `to` is
await D.remove(name)              // -> {ok, gone} | {ok, gone, already}  answers Jirav's "Are you sure" itself
await D.open(name)                // -> {ok, id} | {ok: false, pending: true, call, why}  still loading: make `call` next
// on the open dashboard; a tile is its exact title, or {id}
await D.tiles.list()              // -> [{id, title, type, row, col, sizeX, sizeY}]
await D.tiles.add({title, type, source, compare?, series: [path, ...], range?, frequency?}, {sameTitle}?)
                                  // -> {ok, id, setup} | {ok, already, id} | {ok: false, exists: [tiles, each with differs], why}
await D.tiles.edit(tile, changes) // same keys -> {ok, id, staged, setup} | {ok, already, id}
await D.tiles.move(tile, row, col)       // -> {ok, layout, pushed: [titles]}
await D.tiles.resize(tile, sizeX, sizeY) // -> {ok, layout, pushed}
await D.tiles.clone(tile)         // -> {ok, id, title, position}  the copy keeps the title, placed below
await D.tiles.remove(tile)        // -> {ok, gone}
await D.tiles.settings({rows?: {title: {name?, source?, compareTo?, periodicity?}},
                        bulk?: {select: 'all' | [titles], source?, compareTo?, periodicity?}})
                                  // -> {ok, changed} | {ok, already} | {ok, changed, more, call}
```

- `type`: as the builder names it (`'Vertical Bar'`, `'Line'`, `'Number'`…). `source` / `compare`: as the builder
  lists them (`'Actuals'`, a plan's name, `'Current PoR (<plan>)'`; compare also `'Previous Year'`,
  `'Previous Period'`, `'None'`). `series`: [picker paths](variable-picker.md#the-kit)
  (`[['Income Statement (IS)', 'Revenue']]`). `range`: a range's name as `listDateRanges()` lists it. `frequency`:
  `'Monthly'`, `'Quarterly'`, `'Yearly'`, `'Total'`; leave it out for Number, Donut and Horizontal Bar (refused: no
  Show Dates). Left out, `range` is Jirav's default, **Trailing 6 months**: say so when you show the change, or give
  the range the user wants. New tiles are 2×2, placed by Jirav.
- **The Ranges dialog is pick only**: `range` picks an existing range and presses the dialog's own Save
  (`jirav.pickers.range`). Never add, edit or remove a range from a tile; a range the company doesn't have is
  [date-ranges.md](date-ranges.md), its own change and its own yes.

### Every change: show it, get the yes, one call

1. **Read first**: `listDashboards()`, then `D.open(name)` and `D.tiles.list()` (or `listDashboardTiles` for sources
   and ranges). The tile list is also the undo for a move or resize: keep it.
2. **Show the user what will change** (dashboard, tile, each field old → new, or the new layout) and that every
   viewer of the dashboard sees it. On a dashboard others rely on, offer to clone it (Manage Dashboards) and change
   the copy. **A delete names the exact dashboard or tile.**
3. **On the yes, make one call** for that step, in a browser call of its own; several steps are several calls,
   each covered by the same yes.
4. **Report from its result**, not from the screen: `setup` (what Jirav saved), `layout` and `pushed`,
   `changed`. `already`: it was there; nothing was done.

### Results that need you

- **`ok: false` with `saved: false`**: Jirav didn't save (the screen was cancelled; GET unchanged). Tell the user
  what was not saved and why (`why`, `errors`).
- **`why` says the Tile Builder or Dashboard Settings is still open** (also after `saved: 'unknown'`, once a re-read
  shows the save has ended): close it before the next call with its own **Cancel** (or the ✕ top right, when
  Cancel is gone), then **Discard**. Nothing of it is saved.
- **`created: [{id, name}]`** (with `ok: false`) from `create`: Jirav added that dashboard before the call stopped. It
  stays. Never create again; tell the user, and rename or remove it on their word.
- **`absent`** from `rename`: `from` isn't there but `to` is, so nothing was done. Check `from` wasn't a typo.
- **`saved: 'unknown'`, or any other `ok: false`**: re-read (`D.tiles.list()`, `listDashboardTiles`) and tell the user
  what is there now. **Never retry blindly**: a second call can add a second tile.
- **`already`** compares only the keys you give: an `add` without `range` is `already` when a tile with that title,
  type, source and series exists, whatever its range. Give every key the user cares about.
- **Tile values all `null`** (`getTileValues`): the tile's range has no data in its source (e.g. no actuals yet for
  those months). Tell the user, and offer the company's existing ranges (`listDateRanges()`, each with its `dates`)
  to pick from: `edit(tile, {range})`. A new company date range is a separate change
  ([date-ranges.md](date-ranges.md)) and needs its own yes.
- **`exists`**: the dashboard has a tile with that title set up otherwise; `differs` names what. Edit that tile
  instead, or ask; `{sameTitle: true}` adds a second tile with the same title only on the user's word.
- **One name, several things**: a dashboard name, a tile title, a source or a range that several share is refused,
  listing them (`candidates`); ask which, then pass a tile as `{id}`. Jirav lets a rename give a tile another tile's title,
  and every later call by that title is then refused: **check the new title isn't taken before renaming.**

### Dashboards

`create` adds the dashboard in Manage Dashboards and types its name; `rename` retypes it there; `remove` deletes it
there (Jirav's confirm doesn't name the dashboard: the kit matched the row first). `open` goes to it and waits for
its tiles.

### Add or edit a tile

`add` fills the builder in screen order and presses ADD once Jirav's preview shows those values; `edit` opens the
tile's ⋯ Edit, changes only the keys given, and presses SAVE the same way. **`series` in an edit replaces the tile's
series** (the tile keeps its id and place). Text, Income Statement and Balance
Sheet tiles aren't covered: use Actions → Add New and Jirav's own screens.

### Move and resize

The grid is 10 columns wide (col 0–9); tiles are at least 2×2. `move` puts the tile's top-left corner at
`{row, col}`; `resize` sets its width and height in cells. Jirav saves each drop at once.

- **Tiles float up, and a drop pushes others**: one move can move several tiles. The result's `layout` is the whole
  saved layout and `pushed` names every other tile that moved: tell the user both.
- **Undo**: move tiles back to the positions read before, top-left first.
- A new tile on an empty dashboard is placed at row 0, col 0, so `move(tile, 0, 0)` returns `already`.

### Dashboard Settings: many tiles at once

`settings` sets each tile's Name, Source, Compared to and Periodicity in one Save: `rows` per tile by title, `bulk`
for the same value on several (`select: 'all'` or titles). Use it for any change to more than one tile ("make every
tile Yearly", "point all tiles at Budget 2027"). `changed` lists what it set. In a window too narrow for Settings'
Name column, Settings saves the other changes and the renames come back as `more` with `call`: make `call` next, as
written, until a result has no `call` (each makes one rename through the tile's Edit). After a failed Settings save
the renames are listed in `notMade` instead, with no `call`.
