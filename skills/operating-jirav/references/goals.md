# Goals

**Scope: company-wide.** Settings → Goals (`/<tenant>/setup/goals/input`, tab Configuration at
`/setup/goals/configuration`). Monthly targets (e.g. Revenue, COGS, Gross Margin $, OpEx, Operating
Income $, Cash on Hand, Headcount) that reports and dashboard tiles can show as the **Goals** source
([reports.md](reports.md)). Not tied to any plan.

## Read

```js
await jirav.listGoals()   // [{section, id, name, description, type, series, filters, values: {'2026-01': 1000, …}}]
// series: the line it compares to (revenue, opex, …); filters narrow it, e.g. to one account under OpEx (Rent).
// Empty values = no targets set.
```

Read goals with `listGoals`; on the Input page `readGridValues` also reads the grid (months shown by
Range / Start / End only).

## Change

**Input** (a goal's monthly targets): `jirav.gridEntry`, the same calls as on a plan's grid
([plans.md](plans.md)), with the goal's name as `account` and no department. It shows a month that isn't on screen
by moving Start Date / End Date itself, types and reads back, and saves only on `save()`:

```js
const E = jirav.gridEntry;
await E.ready();
await E.set({account: 'Revenue', values: {'2027-03': 125000}})   // '' clears a month; staged, not saved
await E.save()                                                     // after the user's yes: {ok, saved, failed}
```

Check with `jirav.listGoals()` (a cleared month is gone from `values`). After a save this grid keeps its edit marks
until the page reloads: `save()` checks against Jirav's stored goals, and `staged()` leaves out what it saved. Headcount goals keep decimals as typed (12.5).

**Configuration** (sections and goals): Name, **Series** (which actual line the goal compares to) and Description.
- **Each goal needs its own series** (line and filters together): a second goal on exactly what another goal uses
  can't be saved ("Goal input series must be unique"; the save bar's `reason` says so). One account under a line
  (OpEx ⋄ Rent) is its own series. Ask the user which line to use, or change the other goal first.
- **Add a goal:** a row's ⋮ → **Add Goal** (`{kind: 'option', label: 'Add Goal'}` once the menu is open) adds a row
  named "New Goal" (`row: New Goal`). Its fields are `field "Name"` and `field "Description"`; its series is
  `button "Series"` until chosen, then a button named by its series ("OpEx ⋄ Rent"): click it, then
  `jirav.pickers.pick(<path>)` in the "Select Goal Series" dialog (`pickers.cancel()` closes it unpicked). Once Name is
  filled, the row is `row: <new name>`.
- **Delete:** the row's ⋮ → **Delete** (no question), then SAVE. Section ⋮: Add Section / Delete; drag ⠿ to reorder.
- **After a save, reload the page before changing what you just saved.** Jirav shows SAVE only when the form differs
  from the copy it loaded, and a save doesn't refresh that copy: deleting a goal added in the same visit leaves no
  SAVE (the row goes, Jirav keeps the goal). Reload (`location.reload()`, then wait for the rows), then delete.
- Edits wait for **SAVE** in the bottom bar (`jirav.saveBar()`; `press()` in a call of its own); Cancel discards.

Verified: a value saved, read back through `listGoals`, then cleared and saved back to empty.
