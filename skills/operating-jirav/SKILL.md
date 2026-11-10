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
- **The user signs in.** Never type credentials. If the browser has no tab, or none on Jirav, open
  `https://app.jirav.com` yourself first. On `signin.jirav.com` (or after a 401/403 from the kit), ask
  the user to sign in in the browser pane; if the sign-in times out ("session ended… try again"), ask
  them to sign in again. An "OAuth Error" page usually clears if you navigate again.
- **Find via the API, read values from the page, write through the UI.** Never compute financial
  values from raw API payloads, and never call write endpoints. Totalling values read from the page
  or an export (months into quarters, say) is fine: say you did it.
- **Only through the kit.** Every request to Jirav goes through a kit function (`jirav.*`). Never
  `fetch` or XHR Jirav yourself, even for an endpoint a reference names: those notes say what the kit
  does, not something to call. For a read no lookup covers, use `jirav.apiGet` ([discovering-endpoints.md](references/discovering-endpoints.md)).
- **The kit first, always.** Every Jirav task, a read-only question included, runs on the kit (check it first:
  "The kit" below). Never answer from screenshots, page text or menus instead: that is slower and less reliable.
  When a kit call refuses, do what its reason says (often another kit call); never do the same by hand with clicks
  and screenshots.
- **Everything is per company (tenant).** Resolve the company first.

## Core loop

1. **Company**: `await jirav.getTenant('Acme')` → `shortName` (URLs) and API `base`; `await jirav.listTenants()`
   lists every company the user can access (match on `fullName`; `references/tenants.md`).
2. **Target**: name → id with the kit's `list*` / `get*` lookups (`jirav.help()` lists them).
   Actual vs forecast months: `jirav.getPeriods(planId)`.
3. **Go**: `await jirav.go(path)` (patterns: `references/navigation.md`). ⚠️ Wrong URLs **silently
   redirect to the dashboard**: check `redirectedToDashboard` in the result.
4. **Read** with `jirav.readGridValues(...)`, or act in the UI.

## The kit

Helpers for what plain browser actions can't do well (shadow DOM, grid data, lookups, flaky menus).
Every change goes in through Jirav's own controls, so Jirav checks each value as it would a user's:
the kit clicks, types and saves on Jirav's screens, never through its endpoints, and only as a user
could (visible, on top, enabled; typed and read back). Anything that saves runs only after the user's yes.

- **Await every kit call: if it has parentheses, `await` it** (`await jirav.listPlans()`). Read a field after
  awaiting: `(await jirav.page()).planId`. A function you pass to the kit that calls it is `async` too
  (`jirav.waitFor(async () => …)`). Plain values aren't calls: `jirav.build`, `jirav.frame.width`.

- **Jirav serves the kit on its own pages** as `window.jirav`: nothing to load. Its areas (`readGridValues`,
  `customTableStructure`, `dashboards`, `reports`, `exports`, `imports`, `driverForm`, `driverGrids`, `gridEntry`,
  `consolidate`) load themselves on their first call.
