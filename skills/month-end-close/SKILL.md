---
name: month-end-close
description: Runs Jirav's month-end close for a company, step by step as in Jirav's Month-End Close guide - snapshot the plan, optionally make it the Plan of Record, roll the actuals period forward, check imports and the balance sheet, refresh workforce, custom and budget imports, review variances and update assumptions and drivers, set the close month, check reports and dashboards, then publish and share. Handles Controller Essentials and CFO. Use when the user asks to "close the month", "run the month-end close", "do the monthly close in Jirav", or "roll the plan forward for month end".
---

# Month-end close

Jirav's documented close: [Month-End Close Steps](https://help.jirav.com/month-end-close-steps).
Do its ten steps, in its order, for one company and one closing month.

**Invoke `operating-jirav` (`jirav:operating-jirav`) first.** It does every lookup, read and edit;
its *Before any change* and *Edits* rules apply to every change below, and its references hold the
clicks. Steps it doesn't cover are marked **for the user**: say what to do (the guide's own path),
wait, then check the result. Never improvise them.

## Before the steps (reads only)

1. **Subscription:** `getSubscription().subscription`. **Controller Essentials** and **CFO** close
   differently (below). `null`: say the subscription isn't known and ask before going on.
2. **Plans:** `listPlans()` and `listArchivedPlans()`. Never infer a plan's role from its name or id.
   Show the plans with their actuals and forecast periods and ask:
   - *CFO:* which plan is being closed (unless there's only one candidate).
   - *Controller Essentials:* which of the two plans is the forecast plan (it rolls forward) and which
     is the budget (it stays fixed).
3. **Closing month** (`M`): `getPeriods()` → `closeMonth` and `closeMonthSource`; `getDataStatus()` →
   `actualsThrough`.
   - Close Month follows the **Accounting system** → `M` is the close month itself.
   - **Specific Date** → `M` is the month after it.
   - The user names a month → that month. Never a month that hasn't ended.
   - Show the close month and `actualsThrough`, propose `M`, and ask. Flag a close month stuck well
     behind `actualsThrough`, or an accounting-system close month with no accounting close date
     (`accountingCloseMonth` null): suggest setting the close date in the accounting system or
     switching to a Specific Date (the user's call).
4. **Done before?** (a run that stopped part-way). Treat as done: an archived snapshot named
   `<plan> - <Mon-YY> PoR` for `M` (use it, don't clone again); Current POR already on it; the plan's
   actuals already ending at `M` or later (never move them back); a published package
   `<package> <Mon YY>`. Say what was found and start at the first step that isn't done. If traces
   contradict each other, ask.
5. **Auto Roll Forward** (`listPlans().autoRollForward`, CFO and Essentials): if it's on and the plan
   has already rolled past `M`, say so; skip the manual roll; the plan no longer holds a forecast for
   `M` (step 7 then compares against the budget or the snapshot).
6. **Actuals for `M`** (step 2 below): do the months that hold actuals reach `M`
   (`actualsThrough` ≥ `M`)?
7. **Balance Sheet for `M`** (step 3 below).
8. **Forecast for `M`:** read the plan being closed for `M` (`readGridValues({from: M, to: M, maxDepth:
   1})` on the Revenue, COGS, OpEx and Other pages) **before** anything rolls. It's what step 7
   compares with the actuals; an archived snapshot can't be opened or used in reports afterwards.

**Propose once**, before any change: the plan, `M`, what 1–8 found, and the changes, each with its
scope (this plan / company-wide). Ask the questions for steps 4–6 here too, so the rest can run
without stopping. One yes covers the proposal, except **Make PoR**, which gets its own yes right
before the click. A reply that skips something applies to the rest of the run: mark it
`Skipped (you)` and carry on.

## The steps

**1. Snapshot and roll forward.** Don't roll until steps 2 and 3 pass.
- *CFO:* **snapshot** = Clone the plan being closed; it lands in **Archived**. Rename it there to
  `<plan> - <Mon-YY> PoR` and Save. **Don't make it active**: the plan being closed stays active and
  reports keep using it ([plans.md → Copy, activate, delete](../operating-jirav/references/plans.md#copy-activate-delete)).
- *CFO:* **Make PoR is optional** (some firms do it quarterly or for board months). Before offering
  it, read Current POR and list the reports and tiles that use it, and say what they'll show
  afterwards ([plans.md → Plan of record](../operating-jirav/references/plans.md#plan-of-record-and-other-plan-facts)):
  with no active PoR, an archived snapshot leaves Current POR unchanged; if the active PoR is the
  budget, a new PoR moves Current POR off the budget. Ask a separate yes, then Make PoR on the archived
  snapshot (no confirmation, can't be undone) and read Current POR again.
- *Controller Essentials:* there's no clone, archive or Make PoR: say so. Roll the **forecast plan**;
  the budget plan stays fixed.
- **Roll forward:** the plan's Actuals Period → Custom Range ending at `M` → Apply → Confirm Plan Date
  Changes → Yes → Save ([plans.md → Periods](../operating-jirav/references/plans.md#periods-and-manage-plans-columns)).
  It replaces the plan's forecast for those months with actuals: say so in the proposal. Check with
  `getPeriods(planId)`.

**2. System health.** One question: do the actuals reach `M` (`actualsThrough` ≥ `M`)? Yes → done,
whatever the source (`connected: false` is normal for a file source such as JiravExcel). No → by
source (`getDataStatus().accounting`, [integrations.md](../operating-jirav/references/integrations.md)):
- a connector that's connected: the month hasn't arrived; **for the user**, import or wait
  (automatic imports cover the last two months; QuickBooks Desktop only imports on demand);
- a connector that's disconnected: **for the user**, reconnect in Settings → Integrations, then import;
- JiravExcel: add the month to the user's last import file and import it
  ([excel-actuals.md](../operating-jirav/references/excel-actuals.md));
  with no file from the user, **for the user** (Integrations → Actuals → Accounting → Manual import);
- no source: the company has no actuals feed. Stop and ask how actuals get into Jirav.
Also ask whether the user sees the orange warning triangle at the top right (the guide's signal).

**3. GL actuals.** For `M`, Assets = Liabilities + Equity within half a cent (grid values carry
rounding noise). Not equal → report the difference; **for the user**, correct the source and
re-import the adjusted periods (Settings → Integrations). Offer an optional tie-out: net income,
revenue and cash for `M` against the accounting system (ask for the numbers or a report). Late
adjusting entries to older months need a re-import; a later mismatch isn't a failed close.

**4. Workforce roster.** Ask whether staffing changed in `M` (show the last staff import). If so,
import the updated roster ([imports.md](../operating-jirav/references/imports.md)): it replaces the
whole staff list for every plan.

**5. Custom data actuals.** If the company tracks them (show the last custom import): an Excel
import ([imports.md](../operating-jirav/references/imports.md)), or, for a linked Google Sheet, **for
the user** (Settings → Integrations → Custom).

**6. Budget accounting and custom data.** If the company imports planned data: update the budget
import for its plan ([imports.md](../operating-jirav/references/imports.md); a new budget file: the
`budget-import` skill).

**7. Variances, assumptions, drivers, manual inputs.**
- Compare the forecast read before rolling (Before the steps, 8) with the actuals for `M`; if the
  client reviews a budget vs actual or forecast vs actual report page, read that too
  ([reports.md](../operating-jirav/references/reports.md)). Table: line | forecast | actual | Δ |
  Δ% | favourable per the line's variance rule
  ([variance-analysis.md](../operating-jirav/references/finance/variance-analysis.md)); sort by |Δ|, top 10, say how
  many more.
- *CFO:* update assumptions ([assumption-values.md](../operating-jirav/references/assumption-values.md))
  and check drivers have no errors (`misconfigured` in `listPlanDrivers`,
  [plan-drivers.md](../operating-jirav/references/plan-drivers.md)). *Controller Essentials* has no
  assumptions or drivers; if the forecast plan uses Auto-Forecast, check it refilled the remaining
  months.
- Changes come from the user (they may need to agree them with colleagues): propose, don't decide.

**8. Close month.** Settings → Company → Accounting → Close Month
([company-settings.md](../operating-jirav/references/company-settings.md)). **Specific Date** → set it
to `M` and Save (part of the proposal), then check `getPeriods().closeMonth`. **Accounting system** →
read-only: confirm it equals `M`; if not, **for the user**, close the month in the accounting system.

**9. Reports and dashboards: check, don't change.** List tile sources and report columns that point at
a deleted or archived plan, ranges ending before `M`, and comparisons to Actuals past `M`
([dashboards.md](../operating-jirav/references/dashboards.md),
[report-editing.md](../operating-jirav/references/report-editing.md)). If Current POR moved, say what
it shows now. Edit only what the user asks; text is the user's words.

**10. Publish and share.**
- Reports: publish (a frozen copy, named `<package> <Mon YY>`) with a yes, then offer the PDF export
  in the same step ([exports.md](../operating-jirav/references/exports.md)). Comments for viewers:
  the user's words only. Skip test packages (Test, ZZ, `_1` copies).
- Share, for reports and dashboards: **for the user**: it emails people, and isn't covered.

## End

A table, then one line of anything left open:

| Step | Status | What changed |
|---|---|---|
| 1 Snapshot & roll | … | … |
| … through 10 | | |

Status is one of `Done`, `Done (no issues)`, `For you`, `N/A`, `Skipped (you)`, `Waiting`.
