---
name: consolidation
description: Consolidates several Jirav companies into one consolidated Jirav company, in one reporting currency - maps each company's accounts onto one chart, eliminates intercompany sales, charges and balances, translates foreign-currency companies (average rate for the P&L, month-end for the balance sheet, translation difference to CTA), checks every company and the result, builds a workpaper, and imports the consolidated actuals into the consolidated company after a yes. Use when the user asks to "consolidate", "roll up our companies", "group reporting", "combine the entities", "consolidated P&L / balance sheet", "eliminate intercompany", or "run this month's consolidation".
---

# Jirav Consolidation

Rolls several Jirav companies (the **entities**) up into one Jirav company that holds the group's numbers
(the **consolidated company**), month by month, in one **reporting currency**. Each entity becomes a
department of the consolidated company; eliminations go to their own department.

Runs on top of the `operating-jirav` skill: its kit, `jirav.consolidate` and `jirav.imports`, and its Edits rules (propose once, get an explicit yes, verify, log). The user signs in; never
type credentials.

**What changes, and where.** The entities are only read. The one change is the import into the
consolidated company (its GL actuals, every plan), and only after a yes. The set-up, the rates and every
run are kept in this browser's file store ([file-store.md](../operating-jirav/references/file-store.md))
under the consolidated company's `consolidation/` folder.

**The numbers come from Jirav and the rates from the user or the ECB.** Never invent or estimate an
amount, a rate or a mapping. The kit reads each entity's actuals from its plan pages through the API and
does the arithmetic: that is the one exception to "never compute values from raw API payloads", and why
you spot-check every entity against its own page before trusting a run (step 4).

**Method** (management consolidation, current-rate): P&L at each month's average rate; assets and
liabilities at the month-end rate; equity accounts at historical rates, with retained earnings rolled
forward at translated profit; the difference is the Cumulative Translation Adjustment (CTA), an equity
line. Intercompany P&L is reversed in the Eliminations department; intercompany balances are removed;
what doesn't net to zero goes to Consolidation Differences (or Intercompany FX Differences) and is
listed in the checks. Not minority interests, not equity-method investments, not a statutory
consolidation: say so if the user asks for one.

## When to use

- "Consolidate our companies", "roll up the entities", "consolidated P&L / balance sheet"
- "Eliminate intercompany", "group reporting in USD"
- Month end: "run this month's consolidation", "update the consolidated company"

Not supported yet: one Jirav company split into several entities by department, and drilling into a
consolidated number from Jirav's own reports. Say so if asked.

## 1. Lay of the land (read-only)

Check the kit (`operating-jirav`), then use `cs = jirav.consolidate`.

