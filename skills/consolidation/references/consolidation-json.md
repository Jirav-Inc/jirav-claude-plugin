# consolidation.json

The consolidation set-up, as the file the user keeps. `cs.exportFile(g)` writes it; `cs.load(text)` reads
it back. It is the same object `cs.group()` returns. Version: `"schema": "jirav-consolidation/1"`.

| Field | What |
|---|---|
| `schema`, `updated` | the version, and when it was last saved (ISO time) |
| `name` | the group's name |
| `parent`, `parentName` | the consolidated Jirav company (short name, full name) |
| `reportingCurrency` | 3-letter code |
| `startMonth` | first month consolidated (`YYYY-MM`); runs start at that fiscal year's first month |
| `fiscalYearStartMonth` | 1–12, the consolidated company's |
| `entities` | `[{code, company, name, currency, departmentId}]`: each company and its department in the consolidated company |
| `eliminationsDepartmentId` | the Eliminations department (default `900`) |
| `coa` | the consolidated chart: `[{id, parent, name, cls, cat, fn}]` (`cls` Asset / Liability / Equity / Revenue / Expense; `cat` a Jirav category) |
| `mapping` | `{entity code: {account id: consolidated id}}`: every account of every entity |
| `eliminations` | `[{name, lines: [{entity, account}], confirmed}]` |
| `fx` | `source`, `euro` (ECB rates by month and currency, against the euro), `overrides` (the user's own rates: `{currency: {month: {avg, close}}}`, reporting-currency units per 1 unit), `historicalRates` |
| `draft` | true until the user confirms the set-up; `run` refuses a draft |
| `review` | the proposal's notes (informational) |

**Reading other versions.** `load` maps any version it's given onto this one: it accepts the older and
alternative names it knows (`reporting_currency`, `chart` or `consolidated.coa`, `short` for a company,
eliminations as `[entity, account]` pairs…) and reports what it read as what (`notes`) and what it didn't
use (`ignored`). It refuses only a file with no entities or no mapping.

**Checked against Jirav on load:** the consolidated company and each entity must be companies the user can
open; each entity's currency must match Jirav's; every mapped account must still exist (`changes.notInJirav`)
and every account in Jirav must be mapped (`changes.notMapped`); then the usual set-up checks (`problems`).
