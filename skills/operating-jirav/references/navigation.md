# Navigation

**Scope: read-only.** Getting to pages; changes nothing.

All pages live at `https://app.jirav.com/<tenant>/...`. Navigate directly — the top nav and
the Settings (cog) menu are click handlers, not links, so their URLs can't be read from the page.

Navigate with `await jirav.go('/<tenant>/...')`. It stays inside the
app, so the script kit stays loaded, waits for the page, and returns
`{path, title, redirectedToDashboard}`, within about 15 s: a page still loading then returns `pending: true` with
`call: 'jirav.ready()'` (it only waits; `go` to the page already open doesn't navigate again). Switching company, or the browser `navigate` tool, is a
full page load: wait for the title to stop being just `Jirav`, then carry on: the kit is there again.

## Main sections

| Go to | Lands on |
|---|---|
| `/<tenant>/dashboard` | Default dashboard (name varies per company) |
| `/<tenant>/dashboard/<dashboardId>` | That dashboard → rewrites to `/dashboard/<slug>` |
| `/<tenant>/report` | Last/default report |
| `/<tenant>/report/<reportId>[/<page-slug>]` | That report (and page) |
| `/<tenant>/plan` | Default plan (Plan of Record) |
| `/<tenant>/plan/x/<planId>/<page-slug>` | That plan page — the `x` segment is ignored. Slugs: `revenue`, `cogs`, `opex`, `other`, `staffing`, `drivers`, `assets`, `liabilities`, `equity` |

IDs come from the kit's `list*` lookups; see `reports.md`, `dashboards.md` and `plans.md`.
**Prefer IDs over name slugs** — slugs double/triple-encode characters like `&` and `:`.

## Settings

All under `/<tenant>/setup/...`. These short URLs work directly:

| Menu | URL |
|---|---|
| Integrations | `/setup/integrations` |
| Company | `/setup/company` |
| Users | `/setup/access-config` |
| Departments | `/setup/departments` |
| Variance Rules | `/setup/variances` |
| Cash Flow | `/setup/cash-flow` |
| Forecast (A/R, A/P) | `/setup/forecast` |
| Global Drivers | `/setup/global-drivers` |
| Goals | `/setup/goals` |
| Audit Log | `/setup/audit-log` |
| Billing | `/setup/billing` |

These need a full path — the short form **redirects to the dashboard**:

| Menu | URL |
|---|---|
| Chart of Accounts | `/setup/coa/is/revenue` (income statement), `/setup/coa/bs/assets` (balance sheet) |
| Custom Tables | `/setup/custom-tables/<encoded name>` — open via Settings menu once, copy the path |
| Assumptions | `/setup/assumptions/` (trailing slash required) or `/setup/assumptions/<name-with-dashes>`; values are in the plan page's Assumptions panel |

## Traps

- **Silent redirects.** An incomplete or wrong path lands on the dashboard with no error.
  Always compare where you landed with where you meant to go.
- **`/plan/<planId>` alone** redirects to the dashboard — include the `x/` segment and a page.
- **Settings menu by click** (fallback): open the cog, wait ~1 s, then click the item;
  clicking immediately is often lost.

## Working a screen

The kit reads the controls of the page as Jirav builds them (inside shadow roots, Jirav's own dropdowns,
toggles and pickers, grid rows) and works them as a user would. Use it instead of screenshots and
hand-written selectors.

**`jirav.ui({within, max = 120, json, offscreen})`**: one line per control you can use now:
`<ref> <kind> "<label>" = <value> [<where>] @x,y`.
- Kinds: `button`, `field`, `dropdown`, `toggle`, `checkbox`, `picker` (a line or department chip box),
  `option` (in an open menu or list), `tree-item` and `expander` (the Select Driver Input picker, grid
  groups), `row` (a grid row's name), `toast` (one of Jirav's messages).
- Labels are what the user sees; icon-only controls are named `icon:more` (⋯), `icon:edit`, `icon:delete`,
  `icon:add`, `icon:close`, …; Jirav's step numbers in form labels are dropped ("Fiscal Year(s)").
- A switch with no text of its own is a `toggle` named by its field label, else by the heading before it in
  its panel (Edit columns' "Comparison Source #1"). A select is a `dropdown` named by its field label, listed
  even when nothing is chosen; one with no label nearby stays a `button` named by its value. A tile type in the
  Tile Builder is a `button` named by its type ("Vertical Bar", `= selected` once chosen). A tick box in a
  settings row (Dashboard Settings) is a `checkbox` named by its row's name.
- `where`: `dialog: <title>` (`dialog: driver` for the Add Driver form), `menu`, `row: <name>` for a grid
  row's controls, `formula: <row>` for the formula bar's icons (only once it has loaded that row's driver).
- Points are in screenshot coordinates. `(covered)`: something is on top; `(disabled)`; `(off screen)`
  only with `offscreen: true` (below the fold, say). `within: 'menu'` / `'dialog'` keeps one part;
  `json: true` returns objects. Dialog and menu controls come first.
- A `ref` stays the same control across calls; once that control leaves the page, using it fails with
  `stale: run jirav.ui() again`.

**Queries.** Each helper below takes a ref, an element, or a query
`{label: 'Save' | /regex/, kind?, where?: string | /regex/, nth?}`; a plain string is a label. A string label
matches the whole label, ignoring case and the `icon:` prefix (`{label: 'more', where: 'row: <name>'}`). A query
must name a label, kind or where, and nothing else (`{}` or `{text: …}` is refused). Without `nth`, a control
that isn't covered comes first, dialog and menu ones before the page's; `nth` counts every match in page
order from 0, off screen too (`nth: 1` is the second "Year" on a form, the end date's), and is refused when there aren't that
many. A query waits up to 2 s for its control, then also looks below the fold; on failure the error lists what
is on screen. A ref used later must still read as `ui()` listed it, else it's `stale`.

| Helper | Does |
|---|---|
| `await jirav.click(q)` | Clicks as a user would: the full pointer sequence at the control's point, on whatever is on top there. Waits while it's still sliding in; scrolls it into view; waits for one of Jirav's success messages to go if one covers it |
| `await jirav.click(q, {hover: true})` | Hovers: opens a ▸ submenu (a driver type's departments, a table's lines in Apply To) |
| `await jirav.fill(q, text)` | Clicks into the field (unless it already has the caret, as a grid cell's editor does) and types `text` key by key (stopping at its maximum length, as a keyboard does), then reads it back and leaves the field; a read-only field is refused |
| `await jirav.fill(q, text, {commit: 'enter'})` | For a grid cell's open editor: types and reads back the same way, then commits with Enter instead of leaving the field, and waits for the editor to close. If the field kept other text, the cell's old text is typed back and committed, and the error says so |
| `await jirav.close()` | Closes the open menu or list → `{ok, closed: 'list' \| 'menu' \| 'nothing'}` (`why` when it couldn't). With a dialog or side panel open it never sends Escape: it clicks the list's own backdrop. With no menu open it does nothing: it never closes a dialog |
| `await jirav.scrollTo(q)` | Brings a control into view without touching it (a section whose grid rows are only drawn near the visible part) |
| `await jirav.waitFor(async () => cond, {timeout})` | Polls until truthy → `{ok, ms, value}` |

They refuse rather than guess, and say why:
- `covered: <control> at x,y is under <what>`: close or finish what's on top (a menu, a dialog); a warning or
  error message from outside a kit write stays until you've read it (`await jirav.alerts()`, `await jirav.dismissAlerts()`).
- `disabled: …`: Jirav won't take it yet (a picker's Select before anything is picked).
- `not visible: …`, `stale: run jirav.ui() again`: the page changed; read it again.
- `field kept "", not "abc"`: the field refused what was typed (a number field and letters).

Do several steps in one call and check at the end (`ui()`, a form helper's `read()`, or the kit's API
lookups). After a delete or a save that redraws a grid, check the change with the kit's lookup first (`listPlanDrivers`,
…), then wait for the row to go from the screen before clicking in that grid again:
`waitFor(async () => !(await jirav.ui({json: true, offscreen: true})).some(o => o.label === name))`. A row under a collapsed
account isn't drawn at all, so this only means something while the row was showing.
`jirav.menu()` still lists an open menu's items, but `ui({within: 'menu'})` shows more (field dropdowns,
submenus).
