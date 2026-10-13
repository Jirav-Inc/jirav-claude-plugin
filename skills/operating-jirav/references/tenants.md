# Companies (tenants)

**Scope: read-only.** Picking a company; changes nothing.

Every Jirav URL and API call is scoped to one company ("tenant").

## List the companies the user can access

```js
await jirav.listTenants()   // scripts/jirav.js
```

Under the hood: `GET https://api0.jirav.com/-/v1/accessible-tenants` (session cookie,
`credentials: 'include'`). Each entry:

| Field | Use |
|---|---|
| `fullName` | What the user calls it ("Acme Corp - Demo") — match on this |
| `shortName` | URL slug: `https://app.jirav.com/<shortName>/...` |
| `apiServerURI` | This company's API server |
| `tenantId` | Internal ID (rarely needed) |

- Match the user's words against `fullName`, case-insensitive, partial is fine. If more than one
  matches, ask which.
- API base for all per-company calls = `` `${apiServerURI}/${tenantId}` `` — **`tenantId`, not
  `shortName`**. They're the same for some companies and different for others, so using
  `shortName` works on one company and 404s on the next. `jirav.getTenant(name)` returns
  `{fullName, shortName, tenantId, base}`.
- URLs use `shortName`; API calls use `tenantId`. Lookups work for any accessible company
  from any tab (`jirav.listPlans('golden')`).
- `shortName` can be mixed-case (`Wizard-of-Oz`) — use it exactly as returned.

## Open a company

Navigate to `https://app.jirav.com/<shortName>/dashboard` (or straight to any page's URL). This skips
the company picker. From a fresh tab, open `https://app.jirav.com` first: the kit loads on any Jirav
page, including the picker, and lookups take a company name, so you can find the `shortName` there.
A fresh tab passes through `signin.jirav.com` for a few seconds (the restore line says WAIT) and
returns by itself; only a sign-in form needs the user. A first load sometimes shows a sign-in error page ("OAuth Error: No OAuth context"): navigate again.
Wait for the title to end in `| <fullName> | Jirav`. Switching company is always a full page
load, so run the restore line (SKILL.md) afterwards. Lookups (`jirav.listPlans('company name')`, etc.)
work for any company without switching.

## Fallback: the company picker

Only if the API route fails. The picker at `app.jirav.com/-/public/#!#companies` is a
**searchable text box**, not a `<select>`:

- `form_input` doesn't work; list items are off-canvas until the box is focused.
- Typing without clearing first inserts text into the current value.

Steps: click the box → select all → delete → type part of the name → click the filtered row
by its screen position → confirm the box shows the full name → click **Continue**.
Continue writes to the clipboard — tell the user.
