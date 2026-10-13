# Variance analysis

Comparing actuals with a budget, forecast or prior period. Reading the values (fractions, group
rows, FY columns): `operating-jirav` → [reading-grid-values.md](../operating-jirav/references/reading-grid-values.md).

## Direction: the company's Variance Rules

Whether a variance is favourable is the company's setting, not a fixed rule. Read it with
`jirav.getVarianceRules()` (`operating-jirav` →
[variance-and-cash-flow-settings.md](../operating-jirav/references/variance-and-cash-flow-settings.md)):
one rule per line (`revenue`, `cogs`, `opex`, `gross_margin`, `operating_income`, `net_income`, cash
lines, custom lines), each `favorable`: POSITIVE, NEGATIVE or IGNORE.

- Label a variance favourable or unfavourable by its line's rule, so you agree with Jirav's reports.
- For an account without its own rule, use its section's rule (an account in OpEx follows `opex`) and
  say you did: that's an inference, not a Jirav setting.
- IGNORE: give the variance, no favourable/unfavourable label.
- A rule that looks unusual (rising COGS or OpEx marked favourable): follow it and mention it once;
  don't override it.

## Which variances to report

- If the line's rule has a threshold (`valueThreshold`, `percentThreshold`, combined by `match`
  OR / AND), a variance is material when it passes it.
- Most companies set none (0 on the P&L lines). Then don't call
  anything "material": rank by absolute amount, report the largest, and say no threshold is set.
  Use the user's threshold if they give one.
- Join plans by account label; an account missing from one plan counts as 0 there. Spend with no
  budget line and budget lines with no spend are worth listing.

## Explaining

Jirav shows amounts, not causes. Explain from what the data shows (which accounts, departments,
months, staffing, drivers). When it doesn't show why, write it as a question for the account
owner. Never guess a cause.

## Flags (report, don't fix)

Seen in real company data:
- No plan's actuals reach the close month (not rolled forward), or the close month lags the actuals
  loaded (`operating-jirav` → company-settings, integrations).
- Actuals that repeat earlier months exactly (sample or duplicated data, such as a
  short loop of months repeating); say it once.
- `misconfigured` drivers on the plan (Auto-Forecast overriding them, or broken inputs).
- A report source labelled "Deleted Plan".