- **Check the kit first**, at the start of the conversation and whenever a call says `jirav` isn't defined or a
  documented `jirav` name isn't there ("not a function", "Cannot read properties of undefined"). One browser call:
  ```js
  (async () => /^(signin|login)\.jirav\.com$/.test(location.hostname) ? 'SIGN IN' : location.hostname !== 'app.jirav.com' ? 'OPEN JIRAV' : typeof jirav === 'undefined' ? (location.pathname.startsWith('/-/') ? 'OPEN THE COMPANY' : 'NO KIT') : jirav.api === 1 ? (((await fetch('/-/agent-kit/jirav.js', {cache: 'no-cache'}).then(r => r.text(), () => '')).match(/\.\/(\w+)\//) || [, jirav.build])[1] !== jirav.build ? 'NEW KIT' : await jirav.status()) : jirav.api > 1 ? 'SKILLS OLDER THAN KIT' : 'KIT OLDER THAN SKILLS')()
  ```
  - **The kit's status line** (`jirav … (build …) loaded`): carry on; say nothing about it.
  - **NEW KIT**: Jirav has updated its kit since this page loaded. Reload the page (`location.reload()`), wait a few
    seconds and check again; say nothing about it unless it keeps answering NEW KIT.
  - **SIGN IN**: Jirav's sign-in. A sign-in form: ask the user to sign in in the browser pane. No form: it's passing
    through and comes back by itself; wait a few seconds and check again. Don't navigate meanwhile.
  - **OPEN JIRAV**: open `https://app.jirav.com`, then check again.
  - **OPEN THE COMPANY**: Jirav's Choose Company page has no kit. Open the company by URL, `/<shortName>`: if you
    don't know its shortName, read it from that page's list, where each company shows as "Name (shortName)"
    ([tenants.md](references/tenants.md)). Never use the page's Continue. Then check again.
  - **NO KIT** on a company page: right after a page load, wait a few seconds and check again. Still NO KIT: tell the
    user you can't work in Jirav from this browser right now and to try again in a little while, and stop.
  - **SKILLS OLDER THAN KIT**: Jirav's kit is newer than the skills in this conversation. Carry on; say nothing.
  - **KIT OLDER THAN SKILLS**: carry on; say nothing. A call that isn't there yet fails as "not a function": do that
    step on the screen as a user would (the references' click recipes), or tell the user, in Jirav's words, which
    step is left for them.
- **The kit's API is what this skill, its references and each workflow skill document.** A documented call fails
  or returns something the docs don't explain: run the kit check again first (Jirav may have updated the kit since
  the page loaded; NEW KIT: reload, then retry the call). Still the same: do that step on the screen as a user
  would, or tell the user, in Jirav's words, what you couldn't do and what's left for them.
- **The kit stays out of the conversation.** Never name the kit, its calls, builds or checks to the user unless they
  ask, and never put a failure down to it: the user hears what you did, saw or couldn't do in Jirav, in Jirav's own
  words.
