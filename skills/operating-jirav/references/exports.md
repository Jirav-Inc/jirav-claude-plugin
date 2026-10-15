# Exports

**Scope: read-only for Jirav.** Exporting never changes anything in Jirav. Related:
[reports.md](reports.md), [dashboards.md](dashboards.md), [reading-grid-values.md](reading-grid-values.md);
the other direction is [imports.md](imports.md).

**The rule:** exports never trigger the browser's Save prompt and never go to the user's Downloads.
They're caught in the page with the `exports` block, read there, and moved into Claude's workspace
only when the file itself is needed. The user gets only the finished result.

## 1. Turn capture on first

```js
// if jirav.exports is missing after the restore line, paste scripts/blocks/exports.min.js; then:
jirav.exports.capture()   // before ANY Export click
```

Capture stays on across `jirav.go()`, and the restore line turns it back on after a reload. Check
with `window.__jiravExports.on`. An Export clicked while capture is off shows the user a Save prompt
that blocks the browser: if that happens, ask them to Cancel it, capture, and export again.

## 2. Export

| From | Click | File caught |
|---|---|---|
| One report page | Page title ⋮ → **Export as Excel** | `<Page>.xlsx`, one sheet |
| Whole package | **Share & Export → Export as Excel** | `<Package>.xlsx`, one sheet per page (Index first) |
| Whole package | **Share & Export → Export as PDF** → preview → **EXPORT** → *Select Reports for Download* (tick pages) → **Download** | `<Package>.pdf` |
| Dashboard | **Share & Export → Export as PDF** → preview → **EXPORT** | `<Dashboard>.pdf` |
| A plan grid | Right-click a cell → **Export** → CSV Export / **Excel Export** | `<Page>.xlsx` (e.g. `Operating Expenses.xlsx`, 11 KB) |
| One dashboard tile | Tile ⋯ → **Export** (click, it doesn't open on hover) → PNG / PDF / SVG / **CSV** | `<Tile>.csv`: `Time Period` + one column per series, UTF-8 with BOM |

Wait for it with `const f = await jirav.exports.wait()` (a package PDF takes up to ~15 s). It returns only a
file it hasn't returned before. `{timedOut: true}` means **no new file**: don't read anything, check the
Export and do it again; until a `wait()` succeeds, reads without an index refuse. Read the file by its
index, `readXlsx(f.i)`. Then:

```js
jirav.exports.list()   // [{i, name, size, type, at}], newest last
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
// CSV: atob((await jirav.exports.readBase64(i)).base64), strip the leading BOM
```

- **Subtotals and totals are formulas** (`SUBTOTAL(9,B10:B12)`) with no stored result, so other
  readers (openpyxl `data_only=True`, pandas) see blanks there. `readXlsx` calculates SUM and
  SUBTOTAL(9) so the totals match the page.
- Rows follow the sheet's layout: company name, page title, blank rows, a header row (`Account`,
  source), a period row (`Jan-26`, …), then accounts with `Subtotal …` / `Total …` lines.
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

The bytes pass through the conversation, so size matters. Excel exports are small (a page 4–20 KB,
a 10-page package ~20 KB). PDFs are not (a dashboard 160 KB, a 10-page package 770 KB): never
move a PDF to get numbers, only when the user needs that PDF.

## Notes

- Files caught in the page are lost on a reload: move what you need first.
- `jirav.exports.release()` switches capture off, so the next export prompts the user. Don't use it
  in normal work.
- A package PDF export can show the "Applying changes…" overlay for ~15 s. It changes nothing: `await jirav.waitIdle()`.
