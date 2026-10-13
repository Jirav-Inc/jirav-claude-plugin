# Goals

**Scope: company-wide.** Settings → Goals (`/<tenant>/setup/goals/input`, tab Configuration at
`/setup/goals/configuration`). Monthly targets (e.g. Revenue, COGS, Gross Margin $, OpEx, Operating
Income $, Cash on Hand, Headcount) that reports and dashboard tiles can show as the **Goals** source
([reports.md](reports.md)). Not tied to any plan.

## Read

```js
await jirav.listGoals()   // [{section, id, name, type, series, values: {'2026-01': 1000, …}}]  empty values = no targets set
```

## Change

| Where | How |
|---|---|
| Input | Pick Range / Start / End to show months. Double-click a cell, type, Enter. **To clear a cell**: double-click, End, Backspace until empty, Enter (Delete doesn't clear). Then **SAVE** in the bottom bar (CANCEL discards) |
| Configuration | Sections and goals: Name, **Series** (the [variable picker](variable-picker.md): which actual line the goal compares to), Description. Row ⋮: Add Goal / Delete; section ⋮: Add Section / Delete; drag ⠿ to reorder; ADD GOAL / ADD SECTION buttons. Saving here not tested |

Verified: a value saved, read back through `listGoals`, then cleared and saved back to empty.