- **Narrow panes** (Cowork's runs about 400–1000 px wide): the helpers make room and scroll themselves,
  view-only. **Never ask the user to resize the pane.** A result with `offscreen: true` gives no point:
  follow its `reason`, retry. Kit points (`ui()`, `jirav.at(el)`, `cellPoint`) are in screenshot
  coordinates (the screenshot is always 800 wide); if the screenshot tool reports another width, set
  `jirav.frame.width` to it. Take a point just before its click: scrolling moves the others.

## Working a screen

Read the screen with the kit instead of screenshots, and act on it by label ([navigation.md](references/navigation.md#working-a-screen)):

- `jirav.ui()` lists what you can use right now, one line each: `<ref> <kind> "<label>" = <value> [<where>] @x,y`,
  `(covered)` / `(disabled)` when you can't. `where` is the dialog, `menu`, or the grid row (`row: Rent`).
- Act with a query: `await jirav.click({label, kind?, where?, nth?})` (`{hover: true}` opens a ▸ submenu),
  `jirav.fill(q, text)`, `jirav.close()` (an open menu), `jirav.waitFor(async () => …)`, `jirav.scrollTo(q)`.
  They act only as a user could and say why when they can't: `covered: … is under …`, `disabled: …`,
  `stale: run jirav.ui() again`, `field kept "…", not "…"`. Fix the cause; don't work around it.
- Do several reads and quick steps in one call and check the result at the end, rather than one step per call.
- **One write per browser call.** A browser call that runs too long is dropped with its result, so a kit
  call that changes something (`add`, `set`, `save`, `remove`, an upload, Save) gets a browser call of its own.
  Each fits one and checks first whether its change is already there, so making it again does nothing twice.
  `jirav.log` changes nothing in Jirav and is quick: it goes in the same call as the read that verifies the change.
  - A result with **`call`** isn't finished: make that call next, as written. `pending: true`: Jirav is
    still working (saving, loading, rebuilding): the call waits first, then does only what's left (a
    `set`'s values already in place are skipped). `more`: what a write didn't reach yet; the call does it.
  - **A dropped call** (no reply, or the browser tool timed out): read the state before acting again (the
    row, the driver, the values, the audit log), or make the same call: it reports what's already there
    (`existed`, `alreadyGone`, `unchanged`, `already`, `refused`).
- **Writes made with clicks** outside the kit's helpers (a custom table or line created, a month-end snapshot or
  roll-forward): after a dropped call, read the state before acting again. Dashboards and their tiles change
  through `jirav.dashboards` ([dashboards.md](references/dashboards.md#change-dashboards-and-tiles)); report
  packages and pages through `jirav.reports` ([report-editing.md](references/report-editing.md#change-packages-and-pages)).
- **While Jirav rebuilds** ("Applying changes…", `jirav.busy()`), nothing is clicked or typed: the kit's
  writes wait for it to end, and reads made meanwhile say `rebuilding: true` (read again after `jirav.waitIdle()`).
- A form with its own helper is filled in one call: the driver form (`jirav.driverForm`,
  [plan-drivers.md](references/plan-drivers.md#the-driver-form)); a Plan Drivers Page grid row (Balance Sheet,
  CapEx, Allocations, Staffing: `jirav.driverGrids`, [drivers-overview.md](references/drivers-overview.md#the-grids));
  a planned hire, raise or term date on the Staffing page (`jirav.driverGrids`, [staffing.md](references/staffing.md#change));
  a row of plan values on Revenue, COGS, OpEx or Other (`jirav.gridEntry`, [plans.md](references/plans.md#type-values));
  a plan's copy, rename, archive, delete or actuals period (`jirav.managePlans`, [plans.md](references/plans.md#periods-and-manage-plans-columns)).
  Save only after the user's yes.
- **Jirav's own questions** ("Are you sure? …", Continue / Cancel): answer one only when the user's yes already
  covers that exact step (the Delete Driver question for a delete they approved); anything else, ask them first.

## Where to look

Usually `tenants.md`, `navigation.md` and `reading-grid-values.md`, plus the matching reference
(in `references/`). Each starts with its **scope**: per plan, or company-wide (every plan).
Facts marked *(help)* come from Jirav's help articles and haven't been tested: check the result.

| Task | Read |
|---|---|
| Plans: find, open, copy, delete, periods, type values, Auto-Forecast on/off | `plans.md` |
| Drivers: on accounts / the Plan Drivers Page (Balance Sheet, CapEx, allocations, staffing) / the Global Drivers Page | `plan-drivers.md` / `drivers-overview.md` / `global-drivers.md` |
| Staffing: staff list, planned hires, raises, term dates | `staffing.md` |
| Assumptions: tables / values | `assumption-tables.md` / `assumption-values.md` |
| Custom tables: structure / values | `custom-table-structure.md` / `custom-table-values.md` |
| Report packages and pages: find, read, open | `reports.md` |
| Report packages and pages: create, build from chosen reports, add / remove / rename / reorder pages, delete; a page's columns, comparisons, variances, rows, format; publish, clone | `report-editing.md` |
| Dashboards and tiles: create, add / edit / move / resize tiles, Dashboard Settings | `dashboards.md` |
| Export to Excel / PDF / CSV without a save prompt | `exports.md` |
| Import from Excel: budgets, staff list, custom-table actuals | `imports.md` |
| Adding a month of GL actuals ("add October"), any source; GL actuals from Excel (JiravExcel) | `excel-actuals.md` (checks the source and `actualsThrough` first) |
| Where actuals come from, last sync, close month | `integrations.md` |
| Settings: company (close month, fiscal year, labels) / goals / variance rules and cash flow / users, roles, Audit Log | `company-settings.md` / `goals.md` / `variance-and-cash-flow-settings.md` / `users-and-audit-log.md` |
| Chart of Accounts / Departments / Date ranges / Auto-Forecast method | `chart-of-accounts.md` / `departments.md` / `date-ranges.md` / `forecast-settings.md` |
| Logging every edit (`jirav.log`, a CSV per day in the file store) | `build-log.md` |
| Files kept across reloads: imports, exports, the build log; exporting a copy | `file-store.md` |
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

1. **Check it's allowed, first** (`jirav.listPlans()`: each plan's `planId`, `shortName` (the name the UI shows;
   `name` is a description, often empty), `editable`, `cutoverDate`…; [plans.md](references/plans.md#find)).
   Refuse locked plans (`editable: false`, 🔒) and offer what is possible: an editable plan covering those
   months, or asking an admin. Check the cell or line is editable (`readGridValues({editable: true})`). If the
   user's name matches several lines ("Rent" → Building Rent, Equipment Rental), ask which.
2. **Say exactly what will change and its scope** (company, plan, page, line, department, periods,
   old → new, **this plan only** or **every plan**). **Get an explicit yes.** For large changes,
   suggest copying the plan first.
3. **Change it in the UI** with the screen helpers (a form helper where there is one), or kit points.
   Most pages batch edits behind a bottom **SAVE CHANGES** bar that appears once the edit is committed
   (Enter, or leaving the field; on the plan grids it slides up a moment later, and `press()` waits for it):
   `(await jirav.saveBar()).pending` is true while the bar is up with unsaved edits (false when there's none);
   `await (await jirav.saveBar()).press()` presses SAVE and waits for the bar to go.
   `blocked: true` means SAVE is disabled: read `reason` (e.g. "Fill required cells or fix invalid rows"), fix it.
   **The bar going away doesn't mean saved**: Jirav closes it after a failed save too. `ok: false` with `errors`:
   Jirav raised an error during the save, and the edits are not saved (the page may still show them). Re-read the
   values and tell the user what wasn't saved; never press again blindly. A report page saves with
   `jirav.reports.page.save()`, which checks the save itself ([report-editing.md](references/report-editing.md)).
   The exception is plan values on Revenue / COGS / OpEx / Other: stage them with `gridEntry.set` before the
   step 2 question and show what it staged in that question (staging isn't saving); the yes covers its own
   `save()` ([plans.md](references/plans.md#type-values)).
4. **Wait**: `await jirav.waitIdle()` waits out the "Applying changes…" overlay (`pending: true` after
   about 15 s: call it again). Jirav's messages are in
   `await jirav.alerts()`: success ones close themselves. An error Jirav shows during a kit write is in that write's
   result (`errors`, or its message) and closed. Any other warning or error stays on screen: read it, then
   `jirav.dismissAlerts()`.
   The log keeps the tab's last 30 messages across tasks (until the page reloads): take `const t0 = Date.now()`
   before a step and read `jirav.alerts({since: t0})` for that step's messages only.
5. **Verify**: re-read the values and report old → new.
6. **Log it**: `await jirav.log({skill, plan, object_type, object, department, periods, old, new, scope, verified,
   note})` adds a row to today's build log in the file store (`references/build-log.md`), pass or fail. At the session's first edit, say once, in the same
   message as step 2, that you keep a log in this browser and can export a copy. Logging never
   blocks an edit.

## Output hygiene

- Filter grid reads (`under`, `match`, `maxDepth`, `from`/`to`, `kind`): a full plan page is ~50 KB.
- Report values with period, plan or report, department, and actual vs forecast.
- Screenshots are 800 px wide (height varies with the pane) and much of the app isn't in the
  accessibility tree: use `jirav.ui()` and kit points. If a tall screenshot is shown to you shrunk ("multiply by
  1.24"), kit points stay right, but multiply points you read off the image by that factor.
  Take points again after any reload or navigation (a reload re-opens a collapsed sidebar), and
  after the Browser pane is shown, hidden or resized (its size changes). Hidden still works.
- Leave the browser tidy: reset filters you changed and say which page the tab is on.
- Flag anomalies (sign flips, outliers, a report sourcing a deleted plan, a plan name that
  contradicts its cutover). Report them; don't "fix" them.
