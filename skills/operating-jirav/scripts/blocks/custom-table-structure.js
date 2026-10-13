// blocks/custom-table-structure.js: jirav.customTableStructure, helpers for Settings → Custom Tables (the editor at
// /<tenant>/setup/custom-tables/<name>). Paste after scripts/jirav.js. Workflow and menus:
// references/custom-table-structure.md.
//
// Read-only: these find rows and return click coordinates; Claude does the clicking and Save.
//   ct.tables()                -> [{name, id, active, menu:{x,y}}]   sidebar tables, ⋮ position
//   ct.openTableMenu(name)     -> [{label, x, y}]   opens a table's ⋮ (shadow DOM) and lists its items
//   ct.rows()                  -> [{name, type, depth, section, moving, menu:{x,y}}]   rows in screen order
//   ct.row(name)               -> one row (throws if missing or ambiguous)
//   ct.moving()                -> name of the row in Move mode, or null
//   ct.pending()               -> {pending, save:{x,y}, cancel:{x,y}}   the SAVE CHANGES bar
//   ct.structure()             -> the saved structure of the open table (API), as a nested list
//   ct.move(name, target, {where:'before'|'after'})   drag a row that is in Move mode (the one gesture)
if (typeof jirav === 'undefined') throw new Error('Paste scripts/jirav.min.js (the core) first.');
jirav.block('customTableStructure', 'dev', (jirav) => {
  const onPage = () => { if (!/\/setup\/custom-tables/.test(location.pathname)) throw new Error('Open Settings → Custom Tables first.'); };
  const clean = s => (s || '').replace(/drag_indicator|more_vert/g, '').replace(/\s+/g, ' ').trim();
  const sidebarItems = () => jirav.deepAll(document, 'jirav-ng-left-sidebar-item');

  const tables = async () => {
    onPage();
    const ids = Object.fromEntries((await jirav.listCustomTables()).map(t => [t.name, t.id]));
    return sidebarItems().map(it => {
      const name = clean(it.textContent), btn = it.querySelector('.dropdown-button-container');
      return { name, id: ids[name] || null, active: it.classList.contains('m-active'), menu: btn ? jirav.at(btn) : null };
    });
  };
  const openTableMenu = async name => {
    onPage();
    const it = sidebarItems().find(i => clean(i.textContent) === name);
    if (!it) throw new Error(`No table "${name}" in the sidebar.`);
    const c = it.querySelector('.dropdown-button-container');
    (c.querySelector('button') || c).click();          // opens the menu only; nothing is changed
    await new Promise(r => setTimeout(r, 500));
    return jirav.deepAll(document, 'button').filter(b => b.getBoundingClientRect().height > 0 && /^(Rename|Delete|Move Up|Move Down)$/.test(b.textContent.trim()))
      .map(b => ({ label: b.textContent.trim(), ...jirav.at(b) }));
  };

  const describe = item => {
    const own = sel => [...item.querySelectorAll(sel)].find(e => e.closest('.muuri-item') === item);
    const el = own('.movable-group-element');
    const txt = el.innerText || '';
    const typeTxt = (txt.match(/ROW TYPE\s*\n\s*([^\n]+)/i) || [])[1] || (/Blank Row/i.test(txt) ? 'Blank Row' : '');
    const type = { 'New Line': 'line', 'Section': 'section', 'Reference': 'reference', 'Subtotal': 'subtotal', 'Blank Row': 'blank' }[typeTxt.trim()] || typeTxt.trim().toLowerCase();
    const input = el.querySelector('input.movable-input');
    const name = input ? input.value : type === 'reference' ? ((txt.match(/REFERENCE\s*\n\s*([^\n]+)/i) || [])[1] || 'Reference').trim() : type === 'blank' ? 'Blank Row' : '';
    let depth = 0, section = null, p = item.parentElement && item.parentElement.closest('.muuri-item');
    while (p) {
      depth++;
      if (section === null) { const pi = p, h = [...pi.querySelectorAll('input.movable-input')].find(i => i.closest('.muuri-item') === pi); section = h ? h.value : null; }
      p = p.parentElement && p.parentElement.closest('.muuri-item');
    }
    const btn = el.querySelector('.jv-action-menu-container button');
    // The "…" glyph sits left of and below the button's centre; clicks at the centre often miss.
    const glyph = btn && (() => { const c = jirav.at(btn); return { x: c.x - 3, y: c.y + 2 }; })();
    return { name, type, depth, section, moving: !!own('.movable-group-element.draggable'), menu: glyph || null, _item: item };
  };
  const allRows = () => { onPage(); return [...document.querySelectorAll('.muuri-item')].filter(i => i.closest('.movable-group-element-container')).map(describe); };
  const strip = r => { const { _item, ...rest } = r; return rest; };
  const rows = () => allRows().map(strip);
  const find = name => {
    const hits = allRows().filter(r => r.name === name);
    if (!hits.length) throw new Error(`No row named "${name}". Rows: ${allRows().map(r => r.name).join(', ')}`);
    if (hits.length > 1) throw new Error(`${hits.length} rows are named "${name}"; rename one first or pick by position from ct.rows().`);
    return hits[0];
  };
  const row = name => strip(find(name));
  const moving = () => { const r = allRows().find(x => x.moving); return r ? r.name : null; };
  const pending = () => {
    const shown = b => { const r = b.getBoundingClientRect(); return r.height > 0 && r.top < innerHeight && getComputedStyle(b).visibility !== 'hidden'; };
    const btn = t => [...document.querySelectorAll('button, a')].find(b => b.textContent.trim().toUpperCase() === t && shown(b));
    const s = btn('SAVE CHANGES'), c = btn('CANCEL');
    return { pending: !!s && !s.disabled, save: s ? jirav.at(s) : null, cancel: c ? jirav.at(c) : null };
  };
  const structure = async () => {
    onPage();
    const active = sidebarItems().find(i => i.classList.contains('m-active'));
    const name = active && clean(active.textContent);
    const t = (await jirav.listCustomTables()).find(x => x.name === name);
    if (!t) throw new Error('Could not tell which table is open.');
    const { base } = await jirav.getTenant();
    const r = await fetch(`${base}/v1/customTable/${t.id}`, { credentials: 'include' }).then(r => r.json());
    const walk = e => { const k = Object.keys(e)[0], v = e[k];
      const label = v.label || (k === 'separator' ? '(blank row)' : k === 'lineReference' ? `(reference ${v.address && v.address.category})` : '');
      const s = { type: k, id: v.id, label }; if (v.format) s.format = v.format; if (v.aggregation) s.periodValue = v.aggregation;
      if (k === 'section') { s.subtotal = v.subtotal; s.children = v.children.map(walk); } return s; };
    return { id: t.id, name, elements: (r.customTableConfig || r).elements.map(walk) };
  };
  const move = async (name, target, opts) => {
    const r = find(name), t = find(target);
    if (!r.moving) return { ok: false, why: `"${name}" is not in Move mode: click its ⋯ (ct.row(name).menu) and choose Move first.` };
    const res = await jirav.drag(r._item, t._item, opts);
    return Object.assign(res, { order: rows().map(x => (x.depth ? '  '.repeat(x.depth) : '') + x.name) });
  };
  return { tables, openTableMenu, rows, row, moving, pending, structure, move };
}, 'Settings → Custom Tables editor: rows, menus, Save bar, structure, drag a row in Move mode');
