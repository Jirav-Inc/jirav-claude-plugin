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

**Claude Cowork / Claude desktop** (also as a [45-second video and illustrated
guide](https://jirav-inc.github.io/jirav-claude-plugin/install-guide/)):

1. Click **Customize** in the sidebar, then the **Plugins** tab.

   <img src="https://jirav-inc.github.io/jirav-claude-plugin/install-guide/img/01-customize-plugins.png" width="560" alt="Customize, then Plugins">

2. Click **+ Add** → **Add marketplace** → **Add from a repository**.

   <img src="https://jirav-inc.github.io/jirav-claude-plugin/install-guide/img/02-add-marketplace.png" width="560" alt="Add, then Add marketplace">

3. Paste `Jirav-Inc/jirav-claude-plugin`, click **Use "Jirav-Inc/jirav-claude-plugin"**, leave
   **Sync automatically** on, and click **Sync**.

   <img src="https://jirav-inc.github.io/jirav-claude-plugin/install-guide/img/05-sync.png" width="560" alt="The repository entered, Sync automatically on, Sync">

4. **Jirav FP&A** appears under Plugins. Click **Add**, or **Try in chat** to install it and open a chat
   that asks Claude what it can do.

   <img src="https://jirav-inc.github.io/jirav-claude-plugin/install-guide/img/06-try-in-chat.png" width="560" alt="Jirav FP&A under Plugins, with Try in chat and Add">

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
- **cash-trace**: answers the cash questions a CEO asks: what happened to cash, where the forecast
  says it's going (low point, burn, runway) and what it would take to stay above a cash goal, with
  each lever sized. Read-only; every figure ties back to Jirav's cash.

## What this plugin runs and connects to

- **No hooks, MCP servers, commands or installs.** The plugin is skills (Markdown instructions) plus a
  JavaScript helper, the "kit", in `skills/operating-jirav/scripts/`: `jirav.js` and `blocks/*.js` with
  comments, and `*.min.js`, the same code without comments (not obfuscated), which is what Claude pastes.
- **Where it runs:** only inside your own signed-in Jirav browser tab (Claude in Chrome or Cowork's
  browser). Nothing runs on your computer outside that tab.
- **What it connects to:** only Jirav: `app.jirav.com` and your company's Jirav API host
  (`*.jirav.com`), with your existing session. Some reads use POST, as Jirav's own pages do. It has no
  other network destinations, sends nothing elsewhere, and stores no credentials. The kit enforces this
  itself: it refuses to load on any page other than `https://app.jirav.com`, and every request it makes
  goes through one function that refuses any host that isn't `https://…jirav.com`.
- **How it changes data:** through Jirav's own screens (Claude clicks, types and saves), and only after
  you approve each change. Imports go through Jirav's own import cards and checks.
- **Inside the tab:** to read Jirav's own Excel and PDF exports without a save dialog, the exports
  helper briefly intercepts the page's download calls (`URL.createObjectURL` and download-link clicks)
  for files Jirav creates, and restores them when released. To hand an import file to Jirav's upload
  code without the system file picker, the imports helper intercepts the file input's click once.
  Neither touches anything outside the Jirav tab.
- **Stored in the browser:** a copy of the kit in the tab's `localStorage`, so it doesn't have to be
  pasted again after a page reload. It is re-run from there only when its build matches the copy that
  ships with the plugin; otherwise it's discarded and Claude pastes the current one.

## Data and privacy

- **Where data goes:** only to Jirav, in your own signed-in browser session.
- **What it reads:** whatever your Jirav login can see, which can include personal data such as staff
  names and salaries, and Jirav users' names and emails.
- **What it writes:** only the changes you approve (plan values, drivers, custom tables, imports). They
  are saved in your Jirav account and kept under your agreement with Jirav.
- **What it stores:** nothing outside Jirav, apart from the kit copy in your browser described above.
- **Privacy:** [Jirav Privacy Policy](https://www.jirav.com/privacy-policy).

## Support and license

Questions or problems: [Jirav support portal](https://help.jirav.com/support-portal). How Jirav itself works:
[Jirav help center](https://help.jirav.com).

Copyright © 2026 Jirav Inc. For use with Jirav, under the Jirav End User Agreement you accepted in
the app. See [LICENSE](LICENSE).
