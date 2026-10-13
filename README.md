# Jirav for Claude

Lets Claude work in the Jirav app (app.jirav.com) in Claude's built-in browser, using your own
signed-in session.

## What it does

- **Finds things directly.** Companies, dashboards, report packages and pages, plans, custom tables
  and drivers are looked up by name. Claude doesn't click through menus.
- **Reads numbers accurately.** Values come from the page's own data, including collapsed rows and
  months scrolled out of view, with actual vs forecast, departments and data sources labelled.
- **Edits safely.** Claude types plan and custom-table values and adds or edits drivers. It always
  says exactly what will change, asks first, refuses locked plans, and re-checks the result.

## Install

**Claude Cowork / Claude desktop:** Customize → Plugins → Add marketplace → enter
`Jirav-Inc/jirav-claude-plugin`, then install **jirav**.

**Claude Code:**

```
/plugin marketplace add Jirav-Inc/jirav-claude-plugin
/plugin install jirav@jirav
```

Updates arrive when Jirav publishes a new version (each release is listed under Releases, with a
`.plugin` file you can also install directly).

## Getting started

1. Open Claude's built-in browser and sign in to Jirav yourself. Claude never enters passwords.
2. Ask in plain language, for example:
   - "What's forecast OpEx for Q3 in our Rolling Forecast, and what are the biggest lines?"
   - "Summarize the Income Statement in our latest published month-end pack."
   - "In a copy of our budget, set Software Subscriptions for R&D to 800 a month for Q3."
   - "Close last month."

## Included skills

- **operating-jirav**: how to drive the Jirav app (navigation, lookups, reading values, editing).
- **month-end-close**: walks through Jirav's documented month-end close, step by step. It asks
  before every change and leaves the steps it can't do safely (Plan of Record, sharing) to you.
- **board-pack**: builds a board deck from your Jirav numbers: results for the period, full-year
  outlook, next year's plan, headcount, cash and the decisions needed. Read-only; every number is
  traced back to Jirav.
- **budget-import**: loads an annual budget from Excel into a plan through Jirav's Budget Import, by
  department. It keeps payroll from being counted twice when your staff roster already drives salaries,
  leaves Balance Sheet balances intact, asks before uploading and checks the result.

## Data and privacy

- **Where data goes:** only to Jirav (app.jirav.com and its API), in your own signed-in browser session.
  The plugin has no connectors, servers or other outside services of its own.
- **What it reads:** whatever your Jirav login can see, which can include personal data such as staff
  names and salaries, and Jirav users' names and emails.
- **What it writes:** only the changes you approve (plan values, drivers, custom tables, imports). They
  are saved in your Jirav account and kept under your agreement with Jirav.
- **What it stores:** nothing outside Jirav. The only thing kept in your browser is the plugin's own
  script, so it doesn't reload on every page.
- **Privacy:** [Jirav Privacy Policy](https://www.jirav.com/privacy-policy).

## Support and license

Questions or problems: contact Jirav support.

Copyright © 2026 Jirav Inc. For use with Jirav, under the Jirav End User Agreement you accepted in
the app. See [LICENSE](LICENSE).
