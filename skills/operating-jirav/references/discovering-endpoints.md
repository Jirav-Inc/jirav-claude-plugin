# Finding things this skill doesn't document

**Scope: read-only.** Watch requests to learn an endpoint; never call write endpoints.

The app loads everything it shows from its own API. To find how a page gets its list or IDs,
open the page and ask the browser which requests it made:

```js
[...new Set(performance.getEntriesByType('resource')
  .filter(e => ['xmlhttprequest', 'fetch'].includes(e.initiatorType))
  .map(e => e.name.replace(/\?.*/, '')))]
```

Then `fetch(url, {credentials: 'include'})` a candidate and look at the **shape** (keys, lengths)
before printing contents — some responses are large or embed images.

Rules:
- Use discovered endpoints **only for finding** (names, IDs, flags). Read values with
  `jirav.readGridValues`; change data through the UI.
- **GET only.** Never call POST/PUT/PATCH/DELETE endpoints.
- To find a page's URL, click it once in the UI and read `location.pathname`; check whether the
  app accepts an ID in place of the name slug.
- Endpoints are internal and may change between releases. If a documented one fails, fall back
  to the UI and tell the user.
