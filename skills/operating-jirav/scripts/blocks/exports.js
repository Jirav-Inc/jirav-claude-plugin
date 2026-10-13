// blocks/exports.js: jirav.exports, which catches Jirav's file exports (Export as Excel / PDF) inside the
// page so no browser "save file" prompt appears, then reads them. Paste after scripts/jirav.js.
// Workflow: references/exports.md.
//
// Jirav builds each export in the page and "clicks" a download link. While capture is on, that click is
// swallowed and the file is kept in memory instead, so nothing blocks the browser and nothing lands in the
// user's Downloads. It never changes anything in Jirav.
//   ex.capture()                 -> 'capturing'   turn on BEFORE clicking Export; stays on (re-armed by the restore
//                                   line after a reload) until release(). Files caught before a reload are lost.
//   ex.wait(ms?)                 -> {i, name, size, ...}   call right after the Export click: waits for the file
//   ex.list()                    -> [{i, name, size, type, at}]   files caught so far, newest last
//   ex.readXlsx(i?, {formulas})  -> {name, sheets: [{name, rows: [[...cells]], formulaCells}]}   parse an Excel export in place
//   ex.readBase64(i?, {offset, length})  -> {name, size, offset, length, done, base64}   raw bytes, in chunks,
//                                   to move the file into Claude's workspace (references/exports.md)
//   ex.release()                 -> 'released'    normal downloads again
// i defaults to the newest file.
if (typeof jirav === 'undefined') throw new Error('Paste scripts/jirav.min.js (the core) first.');
jirav.block('exports', 'dev', (jirav) => {
  const st = window.__jiravExports = window.__jiravExports || { files: [], blobs: new Map(), on: false, orig: null };
  const capture = () => {
    if (st.on) return 'capturing';
    st.orig = { create: URL.createObjectURL, click: HTMLAnchorElement.prototype.click, dispatch: HTMLAnchorElement.prototype.dispatchEvent };
    URL.createObjectURL = function (b) { const u = st.orig.create.call(URL, b); if (b instanceof Blob) st.blobs.set(u, b); return u; };
    const keep = a => {                           // a download link to a captured blob: keep it, no save prompt
      const b = a.href && st.blobs.get(a.href);
      if (!a.hasAttribute('download') || !b) return false;
      st.files.push({ name: a.getAttribute('download') || 'export', size: b.size, type: b.type, at: new Date().toISOString(), blob: b });
      return true;
    };
    HTMLAnchorElement.prototype.click = function () { if (!keep(this)) return st.orig.click.apply(this, arguments); };
    HTMLAnchorElement.prototype.dispatchEvent = function (ev) { return (ev && ev.type === 'click' && keep(this)) ? true : st.orig.dispatch.apply(this, arguments); };
    st.on = true;
    try { sessionStorage.setItem('jiravExportsCapture', '1'); } catch (e) {}   // re-armed when the kit is restored after a reload
    return 'capturing';
  };
  const release = () => {
    if (st.on && st.orig) { URL.createObjectURL = st.orig.create; HTMLAnchorElement.prototype.click = st.orig.click; HTMLAnchorElement.prototype.dispatchEvent = st.orig.dispatch; }
    st.on = false; try { sessionStorage.removeItem('jiravExportsCapture'); } catch (e) {}
    return 'released';
  };
  const wait = async (timeoutMs = 20000) => {     // after clicking Export: the newest file caught in the last 10 s, or the next one
    const since = new Date(Date.now() - 10000).toISOString(), t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const k = st.files.findIndex(f => f.at >= since); if (k >= 0) return list()[st.files.length - 1];
      await new Promise(r => setTimeout(r, 300));
    }
    return { timedOut: true, note: st.on ? 'No file caught: check the Export finished (a package PDF takes up to ~15 s).' : 'Capture is off: call capture() before exporting.' };
  };
  const list = () => st.files.map((f, i) => ({ i, name: f.name, size: f.size, type: f.type, at: f.at }));
  const pick = i => {
    if (!st.files.length) throw new Error(st.on ? 'Nothing caught yet: click Export, wait for it to finish, then list().' : 'Capture is off: call capture() before exporting.');
    const f = st.files[i == null ? st.files.length - 1 : i];
    if (!f) throw new Error(`No file ${i}; list() shows 0..${st.files.length - 1}.`);
    return f;
  };
  const readBase64 = async (i, { offset = 0, length = 150000 } = {}) => {
    const f = pick(i), bytes = new Uint8Array(await f.blob.slice(offset, offset + length).arrayBuffer());
    let s = ''; for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
    return { name: f.name, size: f.size, offset, length: bytes.length, done: offset + bytes.length >= f.size, base64: btoa(s) };
  };
  // Minimal zip + SpreadsheetML reader (an .xlsx is a zip of XML files).
  const unzip = async blob => {
    const buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer);
    let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Not a zip/xlsx file.');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
    for (let k = 0; k < n; k++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true),
        xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl));
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      const data = buf.subarray(start, start + csize);
      out[name] = async () => {
        if (method === 0) return new TextDecoder().decode(data);
        const ds = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new TextDecoder().decode(await new Response(ds).arrayBuffer());
      };
      p += 46 + nl + xl + cl;
    }
    return out;
  };
  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const colIndex = ref => { let c = 0; for (const ch of ref.replace(/\d+$/, '')) c = c * 26 + ch.charCodeAt(0) - 64; return c - 1; };
  // Jirav's Excel exports write subtotals as live formulas (e.g. SUBTOTAL(9,B10:B12)) with no stored
  // result, so a plain reader sees blanks there. readXlsx evaluates SUM / SUBTOTAL(9, …) ranges; any other
  // formula comes back as its text ("=…"). {formulas: 'text'} returns every formula as text instead.
  const readXlsx = async (i, { formulas = 'values' } = {}) => {
    const f = pick(i), z = await unzip(f.blob);
    const shared = z['xl/sharedStrings.xml'] ? [...xml(await z['xl/sharedStrings.xml']()).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
    const wb = xml(await z['xl/workbook.xml']());
    const rels = z['xl/_rels/workbook.xml.rels'] ? Object.fromEntries([...xml(await z['xl/_rels/workbook.xml.rels']()).getElementsByTagName('Relationship')].map(r => [r.getAttribute('Id'), r.getAttribute('Target')])) : {};
    const sheets = [];
    for (const s of wb.getElementsByTagName('sheet')) {
      const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      let target = rels[rid] || `worksheets/sheet${sheets.length + 1}.xml`; target = target.replace(/^\/?xl\//, '').replace(/^\//, '');
      const doc = z['xl/' + target] ? xml(await z['xl/' + target]()) : null;
      const cells = new Map(), byRow = new Map(); let maxR = 0;
      if (doc) for (const c of doc.getElementsByTagName('c')) {
        const ref = c.getAttribute('r'), t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], is = c.getElementsByTagName('is')[0], fm = c.getElementsByTagName('f')[0];
        let val = v ? v.textContent : (is ? is.textContent : null);
        if (t === 's') val = shared[+val]; else if (t === 'b') val = val === '1'; else if (t !== 'str' && t !== 'inlineStr' && val != null && val !== '' && !isNaN(+val)) val = +val;
        cells.set(ref, { val, f: fm ? fm.textContent : null }); const rn = +ref.replace(/^[A-Z]+/, ''); maxR = Math.max(maxR, rn); if (!byRow.has(rn)) byRow.set(rn, []); byRow.get(rn).push(ref);
      }
      const memo = new Map(), letters = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; };
      const value = (ref, depth = 0) => {
        const c = cells.get(ref); if (!c) return null;
        if (!c.f || formulas === 'text') return c.f ? '=' + c.f : c.val;
        if (c.val != null && c.val !== '') return c.val;
        if (memo.has(ref)) return memo.get(ref);
        const m = c.f.match(/^(?:SUBTOTAL\(9,|SUM\()([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
        let out = '=' + c.f;
        if (m && depth < 50) {
          let sum = 0; const c0 = colIndex(m[1] + '1'), c1 = colIndex(m[3] + '1');
          for (let r = +m[2]; r <= +m[4]; r++) for (let cc = c0; cc <= c1; cc++) {
            const inner = cells.get(letters(cc) + r);
            if (m[0].startsWith('SUBTOTAL') && inner && inner.f && /^SUBTOTAL/.test(inner.f)) continue;   // SUBTOTAL skips nested subtotals
            const x = value(letters(cc) + r, depth + 1); if (typeof x === 'number') sum += x;
          }
          out = Math.round(sum * 1e6) / 1e6;
        }
        memo.set(ref, out); return out;
      };
      const rows = [];
      for (let r = 1; r <= maxR; r++) {
        const row = [];
        for (const ref of byRow.get(r) || []) row[colIndex(ref)] = value(ref);
        rows.push(Array.from(row, x => x === undefined ? null : x));
      }
      sheets.push({ name: s.getAttribute('name'), rows, formulaCells: [...cells.values()].filter(c => c.f).length });
    }
    return { name: f.name, sheets };
  };
  try { if (sessionStorage.getItem('jiravExportsCapture')) capture(); } catch (e) {}
  return { capture, wait, list, readXlsx, readBase64, release };
}, 'catch Excel/PDF exports in the page (no save prompt), read them or hand over the bytes');
