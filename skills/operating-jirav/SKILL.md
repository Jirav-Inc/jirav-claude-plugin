---
name: operating-jirav
description: Operates the Jirav FP&A web app (app.jirav.com) in Claude's browser. Finds companies, plans, report packages, dashboards, drivers, staffing, custom tables and settings by name; reads numbers as structured data (actual vs forecast, departments, sources); exports reports and dashboards to Excel/PDF/CSV for further analysis without a save prompt; rearranges dashboard tiles; and makes confirmed, verified edits (plan values, drivers, hires, report columns), including Excel imports of budgets, staff lists and custom-table actuals. Use whenever the user mentions Jirav or asks about their plan, budget, rolling forecast, month-end, dashboard, headcount, drivers, custom tables, actuals sync or close month in Jirav, even if they don't say 'Jirav' but the company runs FP&A in it, e.g. "what's forecast OpEx", "export last month's P&L by department", "add a hire to a copy of the budget", "move the cash tile to the top", "load this budget spreadsheet into the plan".
---

# Operating Jirav

Jirav is a single-page app at `https://app.jirav.com`. Most of it can be reached by URL and most
lists come from the app's own API, so **look things up and navigate directly** rather than clicking
through menus, unless a reference says otherwise.

## Ground rules

- **No browser, no Jirav.** Every task here runs in a browser on app.jirav.com. If you can't control a
  browser in this session, say so before starting, and suggest Claude Cowork (built-in browser) or Claude
  with the Claude in Chrome extension.
- **The user signs in.** Never type credentials. On `signin.jirav.com` (or after a 401/403 from the
  kit), ask the user to sign in in the browser pane. An "OAuth Error" page usually clears if you
  navigate again.
- **Find via the API, read values from the page, write through the UI.** Never compute financial
  values from raw API payloads, and never call write endpoints. Totalling values read from the page
  or an export (months into quarters, say) is fine: say you did it.
- **Everything is per company (tenant).** Resolve the company first.

## Core loop

1. **Company**: `await jirav.getTenant('Acme')` → `shortName` (URLs) and API `base` (`references/tenants.md`).
2. **Target**: name → id with the kit's `list*` / `get*` lookups (`jirav.help()` lists them).
   Actual vs forecast months: `jirav.getPeriods(planId)`.
3. **Go**: `await jirav.go(path)` (patterns: `references/navigation.md`). ⚠️ Wrong URLs **silently
   redirect to the dashboard**: check `redirectedToDashboard` in the result.
4. **Read** with `jirav.readGridValues(...)`, or act in the UI.

## The kit

Helpers for what plain browser actions can't do well (shadow DOM, grid data, lookups, flaky menus).
They don't save: you click, type and Save at the coordinates they return (`jirav.at()`,
`jirav.menu()`). The one exception is `jirav.imports.upload`, which changes data: only after a yes.

- **Start every browser call with the restore line.** It reloads the kit cached in this browser
  (across reloads, tabs and sessions) while the files here are unchanged:
  ```js
  location.host !== 'app.jirav.com' ? 'WAIT: on '+location.host+', not app.jirav.com yet: retry in a few seconds' : (typeof jirav !== 'undefined' && jirav.build === '7a85fc9b') ? jirav.status() : (localStorage.jiravKit || '').includes("KIT_BUILD='7a85fc9b'") ? (0, eval)(localStorage.jiravKit) : 'PASTE scripts/jirav.min.js (not cached in this browser, or out of date)'
  ```
- **PASTE**: paste the whole of `scripts/jirav.min.js` with `javascript_tool` on any app.jirav.com page (even
  the company picker). `scripts/jirav.js` is the readable, documented source: read it, don't paste it.
- **Blocks**: paste `scripts/blocks/<name>.min.js` after the core when `jirav.page().hint` or a
  reference asks; the restore line brings them back afterwards. `grid-values` (`readGridValues`),
  `custom-table-structure`, `dashboard-layout`, `exports` (no save prompt), `imports` (no file chooser).
- A documented function is missing: paste the core, then the block.
- **Menus:** after opening one, read it with `await jirav.menu.settled()`: it waits for the opening
  animation, and returns only the menu that's really open.
- **Narrow panes** (Cowork's is ~800 px): the helpers make room themselves, view-only. `cellPoint`
  collapses Jirav's left sidebar and narrows pinned columns (the user's saved widths are kept); the
  dashboard helpers scroll and move in steps (`partial`). **Never ask the user to resize the pane.**
  A result with `offscreen: true` gives no point: follow its `reason` (scroll, close a panel), retry.

## Where to look

Usually `tenants.md`, `navigation.md` and `reading-grid-values.md`, plus the matching reference
(in `references/`). Each starts with its **scope**: per plan, or company-wide (every plan).
Facts marked *(help)* come from Jirav's help articles and haven't been tested: check the result.

