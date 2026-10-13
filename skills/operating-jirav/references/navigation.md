# Navigation

**Scope: read-only.** Getting to pages; changes nothing.

All pages live at `https://app.jirav.com/<tenant>/...`. Navigate directly — the top nav and
the Settings (cog) menu are click handlers, not links, so their URLs can't be read from the page.

Navigate with `await jirav.go('/<tenant>/...')` (from `scripts/jirav.js`). It stays inside the
app, so the script kit stays loaded, waits for the page, and returns
`{path, title, redirectedToDashboard}`. Switching company, or the browser `navigate` tool, is a
full page load: wait for the title to stop being just `Jirav`, then run the restore line (SKILL.md).

## Main sections

| Go to | Lands on |
|---|---|
| `/<tenant>/dashboard` | Default dashboard (name varies per company) |
| `/<tenant>/dashboard/<dashboardId>` | That dashboard → rewrites to `/dashboard/<slug>` |
| `/<tenant>/report` | Last/default report |
| `/<tenant>/report/<reportId>[/<page-slug>]` | That report (and page) |
| `/<tenant>/plan` | Default plan (Plan of Record) |
| `/<tenant>/plan/x/<planId>/<page-slug>` | That plan page — the `x` segment is ignored |

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
