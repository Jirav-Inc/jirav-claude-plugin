# Forecast settings (Auto-Forecast method, A/R and A/P)

**Scope: company-wide, applies to every plan.** Where: Settings → Forecast
(`/<tenant>/setup/forecast`), which has two tabs. Confirm before any change.

| Tab | URL | What it sets |
|---|---|---|
| **Auto-Forecast** | `/setup/forecast/auto-forecast` | **How** Auto-Forecast forecasts and **which** accounts and departments it covers. Forecast Type is **Automatic** (linear trend with seasonality on top-level accounts and departments) or **Custom** (per account and department). |
| **A/R and A/P** | `/setup/forecast/arap` | A/R and A/P forecasting method (e.g. delayed days for collection / payment), the A/R and A/P accounts and delay, and A/P accrual accounts. |

**Whether Auto-Forecast is on is NOT set here: that's per plan** (plan → Actions → Enable/Disable
Auto-Forecast; see [plans.md → Auto-Forecast](plans.md#auto-forecast)). These settings only apply
in plans where it's on.

Read the Auto-Forecast settings: `(await jirav.getAutoForecast()).company` →
`{mode: AUTOMATIC|CUSTOM, method, departments: {mode, selected}, accountSettings}`.

**Custom** (seen, not saved): **Default Settings for All Accounts** (Departments: All or
some; Method: Linear Trend with Seasonality, Linear Trend, Simple Average (Flatline)), then
**Individual Account Settings** (expand ⌄): tabs Revenue · COGS · OpEx · Other Income · Other
Expense, one row per top-level account with an **Enable** switch, Departments and Method. Switching
Forecast Type and leaving with CANCEL asks "Discard Changes" → DISCARD, which restores the saved mode.
`getAutoForecast().company.accountSettings` is keyed by account id and lists the accounts that are
**on**: an account switched off is missing from it.

**Switching an account off keeps its drivers working** (verified on a plan copy): with Custom saved
and the account's Enable off, that account got no Auto-Forecast row and its driver counted
(`misconfigured: false`), while the other accounts were still auto-forecast. This is the way to
auto-forecast most of a plan but drive a few accounts yourself. It's company-wide: it applies in
every plan with Auto-Forecast on.

Read `accountSettings` for per-account overrides. Method names are all the settings say: Jirav
doesn't show the per-account math.

Which plans have it on: `listPlans()` → `autoForecast`.

**A/R and A/P** (`/setup/forecast/arap`; read with `await jirav.getArApSettings()` →
`{ar: {method, delay, account, trailingMonths?}, ap: {method, delay, account, accrualAccounts, trailingMonths?}}`, method `none`,
`trended` or `delayed`): A/R method **None / Trended percent of Revenue / Delayed
days for collection**, the A/R account and A/R Delay (e.g. NET 30); A/P method **None / Trended
percent of OpEx / Delayed days for Payment**, the A/P account, A/P Delay and A/P Accrual Accounts
(chips).

**None** = no A/R forecast: the receivable stays frozen at its last actual balance. Forecast revenue
still turns into cash in the month it's earned; it's the opening balance that's never collected
(verified on a plan copy: switching Delayed NET 0 → None left A/R flat at that balance and lowered
cash by the same amount). A/P None likewise: bills are paid at once and the opening A/P is never paid. Switching None → Delayed asks for the account again (it's
cleared). Settings → Forecast saves with SAVE in the bottom bar.

**Trended** (app source): the forecast A/R follows revenue at its recent ratio. Each forecast month
collects the whole previous A/R balance (Decrease) and adds that month's revenue × the average of
A/R ÷ revenue over the **Trailing Months** (3 by default; the average rolls forward from the last
actual months) (Increase), so A/R ends each month at revenue × that ratio. A/P Trended works the
same on OpEx and has no accrual accounts. Choosing Trended asks for the account again. After saving,
the test plans showed no change within 5 minutes: re-read the System A/R / System A/P rows before
relying on a new setting.