| Task | Read |
|---|---|
| Plans: find, open, copy, delete, periods, type values, Auto-Forecast on/off | `plans.md` |
| Drivers: on accounts / fx page (Balance Sheet, CapEx, allocations, staffing) / global | `plan-drivers.md` / `drivers-overview.md` / `global-drivers.md` |
| Staffing: staff list, planned hires, raises, term dates | `staffing.md` |
| Assumptions: tables / values | `assumption-tables.md` / `assumption-values.md` |
| Custom tables: structure / values | `custom-table-structure.md` / `custom-table-values.md` |
| Report packages and pages: find, read, open | `reports.md` |
| Report setup: columns, comparisons, rows, format, publish, clone | `report-editing.md` |
| Dashboards and tiles, moving / resizing tiles | `dashboards.md` |
| Export to Excel / PDF / CSV without a save prompt | `exports.md` |
| Import from Excel: budgets, staff list, custom-table actuals | `imports.md` |
| GL actuals from Excel (companies on JiravExcel) | `excel-actuals.md` |
| Where actuals come from, last sync, close month | `integrations.md` |
| Settings: company (close month, fiscal year, labels) / goals / variance rules and cash flow / users, roles, Audit Log | `company-settings.md` / `goals.md` / `variance-and-cash-flow-settings.md` / `users-and-audit-log.md` |
| Chart of Accounts / Departments / Date ranges / Auto-Forecast method | `chart-of-accounts.md` / `departments.md` / `date-ranges.md` / `forecast-settings.md` |
| Logging every edit to `jirav/YYYY-MM-DD.csv` on the user's computer | `build-log.md` |
| Analysis: which plan is the budget, variances, burn / runway / cash flow | [plan-roles.md](references/finance/plan-roles.md) / [variance-analysis.md](references/finance/variance-analysis.md) / [burn-and-runway.md](references/finance/burn-and-runway.md) |
| Anything else | `discovering-endpoints.md` |

## Before any change

1. **Get the lay of the land.** From what the user asked, work out which surfaces are involved
   (plans, drivers, assumptions, custom tables, reports, dashboards, settings) and read what's
   there first: existing drivers on the target lines (they add together; one that reads its own
   line over a past range, like Last Month or a T6M average, grows whatever else you add:
   `plan-drivers.md`), whether Auto-Forecast is on (it adds to or hides typed values and drivers:
   `plans.md`), and assumptions, ranges and packages you could reuse. **Never delete or replace
   an existing driver unless the user asked**; if one conflicts, say so in the proposal.
   **Never change a saved custom-table row's Row Type**: it deletes the line's values
   (`custom-table-structure.md`). **"Trailing", "YTD" and averages of history** mean actuals:
   system ranges follow today, not the close month (`date-ranges.md`).
   **Recurring words recur**: "annually", "every March", "quarterly" run through the plan's end,
   never as one dated event. **Before saying a setting doesn't exist**, expand the collapsed
   sections (Driver Options, More Options) in its dialogs.
2. **Propose once.** Say what will change, its scope (this plan or company-wide), and any default
   you chose. One yes covers the whole proposal; ask again only if it changes.
3. **Build** through the Edits steps below.
4. **Prove it** with the checks of the skill you're running (here: the reference's Verify). If the
   numbers don't tie, check Auto-Forecast, stacked drivers, range or start date, and percent vs
   decimal; fix once, then ask.
5. **End** with what changed, how you proved it, and anything left open.

## Edits

Mistakes change a customer's financial model. For every change:

1. **Check it's allowed, first** (`jirav.listPlans()`). Refuse locked plans (`editable: false`, 🔒)
   and offer what is possible: an editable plan covering those months, or asking an admin. Check the
   cell or line is editable (`readGridValues({editable: true})`). If the user's name matches several
   lines ("Rent" → Building Rent, Equipment Rental), ask which.
2. **Say exactly what will change and its scope** (company, plan, page, line, department, periods,
   old → new, **this plan only** or **every plan**). **Get an explicit yes.** For large changes,
   suggest copying the plan first.
3. **Change it in the UI** by visible labels or kit coordinates. Most pages batch edits behind a
   bottom **SAVE CHANGES** bar that appears once the edit is committed (Enter, or leaving the field):
   check `jirav.saveBar()` before Save, and that it's gone after. `blocked: true` means SAVE is
   disabled: read `reason` (e.g. "Fill required cells or fix invalid rows"), fix it, don't click.
4. **Wait**: `await jirav.waitIdle()` outlasts the "Applying changes…" overlay. Jirav's messages are in
   `jirav.alerts()`: success ones close themselves; read warnings and errors, then `jirav.dismissAlerts()`.
5. **Verify**: re-read the values and report old → new.
6. **Log it**: append a row to today's `jirav/YYYY-MM-DD.csv` (`references/build-log.md`), pass or
   fail. At the session's first edit, ask which folder to keep it in, in the same message as
   step 2; never pick one yourself. Logging never blocks an edit.

## Output hygiene

- Filter grid reads (`under`, `match`, `maxDepth`, `from`/`to`, `kind`): a full plan page is ~50 KB.
- Report values with period, plan or report, department, and actual vs forecast.
- Screenshots are small (≈800×500) and much of the app isn't in the accessibility tree: use kit
  coordinates or the latest screenshot. After any reload or navigation, take points again: a
  reload re-opens a collapsed sidebar, so earlier points are off.
- Leave the browser tidy: reset filters you changed and say which page the tab is on.
- Flag anomalies (sign flips, outliers, a report sourcing a deleted plan, a plan name that
  contradicts its cutover). Report them; don't "fix" them.
