---
name: board-pack
description: Builds a board pack (a board deck) from a company's numbers in Jirav: performance for the period, full-year outlook, next year's plan, KPIs, headcount, cash, and the decisions needed. Use when the user asks for a "board pack", "board deck", "board meeting slides", "investor update deck", "present the plan to the board", or "a deck showing the rest of the year and next year's plan".
---

# Board pack

Turns a company's Jirav data into a board deck: a few slides of insight, an appendix for detail,
every number traceable to Jirav. **Read-only in Jirav**: this skill never changes plans, reports or
dashboards. If the review suggests a fix (a forecast not rolled forward, say), flag it and stop.

**Invoke the `operating-jirav` skill (`jirav:operating-jirav`) first.** It finds companies and
plans, reads values and exports. Build the deck with the session's slide-deck output (a slides
artifact type, or a presentation skill); this skill decides what goes in it, not how slides are made.

## 1. Gather and propose

Work out the meeting from what the user said, read Jirav for the rest, and propose it all in one
message. Don't ask what Jirav can tell you.

- **Company.** Resolve it; ask only if ambiguous.
- **Meeting.** Regular board meeting (monthly or quarterly), budget approval, or fundraising /
  investor update. It changes the emphasis: review, next year's plan, or cash and runway.
- **Period** (never assume one):
  - the **review period**: the latest closed month or quarter, from the close month
    (`jirav.getPeriods`) and how fresh actuals are ([integrations.md](../operating-jirav/references/integrations.md));
  - the **fiscal year**, from company settings ([company-settings.md](../operating-jirav/references/company-settings.md));
  - the **outlook**: this fiscal year's actuals to date plus the remaining forecast;
  - **next year**, only if a plan covers it (check its months), or if the user asks.
- **Plans.** Budget, forecast and next year's plan, picked as in
  [plan-roles.md](../finance-references/plan-roles.md). Say
  which you picked and why: plan names are often misleading.
- **Existing material.** If the company has a board package in Jirav ([reports.md](../operating-jirav/references/reports.md)),
  or the user has a previous deck, follow its structure and metric definitions.
- **Metrics.** Use KPIs the company already tracks (custom tables, KPI lines, dashboard tiles). Don't
  introduce metrics Jirav doesn't hold (ARR, retention, pipeline) unless the user supplies them.

Propose: meeting type, periods, plans, the outline (below, trimmed to fit) and the headline metrics.
One yes, then read.

## 2. Outline

Under 20 slides. Every slide title states the takeaway ("Q3 revenue 6% ahead of budget; OpEx on
plan"), not a label ("Q3 P&L"). Charts for trends, tables only where exact numbers matter.

1. **Title.**
2. **Executive summary.** The headline, highlights and lowlights, 3–5 headline metrics with their
   trend, and what you need from the board.
3. **Performance for the period.** P&L summary: actual vs budget vs prior period (or prior year),
   $ and %. The 3–5 largest variances (material ones, if the company sets thresholds) with a reason, and whether each is timing or permanent.
4. **Full-year outlook.** Actuals to date + remaining forecast vs budget, with a bridge of what
   moved.
5. **KPIs.** The company's own KPIs as trends.
6. **Headcount.** By department vs plan; open and planned hires.
7. **Cash and runway.** Cash balance, burn, projected cash through the forecast, runway if burning.
8. **Next year's plan** (if in scope). Revenue, gross margin, OpEx, operating income, headcount;
   growth vs this year's outlook; a bridge; the **key assumptions**, read from the plan's assumption
   values and drivers.
9. **Risks and decisions.** Each decision as options with their financial impact.
10. **Appendix.** Full P&L by month, balance sheet, cash flow, department detail, definitions, and a
    **sources** slide (plan, page, period, date read) for every number in the deck.

## 3. Read

- Read values with the operator kit or its exports, filtered to the pages and months you need, and
  labelled actual vs forecast ([reading-grid-values.md](../operating-jirav/references/reading-grid-values.md),
  [exports.md](../operating-jirav/references/exports.md)). Use Jirav's own Balance Sheet and Cash Flow
  rather than deriving them.
- Totalling months into quarters or years is fine: say you did. Never compute values from raw API
  payloads.
- Compare as in [variance-analysis.md](../finance-references/variance-analysis.md): direction, which
  variances to report, explaining them, and its flags (used in steps 4 and 6).

## 4. Write the story

- Lead with what changed since the last meeting and what it means.
- Explain variances from what Jirav shows (which accounts, departments, months). Where the data
  can't explain a cause, write **[cause: ask <owner>]** on the slide.
- Say whether each variance is timing or permanent.

## 5. Prove it

Before handing over the deck:

- The outlook = actuals to date + remaining forecast, month by month.
- One total per plan (revenue or net income for the period) ties to Jirav's own Income Statement for
  the same source and period.
- Cash on the cash slide = Cash on the balance sheet for that month; the balance sheet balances.
- Headcount matches the plan's staffing or workforce figures.
- Recompute every %, variance and growth rate on the slides from the values shown.
- Every number appears on the sources slide.

## 6. Flags (report, don't fix)

The flags in variance-analysis.md, plus:

- Next year's plan is missing months, or starts from a different base than this year's outlook.
- Assumptions differ between plans without explanation.
- A plan name that contradicts its cutover.

Put flags in the chat, and in the deck only where the board needs to know.

## 7. Deliver

Build the deck, put the sources and any open **[cause: …]** items in the speaker notes, and offer
the appendix detail as an Excel export. List the flags and open items in the chat.
