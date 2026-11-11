# Exports

**Scope: read-only for Jirav.** Exporting never changes anything in Jirav. Related:
[reports.md](reports.md), [dashboards.md](dashboards.md), [reading-grid-values.md](reading-grid-values.md);
the other direction is [imports.md](imports.md).

**The rule:** exports never trigger the browser's Save prompt and never go to the user's Downloads.
They're caught in the page with `jirav.exports`, read there, and moved into Claude's workspace
only when the file itself is needed. The user gets only the finished result.

## 1. Turn capture on first

```js
jirav.exports.capture()   // before ANY Export click
```

Capture stays on across `jirav.go()`, and after a reload the kit's first call turns it back on. Not sure
it's on? Call `capture()` again: it's harmless and answers `'capturing'`. An Export clicked while capture is off shows the user a Save prompt
that blocks the browser: if that happens, ask them to Cancel it, capture, and export again.

## 2. Export

**First check the page covers what the user asked.** A report page's columns follow its own range:
one "IS by Department" page exported **Jan – Feb '26 vs Jan – Feb '25** (year to date), not last month.
Read `jirav.getReportSetup(reportId)` → the page's `groups[].range` / `rangeDates` and compare them
with the ask (a month, quarter, YTD, trailing 12). If they differ, say so and offer a page that
matches, a plan page with the Department filter, or `readGridValues`. State the period in the result.

| From | Click | File caught |
|---|---|---|
| One report page | Page title ⋮ (`icon:more`, a button) → **Export as Excel** | `<Page>.xlsx`, one sheet |
| Whole package | **Share & Export → Export as Excel** | `<Package>.xlsx`, one sheet per page (Index first). **Dashboard pages are left out**, and `/` in a page name becomes `_` ("A_R Aging Summary"): match sheets to pages that way |
| Whole package | **Share & Export → Export as PDF** → preview → **EXPORT** → *Select Reports for Download* (tick pages) → **Download** | `<Package>.pdf` |
| One report page as PDF | The page title ⋮ has no PDF: **Share & Export → Export as PDF** → **EXPORT** → *Select Reports for Download* opens with **every page ticked** (its header box can show unticked: its first click ticks all, the second clears) → tick that page → **Download**. The boxes have no labels: `jirav.click({kind: 'checkbox', where: 'Select Reports for Download', nth: n})`, the header box `nth: 0`, then the pages in the package's order (`listReportPages`) from 1. Wait for the preview's **Export** button before clicking it (labels match whatever their case) | `<Package>.pdf`, named after the package, holding that page |
| Dashboard | **Share & Export → Export as PDF** → preview → **EXPORT** | `<Dashboard>.pdf` |
| A plan grid | Right-click a cell → **Export** → CSV Export / **Excel Export** | `<Page>.xlsx` (e.g. `Operating Expenses.xlsx`, 11 KB) |
| One dashboard tile | `await jirav.dashboards.tiles.menu('<tile title>', 'Export')` (the tile's ⋯ → Export; `items` lists the formats), then `await jirav.click({label: 'Comma Separated Values (.csv)'})` (or the PNG / PDF / SVG item) | `<Tile>.csv`: `Time Period` + one column per series, UTF-8 with BOM. **A month with no data is 0 in the CSV** (`getTileValues` gives null): don't report it as a value |

Wait for it with `const f = await jirav.exports.wait()` (a package PDF takes up to ~15 s). It returns only a
file it hasn't returned before. `{timedOut: true}` means **no new file**: don't read anything, check the
Export and do it again; until a `wait()` succeeds, reads without an index refuse. Read the file by its
index, `readXlsx(f.i)`. Then:

```js
await jirav.exports.list()   // [{i, name, size, type, at, path, saved}], newest last
```

Don't use:
- **PDF SETTINGS → Save** in the PDF preview: it changes the package's stored layout for everyone
  (Cancel to just export).
- **Export as Google Sheet**: it creates a file in the user's Google account. Only on request, and
  say so first.

## 3. Read it in place

```js
await jirav.exports.readXlsx(f.i)                   // {name, sheets: [{name, rows, formulaCells}]}
await jirav.exports.readXlsx(i, {formulas: 'text'}) // formulas as "=…" instead of values
// CSV: new TextDecoder().decode(Uint8Array.from(atob((await jirav.exports.readBase64(i)).base64), c => c.charCodeAt(0)))  (UTF-8, BOM dropped)
// readBase64 reads 150 KB at a time: {offset (bytes), length, done}; next chunk at offset + length
// a PDF's page count, in place: (atob((await jirav.exports.readBase64(i)).base64).match(/\/Type\s*\/Page[^s]/g) || []).length
```

- **Subtotals and totals are formulas** (`SUBTOTAL(9,B10:B12)`) with no stored result, so other
  readers (openpyxl `data_only=True`, pandas) see blanks there. `readXlsx` calculates SUM and
  SUBTOTAL(9) so the totals match the page.
- Rows follow the sheet's layout: company name, page title, blank rows, a header row (`Account`,
  source), a period row (`Jan-26`, …), then accounts with `Subtotal …` / `Total …` lines.
  A **by-department page** differs: after the blank rows comes a **department row** (one name per
  column group), then one row with `Account` and the period labels ("Jan - Feb '26").
- **A plan grid export** has `Account, Department, <months>` and no actual / forecast marker: take
  that from `jirav.getPeriods(planId)`.
- For plain numbers by period, `jirav.readGridValues()` on the page is often simpler. Export when
  you need every page of a package at once, the exact layout, or the file itself.

## 4. Move it into Claude's workspace (only when the file itself is needed)

1. `await jirav.exports.readBase64(i)` returns up to 150 KB as base64; repeat with `{offset}` until
   `done` is true.
2. Decode it into the session workspace (`base64 -d`), in a folder per company, adding the date when
   keeping several runs of the same export. Check the byte size matches `list()`.
3. Work on it there (xlsx / pdf skills, Python), remembering subtotals have no stored values.
4. Give the user the finished result, in the chat or in a folder they name. The raw export stays in
   the workspace unless they ask for it.

If the user only wants the export file itself, don't move it through the conversation: it's already
saved in the file store (`ex.list()` gives its `path`), so `await jirav.files.export(path)` downloads it
in one go; tell them to approve the download prompt ([file-store.md](file-store.md)).

The bytes pass through the conversation, so size matters. Excel exports are small (a page 4–20 KB,
a 10-page package ~20 KB). PDFs are not (a dashboard 160 KB, a 10-page package 770 KB): never
move a PDF to get numbers, only when the user needs that PDF. Over ~1 MB (a large package PDF is
several MB, dozens of reads), don't move it: export fewer pages, or summarize from the page.

## Notes

- Files caught are also saved in the file store, so a reload loses nothing: `await jirav.exports.load(path)`
  brings one back (paths from `jirav.files.list('<company>/exports/')`).
- `jirav.exports.release()` switches capture off, so the next export prompts the user. Don't use it
  in normal work.
- A package PDF export can show the "Applying changes…" overlay for ~15 s. It changes nothing: `await jirav.waitIdle()`.
