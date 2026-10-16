// blocks/imports.js: jirav.imports, Excel imports without the OS file chooser. Paste after scripts/jirav.js.
// Workflow and per-import rules: references/imports.md. Every upload CHANGES DATA: confirm with the user first.
//
// Kinds: 'staff' (Workforce → Excel; every plan; replaces the whole staff list),
//        'customActuals' (Custom Tables → Excel; every plan; only the months in the file),
//        'budget' / 'customBudget' (Budget cards; one plan; typed values for the cells that have values),
//        'accountingActuals' (Actuals → Accounting → Manual import; GL actuals for a JiravExcel company: every
//                     plan; the COA tab REPLACES the chart, the IS / BS tabs set the months in the file).
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
//   im.upload(kind, i, opts?)     -> staff/customActuals/accountingActuals: uploads now, waits, returns Jirav's result alert
//                                    (refuses if the card is disabled; accountingActuals: opts {firstImport, removes}).
//                                    budgets: arms the file and opens Import Budget Data; then ONE real click
//                                    inside the dialog (it waits for a user event), then:
//   im.finish(planName)           -> budgets: picks the plan, presses UPLOAD TEMPLATE, returns the result
//   im.templateLink(kind)        -> {x, y}   the card's Template link (accountingActuals: a blank file outside jirav.com
//                                    that the kit doesn't fetch; the user attaches the download)
//   im.accountingCheck(i)         -> accountingActuals: {source, months, accounts, removes, adds, emptyTabs}
//                                    removes = Jirav accounts the file's COA leaves out (deleted from EVERY month)
//   im.dropSheets(i, [names])     -> {i, ...}   new file without those tabs (an empty optional tab fails the import)
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
    // Jirav's GL actuals template is a static, BLANK file served by the card's Template link (a plain link to a file
    // host outside jirav.com), so the kit doesn't fetch it: Claude clicks the link, the browser saves it to the user's
    // Downloads, and the user drags it into the conversation (then fromBase64). Monthly imports start from their last file.
    accountingActuals: { card: 'accounting-manual', manualTemplate: true },
  };
  // GL actuals by Excel only where the company's accounting source is JiravExcel, or where there is none yet (the
  // first import then MAKES JiravExcel the source, and only Jirav support can change it back). With a connector
  // selected the card is disabled: actuals come from that system.
  const accountingSource = async () => {
    const a = ((await jirav.getDataStatus()) || {}).accounting || {};
    if (a.source && a.source !== 'JiravExcel') throw new Error(`This company's actuals come from ${a.source}: they can't be imported from Excel (the Manual import card is disabled). Change them in ${a.source} and import there.`);
    return a.source || null;
  };
  const kindOf = k => { const x = KINDS[k]; if (!x) throw new Error(`Unknown kind "${k}": ${Object.keys(KINDS).join(', ')}.`); return x; };
  const keep = (blob, name) => { st.files.push({ name, blob, at: new Date().toISOString() }); const i = st.files.length - 1; return { i, name, size: blob.size }; };
  const pick = i => { const f = st.files[i == null ? st.files.length - 1 : i]; if (!f) throw new Error(`No file ${i}; list() shows what is held.`); return f; };
  const list = () => st.files.map((f, i) => ({ i, name: f.name, size: f.blob.size, at: f.at }));

  // Staff can be uploaded from Excel unless an HR system is connected (e.g. "rippling-api"): then the staff
  // come from that system. With none connected Jirav reports no source (null) and offers the Excel card,
  // whether or not a list was ever imported.
  const staffSource = async () => {
    const src = ((await jirav.getDataStatus()) || {}).workforce || {};
    if (src.source && src.source !== 'Excel file') throw new Error(`This company's staff come from ${src.source}, so they can't be uploaded from Excel: change them in that system.`);
    return src;
  };
  const template = async (kind, { planId } = {}) => {
    const k = kindOf(kind);
    if (kind === 'staff') await staffSource();
    if (k.manualTemplate) throw new Error(`The ${kind} template isn't fetched by the kit: click the card's Template link (im.templateLink('${kind}')), ask the user to drag the downloaded file into the conversation or give access to their Downloads folder, then fromBase64. For a monthly import, ask for their last import file instead.`);
    if (k.plan && !planId) throw new Error(`template('${kind}') needs {planId} (jirav.listPlans()).`);
    const t = await jirav.getTenant();
    const noStaff = 'The staff template can\'t be fetched by script when the company has no staff list yet (it redirects to a download): build the first file from the column list in references/imports.md and use fromBase64.';
    let r;
    try { r = await jirav.fetch(t.base + k.template(planId), { credentials: 'include' }); }
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
        if (typeof val === 'string' && /^-?\d+\.\d+$/.test(val)) val = +val;            // stored values come as text ("15.00000")
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
    // Not there: say where the header is and how to add the month (budget templates only hold the plan's
    // forecast months; the custom-actuals header only spans months that hold data, up to today).
    const isMonth = v => typeof v === 'string' && /^\d{4}-\d{2}/.test(v);
    const hdr = rs.filter(r => !headerRow || r.r === headerRow).find(r => Object.values(r.cells).some(isMonth));
    if (!hdr) throw new Error(`No month header found${headerRow ? ' in row ' + headerRow : ''}.`);
    const months = Object.entries(hdr.cells).filter(([, v]) => isMonth(v)), colN = c => [...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    const last = months.sort((a, b) => colN(a[0]) - colN(b[0]))[months.length - 1];
    const toCol = n => { let c = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) c = String.fromCharCode(65 + (n - 1) % 26) + c; return c; };
    const next = toCol(colN(last[0]) + 1);
    throw new Error(`No ${want} column: the header (row ${hdr.r}) runs ${months[0][1].slice(0, 7)} … ${last[1].slice(0, 7)}. ` +
      `For custom actuals, add it with edit {${next}${hdr.r}: '${want}-01'} and use column ${next}; for a budget, the month must be in the plan's forecast.`);
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
  // A blank point in the dialog body: just above its button row (the dialog's centre can be text).
  const blankIn = dlg => {
    const d = dlg.getBoundingClientRect(), b = [...dlg.querySelectorAll('button')].filter(x => x.getBoundingClientRect().height)
      .map(x => x.getBoundingClientRect()).sort((p, q) => q.top - p.top)[0];
    const y = b ? b.top - 20 : d.bottom - 80, x = d.left + d.width * 0.5, k = jirav.frame.width / innerWidth;
    return { x: Math.round(x * k), y: Math.round(y * k) };
  };
  const upload = async (kind, i, opts = {}) => {
    if (kind === 'staff') await staffSource();
    const k = kindOf(kind), f = pick(i), file = new File([f.blob], f.name, { type: XLSX }), btn = card(k), since = new Date().toISOString();
    // Never act through a control the page has disabled: the scope call below would bypass it.
    if (btn.disabled) throw new Error(`The ${k.card} card's Import button is disabled for this user or company: don't import; say why it's off.`);
    if (kind === 'accountingActuals') {
      const c = await accountingCheck(i == null ? st.files.length - 1 : i);
      if (c.emptyTabs.length) throw new Error(`Tabs ${c.emptyTabs.join(', ')} have no rows, which fails the import: fill them or dropSheets(i, ${JSON.stringify(c.emptyTabs)}).`);
      if (!c.source && !opts.firstImport) throw new Error('No accounting source yet: this import makes Excel the actuals source for good (only Jirav support can change it). Tell the user, get a yes, then upload(kind, i, {firstImport: true}).');
      const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
      if (c.removes.length && !same(c.removes, opts.removes || [])) throw new Error(`The file's COA leaves out ${c.removes.join(', ')}: they'd be deleted from every month. If the user means that, name them and pass {removes: ${JSON.stringify(c.removes)}}; otherwise add them to the COA tab.`);
    }
    if (!k.plan) {
      const sc = angular.element(btn).scope(); sc.$apply(() => sc.provider.uploadFile(file));
      const a = await waitAlert(since); return a.length ? { uploaded: f.name, result: a } : { uploaded: f.name, result: [], note: 'No alert after 30 s: check the page.' };
    }
    armClick(); st.pending = file; jirav.dismissAlerts(); btn.scrollIntoView({ block: 'center' }); btn.click();
    await new Promise(r => setTimeout(r, 1500));
    const dlg = jirav.deepAll(document, 'mat-dialog-container')[0];
    return { armed: f.name, clickInside: dlg ? blankIn(dlg) : null,
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
  // Point of the card's Template link, for a real click (the browser saves the file to Downloads).
  const templateLink = async kind => {
    const k = kindOf(kind);
    if (kind === 'accountingActuals') await accountingSource();
    const btn = card(k), box = btn.closest('import-provider, file-import-provider, .provider, .card') || btn.parentElement.parentElement.parentElement;
    const a = [...box.querySelectorAll('a')].find(x => /template/i.test(x.textContent));
    if (!a) throw new Error('No Template link on this card.');
    a.scrollIntoView({ block: 'center' });
    return { ...jirav.at(a), next: 'Real-click it; the browser saves the template to Downloads. Ask the user to drag it in or give access to their Downloads folder.' };
  };
  // GL actuals file vs what Jirav holds. Accounts compare by name (unique in a Jirav chart; the API doesn't expose
  // the file's Account IDs in auto mapping). Retained Earnings / Unmapped are Jirav's own and never "removed".
  const accountingCheck = async i => {
    const o = await open(i), names = o.sheets.map(x => x.name), find = re => names.find(n => re.test(n.trim()));
    const tab = { coa: find(/^COA$|^chart of accounts$/i), is: find(/^income statement$/i), bs: find(/^balance sheet$/i),
      setup: find(/^company setup$/i), deps: find(/^departments$|^categories$/i) };
    for (const [k, n] of Object.entries({ COA: tab.coa, 'Income Statement': tab.is, 'Balance Sheet': tab.bs })) if (!n) throw new Error(`The file has no ${k} tab: every import needs COA, Income Statement and Balance Sheet.`);
    // Data starts on row 5 in columns A-E; the template's help notes sit further right.
    const filled = v => v != null && v !== '';
    const dataRows = async n => (await rows(i, n)).filter(r => r.r >= 5 && ['A', 'B', 'C', 'D', 'E'].some(c => filled(r.cells[c])));
    const coa = (await dataRows(tab.coa)).filter(r => filled(r.cells.A)).map(r => ({ id: String(r.cells.A), name: r.cells.C }));
    const months = new Set();
    for (const [n, col] of [[tab.is, 'C'], [tab.bs, 'B']]) (await dataRows(n)).forEach(r => { const v = r.cells[col]; if (v) months.add(String(v).slice(0, 7)); });
    const emptyTabs = [];
    for (const n of [tab.setup, tab.deps].filter(Boolean)) if (!(await dataRows(n)).length) emptyTabs.push(n);
    const jirav0 = (await jirav.getChartOfAccounts()).flatMap(sec => sec.accounts.map(a => a.name)).filter(n => !/^(Unmapped|Retained Earnings)$/i.test(n));
    const fileNames = coa.map(a => a.name);
    return { source: await accountingSource(), months: [...months].sort(), accounts: coa.length,
      removes: jirav0.filter(n => !fileNames.includes(n)), adds: fileNames.filter(n => !jirav0.includes(n) && !/^Retained Earnings$/i.test(n)), emptyTabs };
  };
  // A copy of file i without the named tabs (workbook, its rels and content types updated).
  const dropSheets = async (i, drop) => {
    const o = await open(i), gone = o.sheets.filter(x => drop.includes(x.name));
    if (gone.length !== drop.length) throw new Error(`No tab named ${drop.filter(n => !gone.some(g => g.name === n)).join(', ')}; tabs: ${o.sheets.map(x => x.name).join(', ')}.`);
    const paths = gone.map(g => g.path), rel = p => p.replace(/^xl\//, '');
    let wb = await o.get('xl/workbook.xml'), wr = await o.get('xl/_rels/workbook.xml.rels'), ct = await o.get('[Content_Types].xml');
    for (const g of gone) wb = wb.replace(new RegExp(`<sheet [^>]*name="${g.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`), '');
    wb = wb.replace(/<definedNames>[\s\S]*?<\/definedNames>/, '');
    for (const p of paths) { wr = wr.replace(new RegExp(`<Relationship [^>]*Target="(/xl/)?${rel(p)}"[^>]*/>`), ''); ct = ct.replace(new RegExp(`<Override PartName="/${p}"[^>]*/>`), ''); }
    const ents = [];
    for (const e of o.ents) {
      if (paths.includes(e.name) || paths.some(p => e.name === p.replace(/([^/]+)$/, '_rels/$1.rels'))) continue;
      const data = e.name === 'xl/workbook.xml' ? wb : e.name === 'xl/_rels/workbook.xml.rels' ? wr : e.name === '[Content_Types].xml' ? ct : null;
      ents.push({ name: e.name, data: data != null ? new TextEncoder().encode(data) : await inflate(e) });
    }
    return keep(await zip(ents), o.f.name.replace(/(\.xlsx)?$/, '-trimmed.xlsx'));
  };
  return { template, fromBase64, rows, findRow, monthColumn, edit, blankNumbers, accountingCheck, dropSheets, templateLink, upload, finish, result, list, readBase64 };
}, 'Excel imports without the file chooser: templates, in-page cell edits, upload (CHANGES DATA)');
