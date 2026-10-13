# Dashboards

**Scope: company-wide.** Dashboards and their tiles belong to the company; changes show for
everyone. Tiles only *display* data from a source (Actuals, a plan, Current PoR); nothing here
changes plan values. Related: [reports.md](reports.md), [date-ranges.md](date-ranges.md). For
every change, follow **Edits** in SKILL.md.

## Find and read

```js
await jirav.listDashboards()                    // [{id, name, position}] position 1 = default
await jirav.listDashboardTiles(dashboardId)     // [{id, kind: CHART|TEXT, title, chart, source, compareTo, range, frequency}]
await jirav.getTileValues(dashboardId, tileId)  // {title, periods, rows: [[label, ...values]], overlay?}
```

Tiles are charts, so `jirav.readGridValues()` can't read them. `getTileValues` returns the numbers
behind a chart tile (e.g. Balance Sheet: Assets / Liabilities / Equity by month, overlay Cash On
Hand). `NUMBER` tiles have one `TOTAL` period such as `2026-07..2026-09`; percentages come back
as fractions (0.5786 = 58%). Text tiles have no values.

## Open

`/<tenant>/dashboard/<dashboardId>` (redirects to `/dashboard/<name-slug>`). Title:
`<Dashboard> | Dashboard | <Company> | Jirav`.

## Where things are

| Control | What it does | Saves |
|---|---|---|
| Dashboard name ▾ → **MANAGE DASHBOARDS** | List (max 50), drag ⠿ to reorder, rename in the field; row ⋮ → Add / Clone (named "<name>_1") / Delete | Add and Clone immediately; Delete asks to confirm but **doesn't name the dashboard** (names are truncated): rows follow `listDashboards()` position order, so count rows, then check the list after |
| **Actions → Add New** | Tile, Text Tile, Income Statement Tile, Balance Sheet Tile | |
| Tile ⋯ | Edit, Clone, Delete, Export (PNG / PDF / SVG / CSV: [exports.md](exports.md)), Full Screen | |
| **Share & Export → Share** | Shares the dashboard with people or groups by name or email and **emails them**. Only when the user asks, naming who; confirm before Done | Not tested: adding a person may send at once, before Done. Never type into the field to explore |
| **Share & Export → Export as PDF** | See [exports.md](exports.md) | |

**Edit Tile** (full-screen editor; **SAVE** / **CANCEL** top right): Tile Name; type (Vertical
Bar, Line, Horizontal Bar, Number, Table, Stacked Vertical Bar, Donut); Tile Data: Primary Source,
Comparison Source, Selection Type (Data Series / Dimensions), data series list (⋮ per series,
**ADD DATA SERIES**); Overlay line; Time: Date Range (company ranges), Show Dates, Show Actuals
Until; Data Display options. The preview's **Data** tab shows the tile's numbers as a table.
**Selection Type → Dimensions** replaces the series list with **SELECT DIMENSIONS**: one element (e.g.
Operating Expenses), "Show … By" Account or Department, plus filters. It draws one series per account
or department, and disables Horizontal Bar and Number. **SAVE** stores the tile at once (verified with
`listDashboardTiles` / `getTileValues`). Tile ids differ in a cloned dashboard: list them again.

## Move and resize tiles

The grid is 10 columns wide; positions are `{row, col, sizeX, sizeY}` in grid cells
(`listDashboardTiles` → `position`). The browser's own `left_click_drag` works on tiles; the
`dashboard-layout` block gives the exact points:

```js
// paste scripts/blocks/dashboard-layout.min.js, then:
await jirav.dashboardLayout.tiles()                              // {columns, tiles: [{title, row, col, sizeX, sizeY, grab, resize, visible}]}
await jirav.dashboardLayout.moveTilePoints('Revenue', 0, 4)      // {from, to} → left_click_drag from → to
await jirav.dashboardLayout.resizeTilePoints('Revenue', 4, 2)    // drag the tile's bottom-right corner handle
```

- **Each drag saves immediately** (no Save button). Say the change and its scope (every viewer of
  this dashboard) first; on a dashboard others rely on, offer to Clone it and rearrange the copy.
- **Record `listDashboardTiles` positions before the first drag**: that is the undo.
- Tiles **float up**; dropping a tile on a same-size tile swaps them, and on others pushes them, so
  one drag can move several. Wait ~2 s, then check `listDashboardTiles` (the saved layout, not just
  `tiles()`) and report the whole new layout. Undo: drag tiles back to the recorded positions,
  top-left first.
- Titles repeat? Pass `{row, col}` from `tiles()` instead of the title. Points are screenshot pixels.
- Drag a tile anywhere on its body (not the ⋯). Both points must be on screen: scroll first.
- **Growing a tile past the bottom of the screen:** the page only scrolls as far as the grid
  reaches. Drag the corner handle ~10 px down (it rounds up: +1 row), scroll down, repeat.
- Resizing rounds up to whole cells; `resizeTilePoints` already aims for that.
