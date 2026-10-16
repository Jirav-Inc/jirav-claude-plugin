# GL actuals from Excel (JiravExcel)

**Scope: company-wide, changes actuals in every plan.** Where: Settings → Integrations → Actuals →
Accounting → **Manual import** (`/<tenant>/setup/integrations`). Only for companies whose accounting
source is Excel: most sync actuals from an accounting system ([integrations.md](integrations.md)). Uses
the `imports` block (paste `scripts/blocks/imports.min.js`; general rules: [imports.md](imports.md)).
For every change, follow **Edits** in SKILL.md.

Different from the other imports in three ways: the template is a **blank** file (not prefilled with
what Jirav holds), **every** file must carry the whole chart, and the first import changes how the
company gets actuals. The kit enforces the rules below; `upload` refuses otherwise.

| Accounting source (`getDataStatus().accounting.source`) | What happens |
|---|---|
| `JiravExcel` | Import as below. |
| none | The first import **makes Excel the company's actuals source** and greys out every connector; only Jirav support can change it back. Say so, get a yes, then `upload('accountingActuals', i, {firstImport: true})`. |
| a connector (QuickBooks, Xero…) | Not possible: the Manual import card is disabled and the kit refuses. Actuals come from that system. |

1. **Start from the user's last import file**: they drag it in or give folder access (as below), then
   `im.fromBase64` (Jirav doesn't give it back, and the API doesn't show its Account IDs). **First import
   only:** on Settings → Integrations, real-click the Manual import card's **Template** link
   (`await im.templateLink('accountingActuals')` gives its point). The browser saves the blank template to
   the user's Downloads (the kit doesn't fetch it: it's on a file host outside jirav.com). Let the user
   choose: drag it into the conversation, or give Claude access to their Downloads folder (Cowork asks
   for the folder; in Claude Code, its path) and Claude reads it from there. Then fill it in together.
2. Tabs (data from row 5): **COA** (Account ID, Parent ID, Account Name, Class, Category, Function,
   Number), **Income Statement** (Account ID, Department ID, Calendar Month, Amount: that month's
   activity), **Balance Sheet** (Account ID, Calendar Month, Balance: month-end balance, no YTD
   earnings). Months are dates; each account × (department ×) month once; contra accounts negative.
   Company Setup (incl. Close Month) and Departments are optional, but a tab left in the file with no
   rows fails the import: fill it or `im.dropSheets(i, [names])`.
3. Add the new month's rows with `im.edit` (cells already in the template keep its date and currency
   formats), then `await im.accountingCheck(i)` → `{source, months, accounts, removes, adds, emptyTabs}`.
4. **`removes`**: Jirav accounts the file's COA leaves out. Importing **deletes them from every month**.
   If the user means it, name them, get a yes and pass `{removes: [...]}`; otherwise add them back.
   `adds`: new accounts (fine; check Class and Category).
5. Confirm (company, months, accounts), `await im.upload('accountingActuals', i)` → Jirav's result.
   Then give the user the file that was imported (`im.readBase64(i)` into the workspace) and tell them to
   **keep it for next month**: the next import starts from it.
6. Verify: `getDataStatus()` → `source: 'JiravExcel'`, Chart of Accounts / Trial Balance last import =
   today, `actualsThrough` = the last month in the file; then the plan's Balance Sheet for that month
   balances. Without a Company Setup tab the close month falls back to the current month (seen); its
   Close Month column sets it (template and app source, not tested).

Verified on a test company: first import from the template, then a month added to that file with
nothing else changed (earlier months and accounts kept). *(help)* To correct a month, import the
same rows with 0 first, then the corrected file (re-importing over values can leave stale ones).
