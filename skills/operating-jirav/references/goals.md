# Goals

**Scope: company-wide.** Settings → Goals (`/<tenant>/setup/goals/input`, tab Configuration at
`/setup/goals/configuration`). Monthly targets (e.g. Revenue, COGS, Gross Margin $, OpEx, Operating
Income $, Cash on Hand, Headcount) that reports and dashboard tiles can show as the **Goals** source
([reports.md](reports.md)). Not tied to any plan.

## Read

```js
await jirav.listGoals()   // [{section, id, name, type, series, values: {'2026-01': 1000, …}}]  empty values = no targets set
```

Read goals with `listGoals`; on the Input page `readGridValues` also reads the grid (months shown by
Range / Start / End only).

## Change

| Where | How |
|---|---|
| Input | Pick Range / Start / End to show the months first (`cellPoint` refuses a month that isn't shown). Locate a cell with `jirav.readGridValues.cellPoint('<goal>', 'YYYY-MM')`, click it + **Enter** (a double-click doesn't open the editor here), check the editor has focus, type, Enter. **To clear a cell**: click + Enter, End, Backspace until empty, Enter (it reads 0 until SAVE). **Delete doesn't clear**: it only marks the page changed; CANCEL if pressed. Then **SAVE** in the bottom bar (CANCEL discards). Headcount goals keep decimals as typed (12.5) |
| Configuration | Sections and goals: Name, **Series** (the [variable picker](variable-picker.md): which actual line the goal compares to), Description. Row ⋮: Add Goal / Delete; section ⋮: Add Section / Delete; drag ⠿ to reorder; ADD GOAL / ADD SECTION buttons. Edits are batched behind SAVE in the bottom bar (verified with a description change, then set back) |

Verified: a value saved, read back through `listGoals`, then cleared and saved back to empty.
