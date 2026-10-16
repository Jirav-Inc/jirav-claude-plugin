# Finding things this skill doesn't document

**Scope: read-only.** Watch requests to learn an endpoint; never call write endpoints.

The app loads everything it shows from its own API. To find how a page gets its list or IDs,
open the page and ask the browser which requests it made:

```js
[...new Set(performance.getEntriesByType('resource')
  .filter(e => ['xmlhttprequest', 'fetch'].includes(e.initiatorType))
  .map(e => e.name.replace(/\?.*/, ''))
  .filter(u => /\/v\d+\//.test(u) && !/\.(css|js|svg|png|woff2?)$/.test(u)))]   // API calls only, no static files
```

Then `fetch(url, {credentials: 'include'})` a candidate. Read `r.status` and `await r.text()` first:
an error can come back with an **empty body** (a 400 with 0 bytes), so parse only a non-empty
body. Look at the **shape** (keys, lengths) before printing contents — some responses are large or
embed images.

Rules:
- Use discovered endpoints **only for finding** (names, IDs, flags). Read values with
  `jirav.readGridValues`; change data through the UI.
- **GET only.** Never call POST/PUT/PATCH/DELETE endpoints yourself. Some Jirav reads are served as
  POST; the kit makes those, exactly as Jirav's own pages do, and they change nothing: model table
  contents (`listAssumptionValues`, `getDataStatus().actualsThrough`) and the audit log
  (`readAuditLog`). Don't add others by hand.
- To find a page's URL, click it once in the UI and read `location.pathname`; check whether the
  app accepts an ID in place of the name slug.
- Answer from the endpoint's data, not from banners or page text (a trial banner can be stale), and
  say where the answer came from.
- Endpoints are internal and may change between releases. If a documented one fails, fall back
  to the UI and tell the user.
