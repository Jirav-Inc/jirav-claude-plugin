# Build log

**Scope: the user's own computer.** One CSV per day, `jirav/YYYY-MM-DD.csv`, inside a folder the
user chooses, with one row for every change the agent makes in Jirav. It's the agent's own record,
kept because this skill asks for it: append-only, best-effort, not an audit trail,
and nothing in Jirav reads it. Never call it an audit log.

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

Never let logging block or undo an edit. If a write fails (e.g. the file is open in Excel on
Windows), tell the user once and carry on.

## Where: ask the user

At the **first edit of the session**, ask in the same message as the Edits step 2 confirmation, so
the user answers both at once:

> "I keep a log of every change I make in Jirav: a CSV per day in a `jirav` folder. Which folder
> should it go in?"

- Never pick a folder yourself. If a connected folder already has a `jirav/` log folder, you may
  offer it: "Keep using the log in `<folder>/jirav`?"
- The folder must be connected to this session. If the one they name isn't, request access to it.
- If they decline, or no folder can be reached, write the same CSV (same name and format) in this
  session's outputs, give it to the user as a file at the end, and add a short table of the rows
  in the final message. Don't ask again.
- On the first write, say the file's full path and that it contains their financial values.

The date in the file name is the **user's local date**.

## Columns

| Column | Content |
|---|---|
| `time` | User's local ISO time with offset (`2026-10-02T08:34:53-0500`), added by the shell in options A and B |
| `skill` | `operating-jirav`, or the level-2 skill that asked for the change |
| `company` | Tenant short name |
| `plan` | Plan name, or empty for company-wide objects |
| `object_type` | `plan-values`, `plan-driver`, `global-driver`, `assumption`, `custom-table`, `staffing`, `report`, `dashboard`, `setting`, `import`, … |
| `object` | What was changed, by its visible label (line, driver, page, tile, setting) |
| `department` | Department, or `All` |
| `periods` | `Jan-27..Dec-27`, a single month, or empty |
| `old` / `new` | Compact before / after: a value, a short list, or a total with "(total)" |
| `scope` | `plan` or `company` |
| `verified` | `pass`, `fail` or `partial` |
| `note` | Short reason or context ("10% YoY recipe (a)"; import file name and row counts) |

## How to write

Nothing to install: this works anywhere the agent can write a file. **You** format the row; a
built-in command or your file tools add it to the end of the file.

**The row.** One line, the columns above in that order, **every field in double quotes**, any `"`
inside a value doubled (`""`), no line breaks inside a value (use `; `), and a plain `-` for
negatives (not `−`). Leave `time` out of the line when a shell will add it (options A and B); write
it yourself otherwise. Example (without `time`):

```
"operating-jirav","acme","FY27 Forecast_1","plan-driver","Rent, Building","G&A","Jan-27..Dec-27","-1,300","2,600","plan","pass","10% YoY recipe (a)"
```

**The header**, written only when the file is new:

```
"time","skill","company","plan","object_type","object","department","periods","old","new","scope","verified","note"
```

Pick the first option that works and stick with it for the session.

**A. A POSIX shell** (`device_bash` in Cowork, which is Linux on every computer; macOS, Linux or
Git Bash in Claude Code). Set `TZ` to the user's IANA timezone: Cowork's shell clock is UTC. The
quoted heredoc (`<<'ROW'`) takes the line literally, so nothing in it needs shell escaping; the
line just can't be the word `ROW` on its own.

```sh
export TZ='America/Chicago'
F="$HOME/mnt/<folder>/jirav/$(date +%F).csv"
mkdir -p "${F%/*}"
[ -f "$F" ] || printf '\357\273\277"time","skill","company","plan","object_type","object","department","periods","old","new","scope","verified","note"\n' > "$F"
printf '"%s",' "$(date +%Y-%m-%dT%H:%M:%S%z)" >> "$F"
cat >> "$F" <<'ROW'
"operating-jirav","acme","FY27 Forecast_1","plan-driver","Rent, Building","G&A","Jan-27..Dec-27","-1,300","2,600","plan","pass","10% YoY recipe (a)"
ROW
echo "$F"
```

**B. PowerShell** (Windows in Claude Code). The machine's clock is the user's local time. The
single-quoted here-string (`@' … '@`) takes the line literally; its closing `'@` must start the
line.

```powershell
$d = Join-Path '<folder>' 'jirav'; New-Item -ItemType Directory -Force $d | Out-Null
$F = Join-Path $d ((Get-Date).ToString('yyyy-MM-dd') + '.csv')
$enc = New-Object System.Text.UTF8Encoding $true
if (-not (Test-Path $F)) { [IO.File]::WriteAllText($F, '"time","skill","company","plan","object_type","object","department","periods","old","new","scope","verified","note"' + "`r`n", $enc) }
$row = @'
"operating-jirav","acme","FY27 Forecast_1","plan-driver","Rent, Building","G&A","Jan-27..Dec-27","-1,300","2,600","plan","pass","10% YoY recipe (a)"
'@
[IO.File]::AppendAllText($F, '"' + (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz') + '",' + $row + "`r`n", $enc)
$F
```

**C. No shell: your file tools.** In Cowork without `device_bash`, stage today's file if it exists,
add the line in the session workspace, and commit it back to the same path with the
`expectedMtimeMs` from the stage (stage again and retry once if it's refused). With local file
tools, read the file and write it back with the line added. Either way, put `time` in the line
yourself (the user's local time, from a tool's clock if you have one, otherwise the date), write
the header first on a new file, and **never change earlier lines**: this rewrites the file, so
it's append-only only by care.

## Reading it back

When the user asks "what did you change?", read the day's file (or a range of days) and summarise
by company and plan. Don't edit or rewrite past rows: if a row was wrong, append a correcting row
with a `note`.
