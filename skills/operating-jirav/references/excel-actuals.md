# GL actuals: adding a month (Excel / JiravExcel, or a connector)

**Scope: company-wide, changes actuals in every plan.** Where: Settings → Integrations → Actuals →
Accounting → **Manual import** (`/<tenant>/setup/integrations`). Uses the `imports` block (paste
`scripts/blocks/imports.min.js`; general rules: [imports.md](imports.md)). For every change, follow
**Edits** in SKILL.md.

## 0. Where the month stands (reads only, before asking for anything)

Start like a month-end close. Read `getDataStatus()` (accounting `source`, `lastTrialBalance`,
`actualsThrough`) and `getPeriods()` (`closeMonth`, `closeMonthSource`, `accountingCloseMonth`), and **say
them in your first message**: "actuals through X; closed through Y; source Z, last import D". The month
asked for (`M`) must have ended; if it hasn't, say so and ask before going on. Then by source:

| `source` | What to do |
|---|---|
| a connector (QuickBooks, Xero, NetSuite, Sage Intacct) | **No file.** Don't ask for one, and never offer Excel: the Manual import card is disabled. If `actualsThrough` < `M`: Settings → Integrations → the system's **Import** (the user presses it, or Claude after a yes; automatic imports pull the last two months, so it may just not have run yet; `M` must be closed in the accounting system). Re-read `getDataStatus()` and `getPeriods()` afterwards. |
| `QuickBooks Desktop` | **No file.** It imports **only on demand**: the user (or bookkeeper) runs the import from the PC with QuickBooks / Web Connector; Claude can't do it from the browser. Re-read `getDataStatus()` and `getPeriods()` afterwards. |
| `JiravExcel`, and `actualsThrough` ≥ `M` | `M` is already in Jirav (say when it was imported). **Nothing to import** unless the user has new or corrected figures: ask, don't ask for a file. |
| `JiravExcel`, `actualsThrough` < `M` | Continue below with the user's last import file. |
| none | The first import **makes Excel the company's actuals source** and greys out every connector; only Jirav support can change it back. Say so, get a yes, then `upload('accountingActuals', i, {firstImport: true})`. |

Also flag the close month now: an `Accounting system` close month with `accountingCloseMonth: null` (it
reads the **current month**) means the last file had no **Company Setup** tab: the close month fell back
and is effectively unknown. Imported actuals for `M` show in reports with an Actual column, not in a
plan's `M` column until the plan's actuals period is rolled (month-end close).

## 1. The file

Only now ask for the user's **last import file** (they drag it in or give folder access, as below), then
`im.fromBase64` (Jirav doesn't give it back, and the API doesn't show its Account IDs). Different from the
other imports: the template is a **blank** file, **every** file carries the whole chart (the COA tab
replaces Jirav's chart), and the IS / BS tabs set the months in the file.

**First import only:** on Settings → Integrations, real-click the Manual import card's **Template** link
(`await im.templateLink('accountingActuals')` gives its point). The browser saves the blank template to the
user's Downloads (the kit doesn't fetch it: it's on a file host outside jirav.com). The user drags it into the
conversation or gives Claude access to their Downloads folder (Cowork asks for the folder; in Claude Code,
its path). Then fill it in together.

Tabs (data from row 5): **COA** (Account ID, Parent ID, Account Name, Class, Category, Function, Number),
**Income Statement** (Account ID, Department ID, Calendar Month, Amount: that month's activity), **Balance
Sheet** (Account ID, Calendar Month, Balance: month-end balance; **no Retained Earnings / YTD earnings**:
Jirav computes them). Months are dates; each account × (department ×) month once. Company Setup (incl.
Close Month) and Departments are optional, but a tab left in the file with no rows fails the import: fill
it or `im.dropSheets(i, [names])`. The kit can't add a tab: if the file has no Company Setup tab, the
import leaves the close month on the current month (seen; whether a later import also overrides a
Specific Date isn't tested: check `getPeriods()` after each import); offer the user a Company Setup tab from the
template (its Close Month column sets it: template and app source, not tested) or Settings → Company →
Close Month → Specific Date ([company-settings.md](company-settings.md)), their call.

## 2. Before changing the file: check what the user gave you

- **Figures in another layout** (a GL or trial-balance export, a P&L): never upload it; copy `M` into the
  last import file's tabs, matching accounts by Number / Account ID.
- **Signs:** the file holds revenue, expenses, liabilities and equity as **positive** (contra accounts
  negative). Compare each account's sign with its earlier months in the file: GL exports often show credits
  as negative. Convert, and say you did; never import revenue as negative.
- **Months already in the file:** if the user changed the file themselves (they say so, it isn't the file
  you handed back last time, or it already holds `M`), read Jirav's actuals for those months (a report page
  with Actual columns, or the plan's actuals months) and list every difference, account × month, old → new.
  Importing **restates closed months** in every plan and every report that shows them (whether a published
  package keeps its old figures isn't tested: say so if one covers those months). Name each change,
  and in the same message say *(help)* re-importing over values can leave stale ones (import the same rows
  with 0 first, then the corrected file, or check the restated months after the import). Get a yes for it.
  Don't say the earlier months "match Jirav" unless you read them.
- **Balance Sheet tie-out for `M`:** Assets − Liabilities − Equity (no Retained Earnings) must equal last
  month's same figure + `M`'s net income. Off by any amount: show the numbers and ask before importing.

## 3. Add `M` and check the chart

Add `M`'s rows with `im.edit` (cells already in the file keep their date and currency formats), then
`await im.accountingCheck(i)` → `{source, months, accounts, removes, adds, emptyTabs}`.

- **`removes`**: Jirav accounts the file's COA leaves out. Importing **deletes them, with their history,
  from every month and every plan**. Name each one and its history, say so plainly, and ask. If the user
  doesn't mean it, add the account back **with its earlier months' rows** (from the user, or read from
  Jirav's actuals) and its `M` figure. Only with an explicit yes to the deletion pass `{removes: [...]}`.
- **Same Account ID, new name** shows as one `removes` + one `adds` (the check compares names). Whether
  Jirav renames the account or deletes the old one (with its history, drivers and report rows) and
  creates an empty new one isn't tested: treat it as delete + new, and say so. The safe default is to
  keep the old name in the file. Read `listPlanDrivers` / report setups for the old name before proposing.
- **`adds`**: new accounts are fine; check Class and Category (ask, or propose from similar accounts).
- **`accountingCheck` missing or no result:** paste the `imports` block again and retry once. Still
  nothing: compare the file's COA names with `getChartOfAccounts()` yourself and say that's what you did.
  `upload` runs the same check, so if it hangs, nothing was imported: say so, don't report success.

## 4. Import

Propose once: company, months in the file (and which are new vs restated), accounts (removed / added /
renamed), the close month the file will set, and scope (every plan). After a yes,
`await im.upload('accountingActuals', i)` → Jirav's result. Then give the user the imported file
(`im.readBase64(i)` into the workspace) and tell them to **keep it for next month**: the next import
starts from it.

## 5. Verify

Read, don't infer: `getDataStatus()` → `source: 'JiravExcel'`, Chart of Accounts / Trial Balance last
import = today, `actualsThrough` = the last month in the file; `getPeriods()` → the close month now (report
what you read; with no Company Setup tab, expect the current month). Then read `M`'s **actuals** (a report page with an Actual column for `M`, or the plan once
its actuals period includes `M`; a plan's `M` column before the roll is forecast) and check the Balance
Sheet balances, plus any restated months. Report only what you read; anything you didn't read, say
you didn't ("not re-read: …").
