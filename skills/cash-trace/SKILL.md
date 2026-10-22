---
name: cash-trace
description: "Answers the CEO's cash questions from a Jirav plan: what happened to cash (actual months, vs budget), what we think will happen (forecast cash path, System Cash, burn and runway, whether the forecast is believable), and what we need to do (gap to a cash goal, levers sized in $/month and runway months). Use for 'what's driving our cash', 'why is cash so low/high', 'trace System Cash', 'how can I reduce cash burn', 'extend runway', 'will we stay above our minimum cash'."
---

# System Cash Trace

Tells the cash story in three parts, the way a CEO asks it:

1. **What happened?** Actual months: where cash went and why, vs budget.
2. **What do we think will happen?** Forecast months: the cash path, what drives it, burn and runway.
3. **What do we need to do to make it happen?** The gap to the cash goal, the levers that close it (sized in $/month and runway months), and the assumptions that must hold.

Jirav already shows the increases and decreases; this skill turns them into a ranked, explained story in plain business language.

**Read-only, always.** Never change settings, drivers, plan values, the close month or a sync in the live plan, even when the user says "just change it". Modeling a lever happens only on a plan copy and only after the user confirms. **Settings → Forecast (A/R, A/P) and Settings → Cash Flow are company-wide: they change every plan, copies and budgets included, so a plan copy does not isolate them.** For a settings what-if, size it from the data (section 6) and, if the user wants it in Jirav, say that scope and get an explicit yes that names it (or model it on a copy with a typed/driver adjustment to the account instead).

Load `operating-jirav` first for sign-in, reading grids and API calls.

**Numbers come from a script.** Compute the bridge, every total, burn, runway, low point, gap, comparisons (growth, days of sales) and lever sizes in one script (JS or Python) and copy its printed figures; never add or retype a number by hand, including figures in sentences (percentages, days, dates N months ahead) and side what-ifs ("burn without the loan", "a 10% miss would cost"): compute each in the script too. **Before sending, re-check:** list every number in the reply and confirm each one appears in the script output (or is a read value); fix or remove any that doesn't. The driver lists are non-overlapping, ranked by absolute dollars, and **printed by the script as a table with a sum row** that equals the cash change they explain (and a "difference" of 0); quote the amounts from that table, don't paraphrase or re-add them.

## Background: what System Cash is

- System Cash is a **calculated** line in forecast months. Jirav balances the Balance Sheet through it: anything that changes another balance sheet account without an offsetting entry lands in System Cash. In actual months it's blank (no value); cash sits in the bank accounts.
- Other cash/bank accounts stay at their last actual balance unless something drives them. **Total cash = every bank account plus System Cash, counted once**: in some companies the cash account's row already includes System Cash in forecast months (account row = System Cash + the same-named bank sub-line beneath it). Check whether it does (row = sub-line + System Cash) and never add System Cash twice; in that layout the "other cash" for the bridge is the sub-line. Burn, runway, low point and goals are always on total cash. A Balance Sheet driver that moves money into another cash account (a reserve sweep) lowers System Cash but not total cash.
- System A/R and System A/P are also calculated, from Settings → Forecast → A/R and A/P.
- Plan pages: there is no single Balance Sheet or Income Statement page. The Balance Sheet is the plan pages `assets`, `liabilities` and `equity` (a `balance-sheet` slug silently redirects to the dashboard); Net Income is on `other`, revenue on `revenue`, COGS on `cogs`, OpEx on `opex`. On the equity page Current Year Earnings may be labelled **"Net Income"**, and it and Retained Earnings may be `line` rows rather than `account` rows: include them.
- On the Balance Sheet an **account row is its balance**. Rows under it (`System …` balances; `Increase`, `Decrease`, `… (driver)` movements) are components already inside that balance: use them to explain a change, never add them to the bridge as well.

## 1. Scope

Get (ask only for what's missing): company, plan (default: the rolling forecast, per `operating-jirav` → `finance/plan-roles.md`; not the Plan of Record, which is usually the budget. **If no plan qualifies, several do**, or the rule would pick a copy or a test-named plan ("Copy of…", "ZZ…", "test"), list the candidates and ask), the budget plan for comparison only, the period (default: the trailing 6 closed months + the forecast through fiscal year end), the cash goal if any (minimum cash, runway target, or year-end balance), the month(s) that look wrong and what the user expected, and who it's for (CEO/owner → business language, no jargon; accountant → full bridge). Note the close month (actuals end there) and the fiscal year start month (`getPeriods()` → `fiscalYearStartMonth`, or `getCompanySettings()`; there is no `getCompanyInfo`).

**Picking the budget plan** when the user doesn't name one: the plan with role Budget whose `getPeriods` covers the closed months being compared (its fiscal year); if several do, the one that is the Plan of Record or locked; never a draft for next year, and never the forecast plan being traced. Say which one you used and why. If no plan has budget values for the closed months (e.g. every plan's cutover is after them, so they hold actuals), say "vs budget: not available — no plan has budget values for these months" and skip the comparison; never compare against another forecast or Actuals.

