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

Not yet explored: the Custom option's per-account controls, and editing the A/R and A/P settings.
