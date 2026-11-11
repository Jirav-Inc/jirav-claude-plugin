# Build log

**Scope: this browser's file store.** One CSV per company and day, `<company>/build-log/YYYY-MM-DD.csv`
in the kit's file store ([file-store.md](file-store.md)), next to that company's import and export
files, with one row for every change the agent makes in Jirav. It's the agent's own record, kept because this skill asks for it: append-only,
best-effort, not an audit trail, and nothing in Jirav reads it. Never call it an audit log.

## When to write

After **Edits step 5 (Verify)**, for every change attempt that reached the app:

- one row per object × period range (a driver, a line's values for a range of months, a report
  page's columns, a tile, an import), **not** per cell;
- `verified` = `pass` if the re-read matches, `fail` if it doesn't, `partial` if some of it saved
  or it saved but what should follow from it didn't (a hire saved, OpEx unchanged because Salary
  Expenses isn't set);
- failed and partial attempts get a row too: those are the ones worth finding later.

Read-only work writes nothing. A level-2 skill passes its own name in `skill` and a short reason
in `note`.

Never let logging block or undo an edit. If `jirav.log` fails, tell the user once and carry on.

## Where it is

In the file store, written by the kit: no folder to ask about or connect. It stays in this browser
until the user asks for a copy, so at the **first edit of the session** say it once, in the same
message as the Edits step 2 confirmation: "I keep a log of every change I make in Jirav, in this
browser; ask me for a copy any time." If the user says not to keep one, don't call `jirav.log` for
the rest of the session.

## Columns

| Column | Content |
|---|---|
| `time` | User's local ISO time with offset (`2026-10-02T08:34:53-0500`), added by the kit |
| `skill` | `operating-jirav`, or the level-2 skill that asked for the change |
| `company` | Tenant short name |
| `plan` | Plan name, or empty for company-wide objects |
| `object_type` | `plan-values`, `plan-driver`, `global-driver`, `assumption`, `custom-table`, `staffing`, `report`, `dashboard`, `setting`, `chart-of-accounts`, `departments`, `import`, … |
| `object` | What was changed, by its visible label (line, driver, page, tile, setting) |
| `department` | Department, or `All` |
| `periods` | `Jan-27..Dec-27`, a single month, or empty |
| `old` / `new` | Compact before / after: a value, a short list, or a total with "(total)" |
| `scope` | `plan` or `company` |
| `verified` | `pass`, `fail` or `partial` |
| `note` | Short reason or context ("10% YoY recipe (a)"; import file name and row counts) |

## How to write

```js
await jirav.log({ skill: 'operating-jirav', company: 'acme', plan: 'FY27 Forecast_1', object_type: 'plan-driver',
  object: 'Rent, Building', department: 'G&A', periods: 'Jan-27..Dec-27', old: '-1,300', new: '2,600',
  scope: 'plan', verified: 'pass', note: '10% YoY recipe (a)' })
// -> {path: 'acme/build-log/2026-10-02.csv', row}
```

Pass the columns above by name (an unknown name is refused). The kit adds `time` (the user's local
time, from the browser), fills `company` from the URL when it's left out (and refuses a row with no
company at all), puts every field in double
quotes and starts a new day's file with the header (and a byte-order mark, so Excel reads it as
UTF-8). Give compact values: a value, a short list, or a total with "(total)".

## Getting a copy

`await jirav.files.export('acme/build-log/2026-10-02.csv')`, a company's whole log (`export('acme/build-log/')`),
or the company's log and files together (`export('acme/')`): one download, a zip when it's more than one
file; then tell the user to approve the download prompt ([file-store.md](file-store.md)).
Offer it once at the end of a session that changed something.

## Reading it back

When the user asks "what did you change?", read the company's file for the day (`await jirav.files.text('<company>/build-log/<date>.csv')`,
or `jirav.files.list('<company>/build-log/')` for a range of days) and summarise by company and plan. Never edit
or rewrite past rows: if a row was wrong, append a correcting row with a `note`.
