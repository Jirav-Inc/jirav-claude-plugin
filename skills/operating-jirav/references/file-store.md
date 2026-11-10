# File store

**Scope: this browser only.** `jirav.files` (in the core) keeps files in the browser's private storage
for app.jirav.com. They survive page reloads, company switches and new sessions, but they aren't on
the user's computer: nothing appears in Finder or Downloads until you export. The browser may clear
this storage if the disk runs short, so an export is the copy the user keeps.

## What goes in by itself

| What | Where | Saved by |
|---|---|---|
| Every import file: the template fetched, each `edit` / `blankNumbers` / `dropSheets` result, a file from `fromBase64` | `<company>/imports/` | `jirav.imports`, as each file is made |
| What was uploaded | the uploaded file's own entry: `uploaded`, `uploadedAt`, `plan`, `result` (Jirav's alert) | `upload` / `finish` |
| Every export caught while capture is on | `<company>/exports/` | `jirav.exports` |
| The build log | `<company>/build-log/YYYY-MM-DD.csv` | `jirav.log` ([build-log.md](build-log.md)) |

Paths are `<company short name>/<area>/<YYYY-MM-DD HHMMSS> <name>`, so a later file never replaces an
earlier one. The template fetched before an import is therefore always kept: it is the undo file for
imports that replace data ([imports.md](imports.md)).

After a reload, `im.list()` and `ex.list()` start empty; bring a saved file back with
`await im.load(path)` or `await jirav.exports.load(path)` (paths from `jirav.files.list('<company>/imports/')`).

## Functions

| Call | Returns |
|---|---|
| `await jirav.files.list(prefix?)` | `[{path, size, at, sha256, kind, ...notes}]`, sorted by path |
| `await jirav.files.get(path)` / `.text(path)` | the file / its text |
| `await jirav.files.put(path, data, meta?)` | saves a Blob, text or bytes; `meta` is kept as notes |
| `await jirav.files.note(path, meta)` | adds notes to a saved file |
| `await jirav.files.remove(path)` or `remove('<folder>/')` | deletes a file, or a folder and everything in it |
| `await jirav.files.usage()` | `{usedMB, quotaGB, persisted, files}` |
| `await jirav.files.export(path, {name?})` | one download of that file |
| `await jirav.files.export('<folder>/')` or `export([paths])` | one zip: the files plus `manifest.csv` (path, size, time saved, SHA-256, notes) |

## Exporting to the computer

- **One download per export, and one export at a time.** Cowork's browser asks the user to approve
  each download, one prompt at a time, and drops a download started while a prompt is still open. So an
  export of several files is always one zip, and after each export, tell the user to approve the download
  prompt and wait for them to say it's done before exporting again. The kit refuses a second export within a
  minute; call it again with `{force: true}` only once the user has answered.
- The file lands in the user's Downloads folder under its own name (zips: `jirav-files <date>.zip`).
- **Any file, or several:** export one file as itself, or a list or a folder (a company's `<company>/`
  has its imports, exports and log) as one zip. Never several separate downloads in a row.
- **When:** when the user asks for a copy ("export today's files", "give me the log"), and offer it
  once at the end of a session that changed something: "Want a copy of today's files and change log?
  It downloads as one zip: approve the download when it asks."

## Files from the computer

The store doesn't change how a file on the user's computer reaches the page: that is still
`im.fromBase64` in chunks ([imports.md](imports.md)). Once it's in, it's saved like any other import
file, so it only has to come in once.

## Privacy

Anyone who signs in to Jirav in this same browser can read this storage, so it holds the user's
financial files only as long as they're useful. When the user asks, or a task's files are no longer
needed, remove them: `await jirav.files.remove('<company>/')`. Never call the store permanent or a
backup.