1. **Existing set-up?** `await cs.groups('<consolidated company>')`. If there's one, load it with
   `await cs.group(parent, name)` and go to [Every month](#every-month). If there's none but the user has
   consolidated before (or the consolidated company already has actuals), see
   [No set-up in this browser](#no-set-up-in-this-browser) before starting over.
2. **The companies.** `jirav.listTenants()`. Ask which companies are the entities and which is the
   consolidated company, unless the user said. The consolidated company should be its own Jirav company,
   with no actuals of its own (or ones the user is happy to replace).
3. **Each entity:** `await cs.books(company)` gives its currency, the plan read (any active plan that isn't
   the Plan of Record: actuals are the same in every plan), `actualsThrough` and its chart. Say per
   entity: currency, actuals through which month.
4. **The consolidated company:** `jirav.getDataStatus(parent)` (its accounting `source`; see step 5) and its
   currency, which is the reporting currency unless the user says otherwise.

## 2. Set-up (first time)

**First, the consolidated chart: the user's choice.** Ask which they want:

- **A group chart they already have** (their consolidation spreadsheet, board pack, the parent's books), or
  the consolidated company's chart from an earlier import: pass it as `chart`, or leave `chart` out to use
  the consolidated company's own.
- **A summary** (recommend it when they have none): a short chart that reads like one company. Draft it from
  the companies' charts (`books(company).coa`) and show it before mapping:
  - one line for accounts that mean the same thing in any company (all cash, say, or wages of every kind);
  - separate lines for what the group reports on or is asked about (interest, depreciation…); when unsure
    whether to combine two accounts, ask;
  - intercompany accounts on their own lines (Intercompany Revenue, Purchases, Receivables, Payables), so
    the eliminations show;
  - one Retained Earnings line; the consolidated company's own Retained Earnings if it has one.
  Each line: `{id, name, cls, cat}` (`cls` Asset / Liability / Equity / Revenue / Expense; `cat` a Jirav
  category: Cash Equivalents, Current Asset, Fixed Asset, Non-current Asset, Current Liability,
  Non-current Liability, Uncategorized, Retained Earnings, Operating Income, Other Income, COGS, OPEX,
  Other Expenses). Map every account onto it yourself, by meaning: names rarely match a summary line
  ("Retail Sales" goes on Product Sales). Pass both: `chart`, and `mapping` (`{code: {account id: line id}}`).
- **Each company's detail**: no chart, on a consolidated company with an empty one; only accounts that
  clearly mean the same thing are combined. Each company's detail stays in its own Jirav company either way.

The consolidated company's chart in Jirav is set by the import (its COA tab), so nothing is set up there
first.

`await cs.propose({name, parent, startMonth, entities: [{code, company}], chart, mapping})`:

- `code`: a short tag per entity (letters), used in the set-up and the workpaper.
- `startMonth`: the first month to consolidate (`YYYY-MM`). A run always starts at the start of that fiscal
  year, so translated retained earnings and year-to-date profit are right.
- Optional per entity: `departmentId` (default 100, 200, …), `name`, `currency`.

It reads every entity and drafts the consolidated chart, each entity's account mapping, the intercompany
pairs and a list of notes; accounts in your `mapping` are kept as given, and the notes cover the rest.
The group's fiscal year is the consolidated company's. The draft is saved; `run` refuses it until confirmed.

**Review the draft yourself before showing it.** Read every `review.notes` line:

- "matched by name" or "matched by account number" is a guess. Keep it only when the two accounts mean
  the same thing ("Bank & Merchant Fees" and "Bank Fees": yes; "Office Wages" and "Office & Software": no).
  An account wrongly merged is the worst outcome: when in doubt, give it its own line and ask.
- "has no match" makes a new line. Where another entity's line means the same thing ("Operating Cash" and
  "Chequing Account" are both the cash account), propose mapping it there.
- The proposal never puts two accounts of one company on one line, and never puts an intercompany account
  on an ordinary line: those are the user's decisions (a summary chart combines a company's accounts;
  intercompany accounts can share an Intercompany Receivables or Payables line).
- Look at it line by line, too: every cash account on one Cash line; loans, accrued liabilities, and so on,
  likewise. When you move an account to another line, check what else sat on the old line and move it too,
  so no line is left with half of what belongs together.

Then ask, in **one numbered list**:

1. The chart, compressed: each line with the accounts on it ("the same account from all three" where that's
   so), the lines you changed from the draft, and each combination you weren't sure of. Offer the full
   account-by-account list in the workpaper.
2. Each elimination (`eliminations`): which two (or more) accounts it nets, the latest month's amounts on
   both sides. Anything in `unpairedIntercompanyAccounts`: what it pairs with, or that it stays.
3. The department numbers for the entities and for Eliminations (default 900), if the user has a preference.
4. Exchange rates, if any entity's currency isn't the reporting currency (step 3).

Apply the answers to the group (`g.mapping[code][account] = consolidated id`; `g.coa` for a new line:
`{id, parent: '', name, cls, cat, fn: ''}`; `g.eliminations[n].confirmed = true`), set `g.draft = false`,
`await cs.save(g)` and fix whatever `problems` it lists.

**The copy the user keeps.** The set-up lives in this browser, which can lose it (another computer, cleared
storage). Once it's confirmed, give the user **consolidation.json** ([consolidation-json.md](references/consolidation-json.md)):
save it into their shared folder if they've given you one, otherwise `await cs.exportFile(g)` (one
download; tell them to approve the prompt). Tell them to keep it with their month-end files: it's what
rebuilds the set-up anywhere.

## 3. Exchange rates

Only for entities not in the reporting currency. **Ask first:** "Do you have your own exchange rates for
this (from your bank, your accounting system or your auditor)? If not, I can use the European Central
Bank's monthly reference rates, which are free." Their rates win wherever they give one.

`await cs.ratesNeeded(g, through?)` says which currencies and months. Get the rates (their file, or the ECB
file they download from the link you give them: never fetch it yourself) and pass the text to
`cs.setRates`: how, in [exchange-rates.md](references/exchange-rates.md).
`setRates` saves them in the group and returns `missing` (months without a rate) and `warnings`; never
guess a missing rate or flip one yourself.

## 4. Run and check

`await cs.run(g, {through?})` (default: the earliest `actualsThrough` of the entities). It refuses a draft,
set-up problems, a missing rate or a currency that doesn't match Jirav. It also reads the consolidated
company's own departments first, and stops (`STOP: ...`, nothing written) when one the import doesn't write
holds actuals, most often a group department someone split into sub-departments there: an import keeps every
department the file leaves out with its rows, so the split would be counted twice. Show the user the
sub-departments, rows and months the message names and let them choose (never choose for them):
- **Keep the split** (`run(g, {through, keepSubDepartments: true})`): the group department goes in at 0 and the
  sub-departments keep their figures. Refused unless they add up to the run for every account and month to the
  cent; the user then keeps the split up to date themselves.
- **Replace it** (`run(g, {through, replaceSubDepartments: {'<department path>': '<Department ID>', ...}})`):
  an explicit 0 for every row they hold, so the consolidated figures sit on the group department alone. Each
  ID must be the one from the import file that created the sub-department (its Departments tab): Jirav
  doesn't show it, and a new ID adds another department and leaves the rows. Ask the user for that file.

