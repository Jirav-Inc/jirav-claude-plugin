// blocks/imports.js: jirav.imports, Excel imports without the OS file chooser. Paste after scripts/jirav.js.
// Workflow and per-import rules: references/imports.md. Every upload CHANGES DATA: confirm with the user first.
//
// Kinds: 'staff' (Workforce → Excel; every plan; replaces the whole staff list),
//        'customActuals' (Custom Tables → Excel; every plan; only the months in the file),
//        'budget' / 'customBudget' (Budget cards; one plan; typed values for the cells that have values).
//   im.template(kind, {planId})   -> {i, name, size}   fetch Jirav's template into the page (budgets: per plan,
//                                    prefilled with that plan's typed values; staff: the current staff list)
//   im.fromBase64(b64, name)      -> {i, name, size}   a file built elsewhere (call repeatedly with {append:true}
//                                    to send it in chunks)
//   im.rows(i, sheet)             -> [{r, cells: {A: v, ...}}]   read a sheet (date cells as 'YYYY-MM-DD')
//   im.findRow(i, sheet, {A: 'Rent', D: 'G&A'}) -> row number (exact match on each given column)
//   im.monthColumn(i, sheet, 'YYYY-MM', headerRow?) -> column letter of that month in the header row
//   im.edit(i, sheet, {E55: 111, F55: null, B7: 'text'}) -> {i, name, size}   a NEW file with those cells changed
//                                    (null = blank). Everything else in the zip stays byte-identical.
//   im.blankNumbers(i, sheet, fromRow) -> {i, ...}   new file with every number from that row down blanked
//   im.upload(kind, i)            -> staff/customActuals: uploads now, waits, returns Jirav's result alert.
//                                    budgets: arms the file and opens Import Budget Data; then ONE real click
//                                    inside the dialog (it waits for a user event), then:
//   im.finish(planName)           -> budgets: picks the plan, presses UPLOAD TEMPLATE, returns the result
//   im.result()                   -> the last alerts (jirav.alerts())
//   im.list(), im.readBase64(i, {offset, length})   files held here / move one into Claude's workspace
if (typeof jirav === 'undefined') throw new Error('Paste scripts/jirav.min.js (the core) first.');
if (!jirav.alerts) throw new Error('This block needs a newer core: paste scripts/jirav.min.js again.');
jirav.block('imports', 'dev', (jirav) => {
  const st = window.__jiravImports = window.__jiravImports || { files: [], pending: null, partial: null };
  const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const KINDS = {
    staff: { card: 'employees', template: () => '/v1/export/workforce/xls' },
    customActuals: { card: 'customLines', template: () => '/v1/import/customLines/file/template/xlsx' },
    budget: { card: 'budgets', plan: true, template: p => `/v1/import/budget/file/template/xlsx/plan/${p}` },
    customBudget: { card: 'customLinesBudget', plan: true, template: p => `/v1/import/customLines/budget/file/template/plan/${p}` },
  };
  const kindOf = k => { const x = KINDS[k]; if (!x) throw new Error(`Unknown kind "${k}": ${Object.keys(KINDS).join(', ')}.`); return x; };
  const keep = (blob, name) => { st.files.push({ name, blob, at: new Date().toISOString() }); const i = st.files.length - 1; return { i, name, size: blob.size }; };
  const pick = i => { const f = st.files[i == null ? st.files.length - 1 : i]; if (!f) throw new Error(`No file ${i}; list() shows what is held.`); return f; };
  const list = () => st.files.map((f, i) => ({ i, name: f.name, size: f.blob.size, at: f.at }));

  const template = async (kind, { planId } = {}) => {
    const k = kindOf(kind);
    if (k.plan && !planId) throw new Error(`template('${kind}') needs {planId} (jirav.listPlans()).`);
    const t = await jirav.getTenant();
    const noStaff = 'The staff template fails when the company has no staff yet: build the file from the column list in references/imports.md and use fromBase64.';
    let r;
    try { r = await fetch(t.base + k.template(planId), { credentials: 'include' }); }
    catch (e) { throw new Error(kind === 'staff' ? noStaff : `Template request failed: ${e.message}`); }
    if (!r.ok) throw new Error(kind === 'staff' ? `${noStaff} (status ${r.status})` : `Template request failed: ${r.status}`);
    return keep(new Blob([await r.arrayBuffer()], { type: XLSX }), `${kind}${planId ? '-' + planId : ''}-template.xlsx`);
  };
  const fromBase64 = (b64, name = 'import.xlsx', { append = false } = {}) => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    if (append && st.partial) { st.partial.parts.push(bytes); } else { st.partial = { name, parts: [bytes] }; }
    const blob = new Blob(st.partial.parts, { type: XLSX });
    if (append) { st.files[st.files.length - 1] = { name: st.partial.name, blob, at: new Date().toISOString() }; return { i: st.files.length - 1, name: st.partial.name, size: blob.size }; }
    return keep(blob, name);
  };
  const readBase64 = async (i, { offset = 0, length = 150000 } = {}) => {
    const f = pick(i), b = new Uint8Array(await f.blob.slice(offset, offset + length).arrayBuffer());
    let s = ''; for (let k = 0; k < b.length; k += 0x8000) s += String.fromCharCode.apply(null, b.subarray(k, k + 0x8000));
    return { name: f.name, size: f.blob.size, offset, length: b.length, done: offset + b.length >= f.blob.size, base64: btoa(s) };
  };

  // --- zip read/write (an .xlsx is a zip of XML parts) ---
  const unzip = async blob => {
    const buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer);
    let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Not a zip/xlsx file.');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = [];
    for (let k = 0; k < n; k++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true),
        xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl));
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      out.push({ name, method, raw: buf.slice(start, start + csize) });
      p += 46 + nl + xl + cl;
    }
    return out;
  };
  const inflate = async ent => ent.method === 0 ? ent.raw : new Uint8Array(await new Response(new Blob([ent.raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  const deflate = async bytes => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let k = 0; k < b.length; k++) c = CRC[(c ^ b[k]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const zip = async ents => {      // ents: [{name, data (uncompressed bytes)}]
    const enc = new TextEncoder(), chunks = [], central = []; let off = 0;
    for (const e of ents) {
      const nm = enc.encode(e.name), comp = await deflate(e.data), crc = crc32(e.data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 8, true);
      h.setUint32(14, crc, true); h.setUint32(18, comp.length, true); h.setUint32(22, e.data.length, true); h.setUint16(26, nm.length, true);
      chunks.push(new Uint8Array(h.buffer), nm, comp);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(10, 8, true);
      c.setUint32(16, crc, true); c.setUint32(20, comp.length, true); c.setUint32(24, e.data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nm);
      off += 30 + nm.length + comp.length;
    }
    const csize = central.reduce((s, b) => s + b.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, ents.length, true); end.setUint16(10, ents.length, true); end.setUint32(12, csize, true); end.setUint32(16, off, true);
    return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: XLSX });
  };

  // --- sheets ---
  const dec = b => new TextDecoder().decode(b), xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const open = async i => {
    const f = pick(i), ents = await unzip(f.blob), text = {};
    const get = async name => { if (!(name in text)) { const e = ents.find(x => x.name === name); text[name] = e ? dec(await inflate(e)) : null; } return text[name]; };
    const wb = xml(await get('xl/workbook.xml')), relsX = await get('xl/_rels/workbook.xml.rels');
    const rels = relsX ? Object.fromEntries([...xml(relsX).getElementsByTagName('Relationship')].map(r => [r.getAttribute('Id'), r.getAttribute('Target')])) : {};
    const sheets = [...wb.getElementsByTagName('sheet')].map((s, k) => {
      const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      return { name: s.getAttribute('name'), path: 'xl/' + (rels[rid] || `worksheets/sheet${k + 1}.xml`).replace(/^\/?xl\//, '').replace(/^\//, '') };
    });
    const sheetPath = sheet => { const s = typeof sheet === 'number' ? sheets[sheet] : (sheet == null ? sheets[0] : sheets.find(x => x.name === sheet)); if (!s) throw new Error(`No sheet "${sheet}"; sheets: ${sheets.map(x => x.name).join(', ')}.`); return s.path; };
    return { f, ents, get, sheets, sheetPath, text };
  };
  const colNum = L => { let c = 0; for (const ch of L) c = c * 26 + ch.charCodeAt(0) - 64; return c; };
  const ymd = serial => new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 864e5)).toISOString().slice(0, 10);
  const dateStyles = async o => {        // style indexes whose number format is a date
    const sx = await o.get('xl/styles.xml'); if (!sx) return new Set();
    const d = xml(sx), custom = {};
    for (const n of d.getElementsByTagName('numFmt')) custom[n.getAttribute('numFmtId')] = n.getAttribute('formatCode') || '';
    const xfs = d.getElementsByTagName('cellXfs')[0], out = new Set();
    if (xfs) [...xfs.getElementsByTagName('xf')].forEach((x, k) => {
      const id = +x.getAttribute('numFmtId'), code = custom[id] || '';
      if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (/[dmy]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]/g, '')) && !/[#0]/.test(code))) out.add(String(k));
    });
    return out;
  };
  const rows = async (i, sheet) => {
    const o = await open(i), ssX = await o.get('xl/sharedStrings.xml'), ds = await dateStyles(o);
    const ss = ssX ? [...xml(ssX).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
    const out = [];
    for (const r of xml(await o.get(o.sheetPath(sheet))).getElementsByTagName('row')) {
      const cells = {};
      for (const c of r.getElementsByTagName('c')) {
        const ref = c.getAttribute('r'), t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], is = c.getElementsByTagName('is')[0];
        let val = v ? v.textContent : (is ? is.textContent : null);
        if (t === 's') val = ss[+val]; else if (val != null && val !== '' && t !== 'str' && t !== 'inlineStr' && !isNaN(+val)) val = +val;
        if (typeof val === 'number' && ds.has(c.getAttribute('s'))) val = ymd(val);  // a date cell → 'YYYY-MM-DD'
        cells[ref.replace(/\d+$/, '')] = val === '' ? null : val;
      }
      out.push({ r: +r.getAttribute('r'), cells });
    }
    return out;
  };
  const findRow = async (i, sheet, match) => {
    const hit = (await rows(i, sheet)).filter(r => Object.entries(match).every(([c, v]) => r.cells[c] === v));
    if (hit.length !== 1) throw new Error(`${hit.length} rows match ${JSON.stringify(match)}.`);
    return hit[0].r;
  };
  const monthColumn = async (i, sheet, month, headerRow) => {
    const rs = await rows(i, sheet), want = String(month).slice(0, 7);
    for (const r of rs) { if (headerRow && r.r !== headerRow) continue; for (const [c, v] of Object.entries(r.cells)) if (typeof v === 'string' && v.slice(0, 7) === want) return c; }
    throw new Error(`No column for ${want} (budget templates hold forecast months only).`);
  };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cellXml = (ref, style, v) => {
    const s = style ? ` s="${style}"` : '';
    if (v == null || v === '') return `<c r="${ref}"${s}/>`;
    if (typeof v === 'number') return `<c r="${ref}"${s} t="n"><v>${v}</v></c>`;
    return `<c r="${ref}"${s} t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  };
  const setCells = (x, edits) => {
    for (const [ref, v] of Object.entries(edits)) {
      const R = ref.toUpperCase(), rowN = R.replace(/^[A-Z]+/, ''), col = R.replace(/\d+$/, '');
      const re = new RegExp(`<c r="${R}"((?:\\s[^>]*?)?)(?:/>|>[\\s\\S]*?</c>)`);
      const m = x.match(re);
      if (m) { const sm = m[1].match(/\ss="(\d+)"/); x = x.replace(re, cellXml(R, sm && sm[1], v)); continue; }
      const rowRe = new RegExp(`(<row r="${rowN}"[^>]*?)(/>|>([\\s\\S]*?)</row>)`), rm = x.match(rowRe);
      if (!rm) throw new Error(`Row ${rowN} doesn't exist in the template; only existing rows can be filled.`);
      const inner = rm[3] || '', cells = [...inner.matchAll(/<c r="([A-Z]+)\d+"[\s\S]*?(?:\/>|<\/c>)/g)];
      const after = cells.find(c => colNum(c[1]) > colNum(col)), piece = cellXml(R, null, v);
      const newInner = after ? inner.slice(0, after.index) + piece + inner.slice(after.index) : inner + piece;
      x = x.replace(rowRe, `${rm[1]}>${newInner}</row>`);
    }
    return x;
  };
  const rebuild = async (o, changed, suffix) => {
    const ents = [];
    for (const e of o.ents) ents.push({ name: e.name, data: e.name in changed ? new TextEncoder().encode(changed[e.name]) : await inflate(e) });
    return keep(await zip(ents), o.f.name.replace(/(\.xlsx)?$/, `-${suffix}.xlsx`));
  };
  const edit = async (i, sheet, edits) => {
    const o = await open(i), p = o.sheetPath(sheet);
    return rebuild(o, { [p]: setCells(await o.get(p), edits) }, 'edited');
  };
  const blankNumbers = async (i, sheet, fromRow) => {
    const o = await open(i), p = o.sheetPath(sheet);
    const x = (await o.get(p)).replace(/<c r="([A-Z]+)(\d+)"((?:\s[^>]*?)?)>\s*<v>[^<]*<\/v>\s*<\/c>/g, (m, c, r, attrs) => {
      if (+r < fromRow || /\st="(s|str|inlineStr|b)"/.test(attrs)) return m;
      const sm = attrs.match(/\ss="(\d+)"/); return cellXml(c + r, sm && sm[1], null);
    });
    return rebuild(o, { [p]: x }, 'blanked');
  };

  // --- upload ---
  const waitAlert = async (since, secs = 30) => {
    for (let n = 0; n < secs * 2; n++) { await new Promise(r => setTimeout(r, 500)); const a = jirav.alerts({ since }); if (a.length) return a.map(x => `${x.kind}: ${x.text}`); }
    return [];
  };
  const result = () => jirav.alerts().slice(-5).map(x => `${x.kind}: ${x.text}`);
  const card = k => {
    const b = [...document.querySelectorAll('button')].find(x => { const s = angular.element(x).scope(); return s && s.provider && s.provider.config && s.provider.config.dataTarget === k.card && /import/i.test(x.textContent); });
    if (!b) throw new Error('Open Settings → Integrations first (jirav.go("/<tenant>/setup/integrations")).');
    return b;
  };
  const armClick = () => {
    if (st.patched) return; st.patched = true;
    const orig = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.type !== 'file' || !st.pending) return orig.call(this);
      const dt = new DataTransfer(); dt.items.add(st.pending); this.files = dt.files; st.pending = null;
      setTimeout(() => this.dispatchEvent(new Event('change', { bubbles: true })), 50);
    };
  };
  const upload = async (kind, i) => {
    const k = kindOf(kind), f = pick(i), file = new File([f.blob], f.name, { type: XLSX }), btn = card(k), since = new Date().toISOString();
    if (!k.plan) {
      const sc = angular.element(btn).scope(); sc.$apply(() => sc.provider.uploadFile(file));
      const a = await waitAlert(since); return a.length ? { uploaded: f.name, result: a } : { uploaded: f.name, result: [], note: 'No alert after 30 s: check the page.' };
    }
    armClick(); st.pending = file; jirav.dismissAlerts(); btn.scrollIntoView({ block: 'center' }); btn.click();
    await new Promise(r => setTimeout(r, 1500));
    const dlg = jirav.deepAll(document, 'mat-dialog-container')[0];
    return { armed: f.name, clickInside: dlg ? jirav.at(dlg) : null,
      next: 'Real-click inside the dialog once (it shows a spinner until a real click), then im.finish(planName).' };
  };
  // Budgets, after the real click: pick the plan, press UPLOAD TEMPLATE, wait for Jirav's result.
  const finish = async planName => {
    const dlg = jirav.deepAll(document, 'mat-dialog-container')[0];
    if (!dlg) throw new Error('No dialog open: run upload() first.');
    const opts = jirav.deepAll(dlg, 'mat-list-option, [role=option]');
    if (!opts.length) return { ok: false, why: 'The dialog has not rendered: real-click inside it first.' };
    const opt = opts.find(o => o.textContent.trim() === planName) || opts.find(o => o.textContent.includes(planName));
    if (!opt) return { ok: false, why: `No plan "${planName}". Plans: ${opts.map(o => o.textContent.trim()).join(', ')}` };
    if (opt.getAttribute('aria-selected') !== 'true') opt.click();
    await new Promise(r => setTimeout(r, 600));
    const up = jirav.deepAll(dlg, 'button').find(b => /upload template/i.test(b.textContent));
    if (!up || up.disabled) return { ok: false, why: 'UPLOAD TEMPLATE is disabled: check the plan is selected.' };
    const since = new Date().toISOString(); up.click();
    const a = await waitAlert(since); return { ok: a.some(x => x.startsWith('success')), result: a };
  };
  return { template, fromBase64, rows, findRow, monthColumn, edit, blankNumbers, upload, finish, result, list, readBase64 };
}, 'Excel imports without the file chooser: templates, in-page cell edits, upload (CHANGES DATA)');