## 2. Pull the data

For the window:

1. Balance Sheet by month (plan pages `assets`, `liabilities`, `equity`) for the closed months, plus the month before the first one as the opening, and the forecast months: every line, including System, "(driver)" and Increase/Decrease lines and the equity `line` rows. Use only months up to the close month as actuals (a report can tag empty future months `actual`).
2. Income Statement by month: Net Income (page `other`), revenue, COGS, top OpEx accounts/departments.
3. Budget plan for the same months (`getPeriods` to confirm coverage): Net Income, revenue, costs, A/R, A/P and cash.
4. `getCashFlowSetup()`, `getArApSettings()`, `listPlanDrivers(planId)` (it has no filter: keep the Balance Sheet, Prepaids & CapEx and revenue growth drivers yourself by `type`/`page`/`output`), staffing hires by month (`listStaff`).
5. The data status (`jirav.getDataStatus()`: last sync, errors) for the accounting connection.
6. A Cash Flow Statement report page, if one exists, as a cross-check. These are usually sourced from Actuals: use them for closed months only; a plan-sourced one rarely exists.

**A value that can't be read** (blank cell, read error) stays unknown. Never back-solve it from cash or the totals, interpolate it, or show it as read. Every month whose bridge needs it (the month it's missing and the month after) gets residual **"not computable – <line> unread"**, not 0. You may give the implied amount and a likely cause from a driver, labelled **inferred, not read**, and a tie across the readable months on either side. Say which cells to re-read.

## 3. Build the bridge (used by every part)

Use balance rows only (account rows, plus the equity `line` rows for Retained Earnings and Current Year Earnings / "Net Income"; never the ↳ components). For each month m (Δ = balance at m − balance at m−1):

```
Ending cash = Starting cash
  + Net Income (Income Statement)
  − Δ every asset balance not counted as cash
      (A/R, prepaids, inventory, fixed assets; contra assets such as accumulated
       depreciation with their sign, so a more negative balance adds cash)
  + Δ every liability balance (A/P, accruals, deferred revenue, loans)
  + Δ every equity balance except Retained Earnings and Current Year Earnings
  + [Δ Retained Earnings + Δ Current Year Earnings − Net Income]
```

- **Actual months:** "cash" = all bank/cash accounts together (System Cash is 0); tie to their total.
- **Forecast months:** "cash" = System Cash; every other cash account (or, where the cash account row includes System Cash, its bank sub-line) is treated like any other asset (a transfer into it is shown as "moved to <account>, still cash"). Tie to System Cash; report total cash alongside.
- **The bracket** is 0 in a normal month. At the fiscal year start Jirav closes the prior year's Current Year Earnings into Retained Earnings: RE jumps by last month's CYE and CYE resets to this month's Net Income. Both are non-cash and cancel inside the bracket; never add the RE jump on its own (it double counts the prior year's earnings). A non-zero bracket is a direct posting to RE or CYE (dividend or distribution driver, prior-period adjustment): real cash, its own line.

It must tie within $1 every month. A residual means a line was missed or double counted; find it before explaining anything, and never plug it. Group movements Operating / Investing / Financing (by business nature), then translate to business activity: "customers paying slower" not "increase in System A/R"; "the new hires" not "Salaries & Wages".

## 4. What happened? (actual months)

