# Exchange rates

Rates translate each foreign-currency entity into the reporting currency: the month's **average** for the
P&L, the **month-end** rate for the balance sheet. `cs.ratesNeeded(g)` says which currencies and months
(from the month before the fiscal year's start, for opening balances). The rates come from the user; the
kit only reads the text you pass to `cs.setRates`.

## 1. The user's own rates (ask first)

From their bank, accounting system or auditor. Any table with these columns, CSV or tab-separated:

```
currency,month,avg,close
CAD,2026-09,0.7163,0.7051
```

- `avg`, `close`: units of the **reporting** currency per 1 unit of `currency` (CAD into USD is about 0.7,
  not 1.4). Either may be left out if they only give one.
- Read their file in your workspace, turn it into that table, and pass it:
  `await cs.setRates(g, {ratesCsv})`. Their rates win over the ECB's for the same month.
- `warnings` in the result: a rate far from the ECB's, usually quoted the other way round. Ask; never flip
  a rate yourself.

## 2. ECB reference rates (when they have none)

The European Central Bank's monthly reference rates: free, official, no account or key. About 30 major
currencies, each quoted against the euro; the kit crosses them into the reporting currency.

**The user downloads the file; you don't fetch it.** The ECB's site refuses AI agents. Don't fetch the link
with any tool, browser tab or script, and don't use a site that copies the ECB's data. Give the user the
link: "Open this link in your browser. It downloads a small file of exchange rates, `data.csv` (your browser
may ask where to save it). Drag it in here." Then read the file in your workspace.

**The link:**

```
https://data-api.ecb.europa.eu/service/data/EXR/M.<currencies>.EUR.SP00.A+E?startPeriod=<from>&endPeriod=<to>&format=csvdata&detail=dataonly
```

- `<currencies>`: every entity currency **and** the reporting currency, joined with `+`, leaving out EUR
  (`CAD+USD` for a CAD entity in a USD group).
- `<from>`, `<to>`: `YYYY-MM`, from `ratesNeeded`.
- `A+E`: `A` the month's average, `E` the month-end rate.
- `detail=dataonly` keeps the file small (about 5 KB for two currencies over two years).

Example (CAD and USD, Dec 2024 to Oct 2026):

```
https://data-api.ecb.europa.eu/service/data/EXR/M.CAD+USD.EUR.SP00.A+E?startPeriod=2024-12&endPeriod=2026-10&format=csvdata&detail=dataonly
```

**Response:** CSV, one row per currency, kind and month; `OBS_VALUE` is units of that currency per 1 euro.

```
KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.M.CAD.EUR.SP00.A,M,CAD,EUR,SP00,A,2025-01,1.4903681818182
```

Pass the file's text as it is: `await cs.setRates(g, {ecbCsv})`. It returns `missing`: months without a rate.
The rates are kept in the set-up (and its consolidation.json), so each month only the new month is needed:
set `startPeriod` and `endPeriod` to that month.

- **The latest month** appears only after the month ends. Missing for the month just closed: ask the user
  for that month's rates, or consolidate through the month before.
- **No rows for a currency** (or the link shows a 404): the ECB doesn't publish it. Ask the user for their
  rates for it.

Tell the user which source the rates came from; the workpaper's FX rates tab lists them by month.
