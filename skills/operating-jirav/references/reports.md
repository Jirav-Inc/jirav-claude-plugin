# Reports

**Scope: company-wide.** Report packages and their pages belong to the company: an edit to a
LIVE package changes it for everyone who opens it. Reports only *display* data from a source
(Actuals, a plan, Current PoR, Goals); nothing here changes plan values. Related:
[dashboards.md](dashboards.md), [date-ranges.md](date-ranges.md),
[reading-grid-values.md](reading-grid-values.md). For every change, follow **Edits** in SKILL.md.

## Terms

| Term | Meaning |
|---|---|
| Package | A named set of pages (the "report"). `status`: `LIVE` (updates as data changes), `PUBLISHED` (frozen snapshot), `SYSTEM` (built-in "All Reports", read-only). Max 50 packages. |
| Page | One report in a package. `type`: `reportWithSources` (grid), `text`, `cover`, `index`, `dashboard`. `template` (e.g. `incomeStatement`, `balanceSheet`) is the page kind it was created from. |
| Source | Where a page's numbers come from: `jirav.listReportSources()`. **Current PoR** (`id: 'por:Current POR'`) follows whichever plan is the plan of record; its `pointsTo` is that plan's `shortName`. Another `PLAN_OF_RECORD` entry, the plan's own row, has the plan's description in `pointsTo`: don't use it. |
| Column group | A page's columns: primary source + date range, optional comparison source(s) and variance #/%. |

## Find and read

```js
await jirav.listReports()               // [{id, name, status, lastUpdateTime}] newest first
await jirav.listReportPages(reportId)   // [{name, type, hasGrid}]
await jirav.getReportSetup(reportId)    // per page: [{page, type, template, departments, groups: [{source, range, rangeDates, warning?, show, compareTo, thirdSource, variance}]}]
await jirav.listReportSources()         // [{id, name, type, planId?, pointsTo?, dates}]
```

- `getReportSetup` answers "what does this page compare, over which period" without opening it.
  A group whose range falls outside its source's data gets a `warning` (the page will be empty):
  tell the user instead of exporting blanks (if they still want the file, export it and say why it's
  empty), and offer to read the same numbers from the plan's own pages.
  `compareTo` includes its relative range, e.g. `Actuals (previous year)` or `Plan (year total)`; `percentOf` is the % column basis; `departments` is `all` or the
  filtered list. `jirav.page().reportSlug` is the URL slug, not an id: match `listReports()` by name.
  A source shown as `… (missing: deleted plan?)` means the page points at a plan that's gone: flag it.
- Values: open the page and use `jirav.readGridValues()`. Columns carry `columnSources`
  (Actuals vs plan) and `Δ` variance columns have no source.
- **Picking "the latest" report:** filter by `status` (e.g. `PUBLISHED` for a closed month-end
  pack), then take the newest `lastUpdateTime`. Publish names default to `<package> <Mon YY>` of
  the day it was published, so "Mar 26" often has February as its last actual month. Check
  `jirav.getPeriods().closeMonth` and the last `actual` column.
- Pages whose columns don't fit the question (e.g. months only, or quarter-to-date only): a published
  pack can't be changed. Total the exported months yourself (say so), or offer the LIVE package or a
  plan page.
- Page names are the customer's own (there may be no "Income Statement"; e.g. "SaaS P&L"). If
  several pages could fit, say which you used.
- The "Report Prepared On" footer is the render date, not the publish date.

## Open

| Target | Navigate to |
|---|---|
| Package (first page) | `/<tenant>/report/<reportId>` (redirects to `/report/<name-slug>/<first-page-slug>`) |
| Page | `jirav.pageLinks()` after opening the package; don't build slugs by hand (names with symbols are double-encoded) |

`/<tenant>/report` alone opens the last package you viewed. Published packages have slugs like
`<name-slug>-<id>`.

## Change a package or page

Adding pages, columns, comparisons, formats, rows, publishing, cloning and deleting:
[report-editing.md](report-editing.md). Exports: [exports.md](exports.md).

## Gotchas

- IDs are per company; always list, never reuse IDs from another company.
