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
| Source | Where a page's numbers come from: `jirav.listReportSources()`. **Current PoR** (`id: 'por:Current POR'`) follows whichever plan is the plan of record; its `pointsTo` is that plan's `shortName`. Another `PLAN_OF_RECORD` entry, the plan's own row, has the plan's description in `pointsTo`: don't use it. When you add or change a column, use the named plan (e.g. `2026 Budget`), not Current PoR, unless the user asks for Current PoR by name: Current PoR moves whenever the PoR changes. |
| Column group | A page's columns: primary source + date range, optional comparison source(s) and variance #/%. |

## Find and read

```js
await jirav.listReports()               // [{id, name, status, lastUpdateTime}] newest first
await jirav.listReportPages(reportId)   // [{name, type, hasGrid, slug, dashboardId?}]  slug = the page's URL segment; dashboard pages: the dashboard's id for listDashboardTiles
await jirav.getReportSetup(reportId)    // reportId optional on an open report; per page: [{page, type, template, departments, groups: [{source, range, rangeDates, warning?, show, compareTo, thirdSource, variance}]}]
await jirav.listReportSources()         // [{id, name, type, planId?, pointsTo?, dates}]
```

- `getReportSetup` answers "what does this page compare, over which period" without opening it.
  A group whose range falls outside its source's data gets a `warning` (the page will be empty):
  tell the user instead of exporting blanks (if they still want the file, export it and say why it's
  empty), and offer to read the same numbers from the plan's own pages.
  `compareTo` includes its relative range, e.g. `Actuals (previous year)` or `Plan (year total)`; `percentOf` is the % column basis; `departments` is `all` or the
  filtered list. `jirav.page().reportSlug` is the URL slug, not an id: match `listReports()` by name.
  A source shown as `… (missing: deleted plan?)` means the page points at a plan that's gone: flag it.
- **What a Δ means:** `variance.formula` gives each group's Δ per section, e.g. `revenue: {delta:
  'Actuals − 2026 Budget', percentOf: 'Actuals'}`, `expense: {delta: '2026 Budget − Actuals'}`.
  Revenue rows are Revenue, margins and income lines; everything else is expense. The formula can
  differ between sections and between groups on one page (one BvA page had expense Δ = Budget −
  Actuals for the month and Actuals − Budget for YTD). Say which way a Δ runs before calling it
  over or under, and never judge from the sign or colour alone
  ([variance-and-cash-flow-settings.md](variance-and-cash-flow-settings.md)).
- Values: open the page and use `jirav.readGridValues()`. Columns carry `columnSources`
  (Actuals vs plan); Δ, % and "% of" columns have kinds `variance`, `variancePercent`,
  `percentOf`. Rows are `section` / `subtotal` / `line`: take totals by label, never by summing a
  depth ([reading-grid-values.md](reading-grid-values.md)).
- **Picking "the latest" report:** filter by `status` (e.g. `PUBLISHED` for a closed month-end
  pack), then take the newest `lastUpdateTime` among packages named like the one the user means
  (`<package> <Mon YY>`): skip test or scratch packages ("Test", "ZZ …", "… 1" clones), and say
  which you used. Publish names default to `<package> <Mon YY>` of
  the day it was published, so "Mar 26" often has February as its last actual month. Check
  `jirav.getPeriods().closeMonth` and the last `actual` column.
- **A published package's months are frozen** at publish time ("This Year" on a pack published in
  2025 still shows 2025). `getReportSetup` marks it `published: true` and leaves `rangeDates` empty
  (today's dates don't apply): read the months from the page (`readGridValues` → `periods`).
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