- Cash (all bank accounts) at start and end of the period, net change, average monthly net burn.
- Top 3–5 reasons cash moved, ranked by dollars (operating results, collections and payment timing, one-time items like CapEx, loan activity, distributions, equity).
- **vs budget:** actual ending cash vs the budget's ending cash for the same month, and the difference split, by script, into: revenue, cost of revenue, operating expenses (each actual − budget, summed over the closed months, sign = cash effect), receivables (budget A/R − actual A/R at the end), payables (actual A/P − budget A/P at the end), and anything else. The parts must sum to the difference.
- **Data issues first:** actuals not synced through the close month (data status error or last sync before the close month's end; revenue or whole cost lines at 0, balances frozen at the prior month), unmapped accounts, a cash account outside the balance sheet mapping. A month with a data issue isn't explained as business performance and is left out of (or caveated in) averages, burn and vs-budget; recommend re-syncing and re-closing it (the user's or bookkeeper's action, never yours).

## 5. What do we think will happen? (forecast months)

- The cash path by month (total cash, starting with the close month's actual balance): lowest point and when (the close month counts, so a path that only rises has its low point there), ending cash at fiscal year end, burn and runway:
  - **Net burn** = (total cash at the start − at the end of the forecast window) ÷ months.
  - **Run-rate burn** = the same over the last 3 forecast months (total cash at the end of the month before them − at the end of the last month, ÷ 3), excluding financing inflows (loan draws, equity raised), transfers between cash accounts and model artifacts; repayments, distributions and CapEx stay in. Say what was excluded.
  - **Runway** = ending total cash ÷ run-rate burn, from the last forecast month, with the month it points to. Run-rate burn ≤ 0: say cash is growing. Planned financing that isn't certain (or when asked): give runway with and without it, and the month cash reaches zero without it. If net and run-rate burn differ by more than 20%, say why. (Per `operating-jirav` → `finance/burn-and-runway.md`.)
  - **When a model artifact distorts cash** (a wipe, an A/R or A/P reset, anything in the artifacts list below): report the **as-read** path, low point, burn and runway first, then the same figures **excluding the artifact**, both computed by the script: excluding-artifact cash = as-read cash − the artifact's cash effect from the bridge, cumulated from the month it hits. Label them "as the forecast stands" and "without the <artifact>", and lead the CEO text with the artifact. Never present the excluding-artifact figures without saying so, and never estimate them from a different base (e.g. last actual cash + net income). Levers are sized on the excluding-artifact base, and say so.
- What drives the forecast, ranked: operating results, timing, lumpy items (hires, bonuses, CapEx, loan payments, raises).
- **Is the forecast believable?** Compute, don't estimate, from section 4's actuals vs the forecast:
  - revenue growth: compound monthly growth, (last ÷ first)^(1 ÷ months) − 1, over the closed months (from the opening month) vs over the forecast months (from the close month), and any growth driver's rate; never the average of monthly % changes;
  - collection speed: days of sales owed = A/R ÷ that month's revenue × 30, last closed month vs first forecast month (and the A/R setting);
  - spend run rate: average monthly operating expenses, closed vs forecast.
  Flag each one more optimistic than recent history, and size it: rerun the cash path at the recent rate in the script, or, when that needs more than the reads give, size it as one figure (e.g. forecast revenue minus revenue at the recent growth rate, times the margin; the one-time collection gap = revenue × day difference ÷ 30), and state the difference in ending cash.
- **Model artifacts first:** setup issues move cash without reflecting the business. Check for:
  - Balance sheet wipe after a budget import: a large typed Increase/Decrease in the first forecast month equal to an account's whole balance (see `budget-import` section 2). Offer the repair there; never run it unasked.
  - **A/R None:** check for a wipe first (a typed Decrease that takes A/R to 0 is the wipe, not the setting). Otherwise the receivable is frozen at its last actual balance; forecast revenue turns into cash in the month it's earned, and the opening balance is never collected. Say both halves (don't say revenue is never collected) and size: versus the actual days of sales owed d, cash is too low by the frozen balance and too high by revenue × d ÷ 30. A/P None likewise (bills paid at once, opening A/P never paid). Long delays out of line with actual days: size them.
  - **A/R or A/P Trended:** each forecast month collects the whole previous A/R balance and the new balance is that month's revenue × the recent ratio of A/R to revenue (A/P: OpEx), averaged over the setting's trailing months (`operating-jirav` → `forecast-settings.md`). Read the System balances and show what they imply ("A/R equals 40% of each month's revenue in these numbers"); a ratio far from the last actual months, or a first-month reset far from the actual balance, is an artifact, not collections. Don't propose a rate.
  - Revenue billed through deferred revenue and also run through A/R: a receivable for cash already received, understating cash by about that revenue × delay ÷ 30.
  - Depreciation typed on the P&L with no accumulated-depreciation movement (a non-cash cost reducing cash).
  - Loans classed Operating, accumulated depreciation classed Investing (always check `getCashFlowSetup()`; report both as classed and corrected in the appendix, and in CEO text only when it changes the conclusion; never change it).
  - Balance Sheet drivers (loan draws/repayments, distributions, contributions, transfers): Frequency and Start/End (e.g. repayments running past the loan amount).
  - Non-cash P&L items (depreciation, amortization, deferred revenue recognized) widening the gap between profit and cash.
  - A big first-forecast-month jump from opening balances that didn't carry, or from an incomplete close month.

## 6. What do we need to do to make it happen?

- **The gap:** forecast low point (total cash, month-end) vs the cash goal (e.g. "cash bottoms at $180k in May; goal is $300k minimum → $120k short"), with the months below the goal. **No goal given:** don't invent one as the user's; report the low point and runway, and offer a goal as a suggestion (e.g. "a common floor is 6–12 months of runway, which here would be $X") for the user to confirm.
- **Levers that close it**, only from what's in this company's numbers. Scan every expense line that is 5% or more of monthly spending first, leaving out non-cash lines (depreciation, amortization): cutting them saves no cash. Size each with a script (C = ending total cash, B = run-rate burn): monthly saving s (its average over the same last 3 forecast months that B is measured on, so a saving that ramps up isn't understated) → runway gain = C ÷ (B − s) − C ÷ B; one-time cash X → X ÷ B months; against a goal, say how much of the gap each closes and from which month.
  - Collect faster: shortening from d1 to d2 days releases ≈ monthly revenue × (d1 − d2) ÷ 30, once. d1 is the A/R delay setting, or, when the method is None or Trended, the actual days of sales owed at the close month (say so); d2 comes from the user's terms or a stated example, not an arbitrary number. Company-wide setting: offer as a sized estimate, never as "model it on a copy" via Settings.
  - Pay vendors on terms: same on the A/P cost base (timing; vendor-relationship risk; company-wide setting).
  - Headcount timing: from staffing; monthly cost = annual wages ÷ 12, loaded × (1 + rate) only if a plan driver gives the rate (say which); delaying N months saves monthly cost × N; respect any hire the user calls firm.
  - Largest cash OpEx lines (not depreciation or amortization) growing faster than revenue: holding at the last actual level saves Σ(planned − held).
  - Gross margin: each point = revenue × 1%.
  - CapEx timing: defer, lease or phase (one-time cash; note lease payments that partly offset).
  - Pricing/revenue mix, only if the data shows it.
  - Financing (line of credit, debt timing) as a runway bridge, not a burn cut.
- **What must hold:** the 2–4 forecast assumptions the plan depends on (e.g. "revenue grows 4%/month", "customers pay in 30 days"), each compared with recent actuals and with the cash impact if it slips (computed).
- **Actions and checkpoints:** who owns each lever, and the monthly numbers to watch at each close (cash vs the forecast path, days of sales owed, revenue vs forecast, hire dates).

Present the top 3–5 levers ranked by cash impact, each with what it is, the dollars (per month or one-time), the runway months (or share of the gap), the effort/risk, and where it lives in Jirav. Present them as options for management to weigh, not recommendations to execute. To see a lever's effect, offer to model it on a **copy** of the plan (or, for a company-wide setting, see the top of this skill) and compare ending cash and runway side by side. Nothing changes without an explicit yes.

## 7. Report

**CEO/owner wording.** The CEO-facing parts (headline and sections 1–4 below) use business words only. Not allowed there: account or system names and abbreviations (System Cash, A/R, A/P, DSO, accrual, accrued, deferred revenue, retained earnings, current year earnings, equity, contra, working capital, Operating/Investing/Financing, "Δ", driver names). Say instead: "customers paying us", "money customers owe us", "days customers take to pay", "paying suppliers", "money borrowed", "owners' payouts", "the forecast's cash line", "the forecast's collections setting". Don't describe what an account holds beyond its name and the reads. For an accountant, account names are fine throughout.

1. **Headline:** one line each for what happened, what we expect, and what it takes (e.g. "Cash fell $240k last quarter, $60k more than budget, because customers paid slower. We expect a low of $180k in May. Closing the $120k gap means getting customers back to paying in 35 days and pushing two hires to Q3."). Label any inference in the same sentence.
2. **What happened:** ranked reasons, vs budget, data issues.
3. **What we think will happen:** cash path, low point, burn and runway (which burn, which cash, with/without planned financing), believability flags with numbers, model artifacts.
4. **What we need to do:** gap (or the no-goal handling), sized levers, must-hold assumptions, checkpoints.
5. **Appendix (for your finance team):** bridge tables (actual months on total cash; forecast months on System Cash, with total cash alongside): months as columns; Starting cash, Net Income, each material balance change, the RE/CYE bracket when non-zero, Ending (calculated), Jirav cash, Difference (0, or "not computable" with the unread line); and setup findings, flagged, never changed.

State the plan, budget (and why), window, close month and fiscal year start used. Label every estimate or inference as such; if a number can't be read, say so rather than estimating it as fact.
