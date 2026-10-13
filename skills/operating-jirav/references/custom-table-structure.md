# Custom table structure

**Scope: company-wide.** Where: Settings → Custom Tables (`/<tenant>/setup/custom-tables/<name>`),
or **⋮ → Edit Custom Table** next to a table's title in a plan. Changes apply to the table in
**every plan**. Values are per plan: [custom-table-values.md](custom-table-values.md).

Confirm with the user before you save. The URL's `<name>` is lowercased and triple URL-encoded
(`my%252520table`), so clicking the table in the sidebar is easier.

**Deleting a table orphans its global drivers.** They stay, marked "Invalid Entry", and
`misconfigured: true` in `jirav.listGlobalDrivers()`. The delete dialog doesn't warn about this,
so check that list first and ask about those drivers too ([global-drivers.md](global-drivers.md)).

**Helpers.** Paste `scripts/blocks/custom-table-structure.min.js` after the core to get `const ct = jirav.customTableStructure`.
It only reads and locates; you do the clicks.

| Helper | Returns |
|---|---|
| `await ct.tables()` | sidebar tables `{name, id, active, menu:{x,y}}` |
| `await ct.openTableMenu(name)` | opens that table's ⋮ (shadow DOM) and returns its items with coordinates |
| `ct.rows()` / `ct.row(name)` | rows in screen order `{name, type, depth, section, moving, menu:{x,y}}` |
| `jirav.menu()` | items of whatever menu or dropdown is open, with coordinates |
| `ct.moving()` | the row in Move mode |
| `ct.pending()` | `{pending, save:{x,y}, cancel:{x,y}}`, the SAVE CHANGES bar |
| `await ct.structure()` | the saved structure of the open table (API) |
| `await ct.move(name, target, {where})` | drag a row in Move mode (the one gesture) |

Typical step: `ct.row('Line A').menu` gives a point → click it → `jirav.menu()` gives "Make Sub"'s
point → click it → check `ct.rows()`. If `jirav.menu()` comes back empty, the first click only
focused the button: click once more.

**Read the structure** before and after every change (`ct.structure()` does this):
`GET <base>/v1/customTable/<customTableId>` returns `customTableConfig.elements`, an ordered tree.

- **Section:** `{section:{id,label,subtotal,children}}`. Sections can contain sections.
- **Line:** `{manualLine:{id,label,format,aggregation,color,allowImport}}`
- **Reference:** `{lineReference:{id,address:{category,department,isAcct},includeChildrenUpToLevel}}`
- **Blank row:** `{separator:{id}}`

List order is sidebar order. Line IDs stay the same through moves and indent changes, so the
line's values stay attached.

## Tables (left sidebar)

Everything here saves **immediately**; there's no Save button.

| Action | How |
|---|---|
| Create | The (+) next to "Tables" (or next to "Custom" in a plan's sidebar) → Name → ADD. The new table is added at the bottom. |
| Rename | ⋮ → Rename → edit the name → RENAME. The ID stays the same; the URL changes. |
| Reorder | ⋮ → Move Up / Move Down (only the ones that apply are shown). Each step saves. |
| Delete | ⋮ → Delete. The dialog names the table: check the name, then DELETE. |

The **⋮** lives in shadow DOM and a real click often fails to open it, so use
`await ct.openTableMenu(name)`: it opens the menu and returns `[{label, x, y}]`; click the item
yourself. Each Move Up / Move Down step takes about a second. For several steps, batch them: after
each step the menu reopens one row (about 13 px) higher or lower. Check `ct.tables()` at the end.

## Rows

Each row has a **⋯** at its far left: click `ct.row(name).menu`. Don't `.click()` it from a
script, because scripted opens stack menus that won't close until a reload. A menu closes when
you pick an item.

| Row | ⋯ menu |
|---|---|
| Line, top level | Add Line · Add Blank Row · Clone · Move · Delete, plus **Make Sub** if a section is directly above |
| Line inside a section | Add Line · Add Blank Row · Clone · Move · **Make Parent** · Delete |
| Section | Copy to Table · Add Line · Add Blank Row · Add Subtotal · Clone · Move · Delete, plus Make Sub / Make Parent as for lines |
| Blank row | Add Line · Add Blank Row · Move · Delete |

- **Add Line / Add Blank Row** (from the menu) insert directly below the row. The buttons under
  each section, and at the bottom of the table, add at the end of that level.
- **Make Sub** moves the row to the end of the section above it. That can be a section inside a
  section. **Make Parent** moves it out, to just after its section.
- **Clone** inserts "Cloned <name>" below. Cloning a section clones its lines too.
- **Copy to Table** (section only) → pick another table → Select. The section and its lines are
  copied there **immediately** as a new section with new IDs, so values don't carry over.
- **Add Subtotal** adds a Subtotal row after the section (the section's `subtotal: true`).
- **Delete** on a saved row asks "Delete Custom Line… permanently remove it… Plans referencing
  this custom line will be affected". That deletes the line's values **in every plan**. Deleting
  a section also deletes all its lines, even though the dialog doesn't say so. Get an explicit
  yes that names what goes. After "Yes, Proceed", the delete still waits for SAVE CHANGES.

**Row fields.**

| Field | Options |
|---|---|
| Row Type | Section, New Line, Reference |
| Name | Up to 60 characters. To set it by script, use the input's native value setter, then fire an `input` event. |
| Format | Percent (%), Number (#), Money ($) |
| Period Value | Sum, Average, Beginning Balance, Ending Balance, Formula Based |
| Color | Revenue, Assets, CMRR / Billings, COGS, OpEx, Other Expenses / Liabilities, Gross Margin, Headcount / Operating Income, Net Income, Bookings / Equity, Custom 1–3 |
| Allow Import | YES / NO: whether the row accepts Google Sheets or Excel imports |

Period Value decides how months roll up into quarters and years. Formula Based aggregates a
driver's inputs first and then applies its formula; use it for ratios. A **Reference** row
pulls live values instead. Its picker has:

- **Category:** Income Statement, Balance Sheet, Staffing, Custom Tables or KPI Library
- **Department** and **Account**
- **Include sub-accounts / lines:** 0–4 levels

## Reordering rows: Move + `ct.move`

Click ⋯ → **Move** on the row (it turns orange), then:

```js
await ct.move('Line C', 'Line A', { where: 'before' })   // or 'after'
// → {ok: true, attempts, order: ['Line C', 'Section 1', '  Line A', ...]} or {ok: false, why}
```

- **It only reorders within one level** (siblings in the same section, or top-level rows; a
  section moves with its lines). To move a row into or out of a section, use Make Sub / Make
  Parent, then `ct.move` within the section. A row can't be dropped into an empty section.
- One drop ends Move mode. The first drag after Move is often ignored, and `ct.move` retries.
- The browser's own drag tool doesn't work here: it jumps straight to the end point.
- The new order is pending until SAVE CHANGES (`ct.pending().save`).

## Saving

Row changes are batched behind **SAVE CHANGES / Cancel** at the bottom. Nothing is stored until
you click SAVE CHANGES, and Cancel discards the whole batch. Table actions (create, rename,
reorder, delete) and Copy to Table skip this and save at once.

Verify with the GET above, and open the table in a plan (`/plan/x/<planId>/custom/<customTableId>`).
There, section rows show their totals and Reference rows show live values.