It returns the year-to-date revenue
and net income, consolidated and by department; the CTA; `checks`; `waiting` (entities whose actuals go
further than the others'); and three saved files: the **import** for the consolidated company, the
**workpaper** and the run's detail.

1. **Spot-check every entity** before reporting anything: on one of its plan pages (`readGridValues`, the
   Revenue page, say), read two accounts in two actual months, one early and one recent, and compare with
   `books(company).P[month][account]`. Any difference: stop and say so.
2. **Checks to review** (`checks.toReview`), in plain words:
   - An entity doesn't balance in its own currency: its Jirav actuals are off. That entity's books need
     fixing first.
   - An elimination doesn't net to zero: the two companies booked different amounts, or in different
     months, or one side is in another currency and the rate moved. Show both sides (`drill`); the
     difference is in Consolidation Differences or Intercompany FX Differences.
   - The consolidated balance sheet doesn't balance: stop; don't import.
3. **Report:** consolidated revenue and net income year to date, the same by entity and eliminations, the
   CTA, the rates used (source), the checks, and the entities still `waiting`. Say the run is consolidated
   through which month.
4. `await cs.drill(files.run, account, month)` answers "where does this number come from": each entity's
   local amount, the rate, the translated amount, and the eliminations.
5. Offer the workpaper (summary, P&L by month and by entity, balance sheet, rates, translation,
   eliminations, mapping, checks): `await jirav.files.export(files.workpaper)`, one download; tell the user
   to approve the download prompt.

## 5. Import into the consolidated company

Follow [excel-actuals.md](../operating-jirav/references/excel-actuals.md) for the import itself: on the
consolidated company's Settings → Integrations page, with `jirav.imports`:

1. `const f = await im.load(files.import)`, then `await im.accountingCheck(f.i)`: months, accounts added and
   removed, the current `source`, and `departments` the file leaves out (after the run's own check, only ones
   the user chose to keep).
2. Propose once: the months the file sets (it holds every month of the run), accounts added, **accounts
   removed** (their history goes: name each), and that it replaces the consolidated company's actuals for
   those months in every plan. If `source` is empty: this first import **makes Excel the company's actuals
   source**, and only Jirav support can change it back. If it's a connector, stop: the consolidated company
   needs to be an Excel-actuals company; say so.
3. After a clear yes: `await im.upload('accountingActuals', f.i, {firstImport: true})` (the flag only on a
   first import). It returns Jirav's result.
   The file's Retained Earnings is prior years' profit only: Jirav adds this year's profit itself.
4. **Verify:** `await cs.verify(files.run)` reads the consolidated company back: every account and month must
   equal the run, and its balance sheet must balance every month (`ok: true`). Any difference: show it
   and stop. Log the import with `jirav.log` (one row: the months, the file, verified).

## Every month

1. `await cs.groups(parent)`, `await cs.group(parent, name)`. None here: [No set-up in this browser](#no-set-up-in-this-browser).
2. Each entity's `actualsThrough`: the run goes through the earliest one. Say who's still to close.
3. Rates for the new month: the user's own again, or the ECB file for that month (they download it).
4. `run`, the spot-check, the checks and the report, then the import after a yes, as above.
5. A new account in an entity stops the run ("no mapping for …"): propose where it goes, ask, add it to
   `g.mapping` (and `g.coa` if it's a new line), save and run again. Same for a new intercompany account:
   ask which elimination it belongs to.
6. If anything in the set-up changed this month (a mapping, a new line, rates), give the user a fresh
   consolidation.json, as at set-up, and say it replaces the old one (its `updated` date tells them apart).

## No set-up in this browser

1. **Ask for consolidation.json:** "I don't have your consolidation set-up in this browser. If you have
   the consolidation.json from last time, drag it in." Read it in your workspace and pass its text to
   `await cs.load(text)`. Any version is read; say what it reports: `notes` (the version it was read as),
   `ignored` (fields it didn't use), `problems`, and per entity `changes.notMapped` (accounts new in Jirav:
   map them as in set-up) and `changes.notInJirav` (gone or renamed: ask). Fix them, `save`, continue.
2. **No file:** offer to rebuild it. If the consolidated company already has consolidated actuals, most of
   the set-up is there: its chart is the group chart (pass it as `chart`), its departments name the
   entities and their numbers. Map each entity's accounts onto that chart by meaning (`mapping`), propose,
   confirm eliminations, get the rates (the same ones as last time: ask). Then check the rebuild: run through
   the last month the consolidated company has and `cs.verify` the run, without importing. `ok: true` means
   the rebuilt set-up gives what's in Jirav; each difference points at a line whose mapping (or rate) is
   off. Then give the user consolidation.json.
3. Nothing to rebuild from: set up from scratch (step 2).

Keep the file store tidy: runs are dated folders under `<consolidated company>/consolidation/runs/`. When
the user asks, export a run's folder as one zip, or remove old runs.
