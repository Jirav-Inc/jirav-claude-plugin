---
name: month-end-close
description: Runs Jirav's month-end close for a company, step by step as in Jirav's Month-End Close guide - snapshot the plan as Plan of Record, roll the actuals period forward, check imports and the balance sheet, refresh workforce, custom and budget imports, update assumptions and drivers, verify the close month, update reports and dashboards, then publish and share. Use when the user asks to "close the month", "run the month-end close", "do the monthly close in Jirav", or "roll the plan forward for month end".
---

# Month-end close

Jirav's documented close: [Month-End Close Steps](https://help.jirav.com/month-end-close-steps).
Do its ten steps, in its order, for one company and one closing month. **Don't add steps.**

**Invoke `operating-jirav` (`jirav:operating-jirav`) first.** It does every lookup, read and edit;
its *Before any change* and *Edits* rules apply to every change below. Steps it doesn't cover are
marked **for the user**: say what to do (the guide's own path), wait, then check the result. Never
improvise them.

At the start, confirm the company, the plan being closed, and the month (by default the month
after the close month, `getPeriods`). Propose the changes you can already see, with their scope; one
yes covers those.

## The steps

**1. Create a PoR clone and update actuals.**
- Clone the current plan as the snapshot, rename it, and make it active
  ([plans.md → Copy, activate, delete](../operating-jirav/references/plans.md#copy-activate-delete)).
  A company has at most 5 active plans: if full, ask which to archive.
- Designate the snapshot as Plan of Record: **for the user** (Manage Plans → the snapshot's ⋯ →
  Make PoR). It can't be undone. Then confirm it with the *Current PoR* source.
- Update the current plan's **Actuals Period** to include the month
  ([plans.md → Periods](../operating-jirav/references/plans.md#periods-and-manage-plans-columns)).

**2. Check system health.** Accounting actuals imported successfully: the source is connected and
the last import is recent (`getDataStatus()`, [integrations.md](../operating-jirav/references/integrations.md)).
The guide's signal is an orange warning triangle at the top right; reading it isn't covered, so ask
the user whether they see one. If imports failed: **for the user**, reconnect in Settings →
Integrations.

**3. Verify GL actuals are current.** On the Balance Sheet report, Assets equal Total Liabilities &
Equity for the month. If not: **for the user**, re-import the adjusted periods in Settings →
Integrations.

**4. Review the workforce roster.** If staffing changed during the month, import the updated roster
([imports.md](../operating-jirav/references/imports.md)). It replaces the whole staff list for every
plan.

**5. Review custom data actuals.** If the company tracks them: an Excel import
([imports.md](../operating-jirav/references/imports.md)), or, for a linked Google Sheet, **for the
user** (Settings → Integrations → Custom).

**6. Review budget accounting and custom data.** If the company imports planned accounting or
custom-table data: update the budget import for the plan it belongs to
([imports.md](../operating-jirav/references/imports.md)).

**7. Update assumptions, drivers and manual inputs.**
- Review the variances between the prior forecast (the step 1 snapshot) and the actuals, as in
  [variance-analysis.md](../finance-references/variance-analysis.md).
- Update assumptions ([assumption-values.md](../operating-jirav/references/assumption-values.md)) and
  check the drivers have no errors (`misconfigured` in `listPlanDrivers`,
  [plan-drivers.md](../operating-jirav/references/plan-drivers.md)).
- Changes come from the user (they may need to agree them with colleagues): propose, don't decide.

**8. Verify the close month.** Settings → Company → Accounting → Close Month
([company-settings.md](../operating-jirav/references/company-settings.md)). If it follows the
accounting system, it's read-only: confirm it. If it's a specific date and needs changing: **for the
user** (saving it isn't covered), then confirm with `getPeriods`.

**9. Update reports and dashboards.** Check tile data sources and report columns, update text and
formatting, add reports or tiles as needed ([dashboards.md](../operating-jirav/references/dashboards.md),
[report-editing.md](../operating-jirav/references/report-editing.md)). Text is the user's words.

**10. Publish and share.**
- Reports: publish (a frozen copy) with a yes; add comments for viewers with the user's words;
  optionally export to PDF, Excel or Google Sheets ([exports.md](../operating-jirav/references/exports.md)).
- Share, for reports and dashboards: **for the user**: it emails people, and isn't covered.
- Dashboards: comments for viewers, with the user's words.

## End

Report each step as done, for the user, or not applicable, with what changed.
