# Plan roles: budget, forecast, next year

Jirav has no "budget" or "forecast" object: both are ordinary plans, and the app doesn't record
which is which. Work it out from the app facts in `operating-jirav` →
[plans.md](../plans.md) (cutover, periods, plan of record, Auto-Forecast
plan), then **say which plans you picked and why**, and ask when it isn't clear.

## Budget

Not necessarily the plan of record: companies point it at a rolling forecast or a test plan as
often as at a budget, and Jirav's own close guide makes each month's forecast snapshot the plan of
record. A budget import doesn't mark a plan as the budget.

1. The plan the user names.
2. Otherwise, candidates: plans whose `cutoverDate` is the first month of the fiscal year being
   reviewed, so the whole year is plan. A budget-like name, being locked, or being the plan of
   record make a candidate likelier; none proves it. The system Auto-Forecast plan is never a
   candidate unless the user says so.
3. One candidate: propose it with the reason ("cutover Jan-26, the start of FY26; locked").
   Several (a budget and a scenario, or a forecast made in the first month of the year): propose
   the likeliest and ask. None: ask; if there's no budget, compare with prior periods only, and
   say so.

## Forecast

1. The plan the user names.
2. Otherwise, candidates: plans other than the budget whose actuals include the close month
   (`cutoverDate` after the close month). Plan `type` doesn't settle it. Scenario plans ("Best
   Case") and the Auto-Forecast plan count only if nothing else fits.
3. Prefer the most recent `updateTime`, then the latest `cutoverDate`; if two remain plausible, ask.
4. None (no plan's actuals reach the close month): that's a finding, nothing has been rolled
   forward. Ask which plan to use; if no one can answer, use the rolling plan with the latest
   `cutoverDate`, compare only the months it has as actuals, and say so.

## Next year

A plan whose months cover the whole next fiscal year. If one only partly covers it, say which
months are missing. Never extrapolate.

