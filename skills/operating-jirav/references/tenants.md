# Companies (tenants)

**Scope: read-only.** Picking a company; changes nothing.

Every Jirav URL and API call is scoped to one company ("tenant").

## List the companies the user can access

```js
await jirav.listTenants()
```

Each entry:

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
the company picker. From a fresh tab, open `https://app.jirav.com` first. If it lands on Jirav's Choose Company
page (no kit there), read the company's shortName from that page's list, where each company shows as
"Name (shortName)", and open `/<shortName>`; any company the user can open will do to start, since the lookups
take a company name and work for every company from there.
A fresh tab passes through `signin.jirav.com` for a few seconds (the kit check says SIGN IN) and
returns by itself; only a sign-in form needs the user. A first load sometimes shows a sign-in error page ("OAuth Error: No OAuth context"): navigate again.
Wait for the title to end in `| <fullName> | Jirav`. Switching company is always a full page
load; the kit is there again on the new company's pages. Lookups (`jirav.listPlans('company name')`, etc.)
work for any company without switching.

## Never the company picker

Don't use the picker's controls (`app.jirav.com/-/public/#!#companies`): in a narrow pane its Continue didn't
navigate and the box switched to another company. Read names from it if you must, and always go by URL. If
`getTenant` (on a company page) can't find the company, show the names it did find and ask; if the lookup itself
fails, ask the user to open the company in Jirav themselves, then read the page title (`| <fullName> | Jirav`).
