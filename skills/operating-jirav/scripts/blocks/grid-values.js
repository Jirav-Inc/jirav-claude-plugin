// blocks/grid-values.js: jirav.readGridValues(), which reads financial VALUES BY MONTH (or quarter/year) from the
// page's data grid as compact JSON. Paste after scripts/jirav.js. Options and output:
// references/reading-grid-values.md.
//
//   jirav.readGridValues(opts)  -> {context, columns, periods, kinds, grains, rowFields, rows, ...}
//   jirav.readGridValues.cellPoint(label, "YYYY-MM", {department, rowDepartment, parent, index}) -> {x, y, value}   point to real-click a cell
//     department: a by-department COLUMN (report pages); rowDepartment / parent: pick among same-named ROWS (e.g. "Manual Input")
//
// Use it on: plan pages (accounts, staffing), custom table values in a plan, report pages, and the
// plan's Assumptions panel (values in attrs; pass {grid: 1, skipEmpty: false}).
// Not for lists or setup pages (Global Drivers, custom table structure): use the core's list* lookups.
// It reads the grid's in-memory model, so it includes collapsed and off-screen rows. It returns exactly
// what the page has loaded: to read another plan, department or report, navigate there first.
if (typeof jirav === 'undefined') throw new Error('Paste scripts/jirav.min.js (the core) first.');
jirav.block('readGridValues', 'dev', (jirav) => {
  const deepAll = jirav.deepAll;
  const read = (opts = {}) => {
    const o = Object.assign({ skipHeaders: true, skipEmpty: true, format: 'table' }, opts);
    const unwrap = v => (v && typeof v === 'object' && 'value' in v) ? v.value : v;
    const num = v => (v === '' || v == null) ? null : (typeof v === 'number' ? v : (isNaN(+v) ? v : +v));
    const MON = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const t = document.title.split(' | ');
    const context = { page: t[0] || null, parent: t[1] || null, section: t[2] || null, tenant: t[3] || null };

    let comps = deepAll(document, '.ag-root-wrapper').map(el => el.__agComponent).filter(c => c && (c.gridApi || (c.gos && c.gos.api)));
    if (Number.isInteger(o.grid)) comps = comps.slice(o.grid, o.grid + 1);
    if (!comps.length) {
      const panel = deepAll(document, '*').find(e => /no assumptions used in this table/i.test(e.textContent || '') && e.childElementCount < 3 && e.getBoundingClientRect().width > 0);
      if (panel) throw new Error('The Assumptions panel is on "This Table", which is empty on this page: click its "All" tab, then read again.');
      throw new Error('No data grid on this page (dashboards/text pages have none). Wait with jirav.ready() or check the page.');
    }

    const grids = comps.map(c => {
      const api = c.gridApi || c.gos.api;
      const capi = c.columnApi || (c.gos && c.gos.columnApi) || api;
      // Some grids (staffing) start with a ⋯ row-menu column: the labels are in the next one.
      const cols = capi.getAllDisplayedColumns().filter(c => c.getColId() !== 'rowMenu');
      const header = col => capi.getDisplayNameForColumn(col, 'header');
      const groupDef = col => { const p = col.getParent && col.getParent(); return p && (p.getColGroupDef ? p.getColGroupDef() : p.getOriginalColumnGroup && p.getOriginalColumnGroup().getColGroupDef()); };
      const labelCol = cols[0];

      const describe = col => {
        const m = col.getColDef().metadata || {}, pr = m.properties || {}, tags = Array.isArray(m.tags) ? m.tags : [], id = col.getColId();
        if (tags.includes('NOTES')) return null;
        let start = pr.DATE_RANGE_START, end = pr.DATE_RANGE_END;
        const mid = id.match(/(\d{4})_MONTHLY_(\d+)/i);
        if (!start && mid) start = end = `${mid[1]}-${String(mid[2]).padStart(2, '0')}`;
        const gid = id.match(/^cells\.([a-z]{3})-(\d{4})$/i);   // Settings → Goals: "cells.oct-2026"
        if (!start && gid && MON[gid[1].toLowerCase()]) start = end = `${gid[2]}-${String(MON[gid[1].toLowerCase()]).padStart(2, '0')}`;
        if (!start) { const lb = String(header(col)).match(/^([A-Za-z]{3})-(\d{2})$/); if (lb && MON[lb[1].toLowerCase()] && (tags.includes('PERIODIC') || m.columnHeaderLevelType === 'PERIOD')) start = end = `20${lb[2]}-${String(MON[lb[1].toLowerCase()]).padStart(2, '0')}`; }
        if (!start) return null;                       // not a value column (label/attribute)
        const gd = groupDef(col), gm = (gd && gd.metadata) || {};
        const grain = /yearly/i.test(id) ? 'year' : /quarterly/i.test(id) ? 'quarter' : (start === end ? 'month' : 'range');
        const fi = m.forecastIndicator !== undefined ? m.forecastIndicator : gm.forecastIndicator;
        // Report Δ / % columns and "% of" columns carry periods too: type them so {kind} filters skip them.
        const kind = m.variance === 'DELTA' ? 'variance' : m.variance === 'PERCENT' ? 'variancePercent'
          : pr.PERCENT_OF_REFERENCE === 'true' ? 'percentOf'
          : tags.includes('forecast') ? 'forecast' : (tags.includes('actuals') || tags.includes('actual')) ? 'actual'
          : (grain === 'month' && typeof fi === 'boolean') ? (fi ? 'forecast' : 'actual') : null;
        return { col, label: header(col), period: start === end ? start : `${start}..${end}`, range: [start, end], grain, kind,
          department: pr.DEP_NAME || null, total: pr.TOTAL_COLUMN === 'true', source: gm.srcId || null, sourceName: gd ? gd.headerName || gm.shortName || null : null };
      };

      const described = cols.slice(1).map(col => ({ col, d: describe(col) }));
      const isNotes = col => { const t = (col.getColDef().metadata || {}).tags; return Array.isArray(t) && t.includes('NOTES'); };
      const attrCols = described.filter(x => !x.d && !isNotes(x.col)).map(x => x.col);
      const notesCol = cols.find(isNotes);
      let vcols = described.filter(x => x.d).map(x => x.d);
      if (o.grain) vcols = vcols.filter(v => v.grain === o.grain);
      if (o.from) vcols = vcols.filter(v => v.range[0] >= o.from);
      if (o.to) vcols = vcols.filter(v => v.range[1] <= o.to);
      if (o.kind) vcols = vcols.filter(v => v.kind === o.kind);

      // Row kinds. Plan grids: account (leaf account, editable per department), group (account
      // containing other accounts: don't sum with its children), driver (driver line under an
      // account), total (top-level computed row, e.g. Gross Profit), line (other sub-lines such as
      // System Salaries / Manual Input). Report grids: header or line.
      const tagsOf = n => { const d = n.data || {}; const t = (d.rowMeta && d.rowMeta.metadata && d.rowMeta.metadata.tags) || (d.metadata && d.metadata.tags); return Array.isArray(t) ? t : []; };
      // Some grids carry no *_DRIVER_ALLOWED tags (locked plans, and editable ones too, e.g. one
      // company where this login sees none). Then infer structurally: accounts are non-driver rows at
      // depth >= 1 whose Department matches the top-level rows' (the Department filter's value: "All",
      // or e.g. "Unassigned"); per-department rows are drivers or allocations; "System Salaries" /
      // "Manual Input" are sub-lines. Marked kindsInferred.
      const deptCol = cols.find(c2 => /^department$/i.test(String(header(c2))));
      let anyAllowed = false; api.forEachNode(n => { if (!anyAllowed && tagsOf(n).some(x => /_DRIVER_ALLOWED$/.test(x))) anyAllowed = true; });
      const isPlanGrid = (() => { let r = false; api.forEachNode(n => { if (!r && n.data && n.data.metadata && !n.data.rowMeta) r = true; }); return r; })();
      const inferred = isPlanGrid && !anyAllowed;
      const SUBLINES = /^(System Salaries|Manual Input)$/;
      const onCustomTable = /\/custom\//.test(location.pathname);
      let aggDept = 'All';
      if (deptCol) { let found = false; api.forEachNode(n => { if (!found && n.level === 0) { const v = unwrap(api.getValue(deptCol, n)); if (v != null && v !== '') { aggDept = String(v); found = true; } } }); }
      const isAccountNode = n => {
        const tags = tagsOf(n);
        if (!inferred) return tags.some(x => /_DRIVER_ALLOWED$/.test(x));
        if (tags.includes('DRIVER') || n.level < 1) return false;
        const lbl = String(unwrap(api.getValue(labelCol, n)));
        const dep = deptCol ? String(unwrap(api.getValue(deptCol, n))) : 'All';
        return dep === aggDept && !SUBLINES.test(lbl);
      };
      const rowKind = (n, tags) => {
        if (tags.includes('HEADER_ROW')) return 'header';
        const d = n.data || {};
        if (d.rowMeta) {                                    // report grid: rows link to parents by key
          const rm = d.rowMeta, lbl = String(unwrap(api.getValue(labelCol, n)) || '');
          if (/-subtotal$/i.test(rm.name || '') || /^(sub)?total\b/i.test(lbl)) return 'subtotal';
          // A section's values total the rows under it: loaded children, or a folded section row
          // (e.g. "OpEx by Department" in a published pack, shown as one total).
          if ((n.childrenAfterGroup || []).length || (rm.collapsed && /^section=[A-Z_]+$/.test(rm.name || ''))) return 'section';
          if (/PERCENT/i.test(((rm.settings || {}).type || {}).format || '')) return 'ratio';   // Gross Margin %: never sum
          return 'line';
        }
        if (tags.includes('DRIVER')) return 'driver';
        if (isAccountNode(n)) return (n.childrenAfterGroup || []).some(isAccountNode) ? 'group' : 'account';
        if (n.level === 0) return 'total';
        // Custom tables: a nested section holds the total of the rows under it, like a group account.
        if (onCustomTable && (n.childrenAfterGroup || []).some(ch => !tagsOf(ch).includes('DRIVER'))) return 'group';
        if (inferred) return 'line';
        return 'line';
      };

      const re = o.match == null ? null : (o.match instanceof RegExp ? o.match : new RegExp(String(o.match).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      const wantKinds = o.rowKind ? [].concat(o.rowKind) : null;
      let underNode = null, total = 0;
      const out = [];
      api.forEachNode(n => {
        total++;
        const label = unwrap(api.getValue(labelCol, n));
        if (o.under) {
          if (!underNode && label === o.under) { underNode = n; return; }
          let p = n.parent, inside = false;
          while (p) { if (p === underNode) { inside = true; break; } p = p.parent; }
          if (!inside) return;
        }
        if (o.maxDepth != null && n.level > o.maxDepth) return;
        if (re && !re.test(String(label))) return;
        const d = n.data || {}, lm = d.rowMeta || {}, nm = d.metadata || {};
        const st = lm.settings && lm.settings.type;
        const tags0 = (lm.metadata && lm.metadata.tags) || nm.tags, tags = Array.isArray(tags0) ? tags0 : [];
        const kind = rowKind(n, tags);
        if (o.skipHeaders && kind === 'header') return;
        if (wantKinds && !wantKinds.includes(kind)) return;
        const vals = vcols.map(v => num(unwrap(api.getValue(v.col, n))));
        if (o.skipEmpty && vals.every(v => v == null)) return;
        const type = st ? st.name + (st.format ? ':' + st.format : '') : (nm.dataType || null);
        const attrs = attrCols.length ? Object.fromEntries(attrCols.map(ac => [header(ac), unwrap(api.getValue(ac, n))])) : null;
        const row = { label, depth: n.level, kind, type, attrs, values: vals };
        if (o.notes && notesCol) { const nt = unwrap(api.getValue(notesCol, n)); if (nt) row.note = String(nt).replace(/<[^>]*>/g, '').trim(); }
        if (o.editable) row.editable = vcols.map(v => { const x = api.getValue(v.col, n); return !!(x && typeof x === 'object' && x.isReadOnly === false); });
        out.push(row);
      });

      const g = {
        context,
        columns: vcols.map(v => v.label),
        periods: vcols.map(v => v.period),
        kinds: vcols.map(v => v.kind),
        grains: vcols.map(v => v.grain),
        attrs: attrCols.map(header),
      };
      if (vcols.some(v => v.department)) g.departments = vcols.map(v => v.department || (v.total ? 'Total' : null));
      const srcs = [...new Set(vcols.map(v => v.sourceName).filter(Boolean))];
      if (srcs.length) g.sources = srcs;
      if (srcs.length > 1 || vcols.some(v => !v.sourceName && srcs.length)) g.columnSources = vcols.map(v => v.sourceName || null);
      if (o.format === 'rows') g.rows = out;
      else {
        g.rowFields = ['label', 'depth', 'kind', 'type', 'attrs', ...g.columns];
        g.rows = out.map(r => [r.label, r.depth, r.kind, r.type, r.attrs, ...r.values]);
        if (o.editable) g.editable = out.map(r => r.editable);
        if (o.notes) { const nts = out.map(r => r.note || null); if (nts.some(Boolean)) g.notes = nts; }
      }
      if (!vcols.length && !(o.from || o.to || o.kind || o.grain) && !g.attrs.includes('Value')) g.warning = 'This grid has no period columns, so it is not a values grid (e.g. a setup list). Use the core list* lookups instead.';
      if (inferred) g.kindsInferred = `no driver tags on this grid: account/group kinds inferred from structure (Department = ${aggDept})`;
      if (out.length < total) g.truncated = { kept: out.length, total };
      if (o.under && !underNode) g.note = `No row is labelled "${o.under}". Section and account labels are the company's own: read {maxDepth: 0} (or {maxDepth: 1}) to see them.`;
      else if (o.match && !out.length) g.note = `Nothing matched ${o.match}. Labels are the company's own: read {maxDepth: 1} to see them.`;
      return g;
    });
    return grids.length === 1 ? grids[0] : grids;
  };

  // read.cellPoint(label, 'YYYY-MM', {department, rowDepartment, parent, index, grid}) -> {x, y, value}: screenshot point of one cell,
  // scrolled into view (parents expanded), for a real click before typing or Delete.
  read.cellPoint = async (label, period, opts = {}) => {
    const MON = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const roots = deepAll(document, '.ag-root-wrapper').filter(el => el.__agComponent && (el.__agComponent.gridApi || (el.__agComponent.gos && el.__agComponent.gos.api)));
    const root = roots[opts.grid || 0], c = root && root.__agComponent;
    if (!c) throw new Error('No data grid on this page.');
    const api = c.gridApi || c.gos.api, capi = c.columnApi || (c.gos && c.gos.columnApi) || api;
    const cols = capi.getAllDisplayedColumns().filter(cl => cl.getColId() !== 'rowMenu'), labelCol = cols[0];
    const unwrap = v => (v && typeof v === 'object' && 'value' in v) ? v.value : v;
    const monthOf = col => {
      const pr = (col.getColDef().metadata || {}).properties || {}, id = col.getColId();
      if (pr.DATE_RANGE_START) return pr.DATE_RANGE_START === pr.DATE_RANGE_END ? pr.DATE_RANGE_START : null;
      const mid = id.match(/(\d{4})_MONTHLY_(\d+)/i); if (mid) return `${mid[1]}-${String(mid[2]).padStart(2, '0')}`;
      const lb = String(capi.getDisplayNameForColumn(col, 'header')).match(/^([A-Za-z]{3})-(\d{2})$/);
      return lb && MON[lb[1].toLowerCase()] ? `20${lb[2]}-${String(MON[lb[1].toLowerCase()]).padStart(2, '0')}` : null;
    };
    const col = cols.find(cl => monthOf(cl) === period && (!opts.department || ((cl.getColDef().metadata || {}).properties || {}).DEP_NAME === opts.department));
    if (!col) throw new Error(`No ${period} month column${opts.department ? ' for ' + opts.department : ''} on this page.`);
    let hits = []; api.forEachNode(n => { if (unwrap(api.getValue(labelCol, n)) === label) hits.push(n); });
    if (!hits.length) throw new Error(`No row labelled "${label}".`);
    // Same-named rows (each department's "Manual Input"): narrow by the row's Department cell or its parent row.
    const depCol = cols.find(cl => /^department$/i.test(String(capi.getDisplayNameForColumn(cl, 'header'))));
    if (opts.rowDepartment) {
      if (!depCol) throw new Error('This grid has no Department column: {rowDepartment} needs one.');
      hits = hits.filter(n => String(unwrap(api.getValue(depCol, n))) === opts.rowDepartment);
    }
    if (opts.parent) hits = hits.filter(n => { for (let q = n.parent; q && q.level >= 0; q = q.parent) if (unwrap(api.getValue(labelCol, q)) === opts.parent) return true; return false; });
    if (!hits.length) throw new Error(`No row labelled "${label}"${opts.rowDepartment ? ' for department ' + opts.rowDepartment : ''}${opts.parent ? ' under ' + opts.parent : ''}.`);
    if (hits.length > 1 && opts.index == null) throw new Error(`${hits.length} rows are labelled "${label}": pass {rowDepartment}, {parent} or {index} (0 = first, in grid order).`);
    const n = hits[opts.index || 0];
    for (let p = n.parent; p && p.level >= 0; p = p.parent) if (p.setExpanded && !p.expanded) p.setExpanded(true);
    await new Promise(r => setTimeout(r, 300));
    // Narrow panes (Cowork ~800 px): if the scrolling area can't show the month column, make room,
    // view-only (nothing saved; a reload restores it): collapse Jirav's left sidebar, then narrow the
    // pinned columns. Never ask the user to resize.
    const room = () => { const v = root.querySelector('.ag-center-cols-viewport'), w = root.getBoundingClientRect(); if (!v) return 0;
      const r = v.getBoundingClientRect(); return Math.max(0, Math.min(r.right, w.right, innerWidth) - Math.max(r.left, w.left, 0)); };
    const need = Math.min(col.getActualWidth(), 120) + 8;
    if (room() < need && jirav.collapseSidebar && await jirav.collapseSidebar()) await new Promise(r => setTimeout(r, 400));
    if (room() < need) {
      // Jirav saves column widths in this browser (localStorage "...COLUMN_SIZES..."): put them back after
      // narrowing, so the change lasts only for this view and the user's own layout is untouched.
      const sizeKeys = () => { try { return Object.keys(localStorage).filter(k => /COLUMN_SIZES/i.test(k)); } catch (e) { return []; } };
      const before = new Map(sizeKeys().map(k => [k, localStorage.getItem(k)]));
      const restore = () => { try { for (const k of sizeKeys()) before.has(k) ? localStorage.setItem(k, before.get(k)) : localStorage.removeItem(k); } catch (e) {} };
      setTimeout(restore, 2500);
      const setW = (cl, w) => capi.setColumnWidth ? capi.setColumnWidth(cl, w) : api.setColumnWidths([{ key: cl.getColId(), newWidth: w }]);
      let short = need - room();
      const pinned = cols.filter(cl => cl.getPinned && cl.getPinned());
      for (const pc of [...pinned.filter(cl => cl !== labelCol), ...pinned.filter(cl => cl === labelCol)]) {   // labels last: keep names readable
        const floor = Math.max(pc === labelCol ? 140 : 60, pc.getColDef().minWidth || 0), cut = Math.min(short, pc.getActualWidth() - floor);   // the grid ignores widths below minWidth
        if (cut > 0) { setW(pc, pc.getActualWidth() - cut); short -= cut; }
        if (short <= 0) break;
      }
      await new Promise(r => setTimeout(r, 400)); restore();
    }
    api.ensureNodeVisible(n, 'middle'); (api.ensureColumnVisible || capi.ensureColumnVisible).call(api.ensureColumnVisible ? api : capi, col);
    await new Promise(r => setTimeout(r, 500));
    const el = deepAll(document, `.ag-row[row-index="${n.rowIndex}"] .ag-cell[col-id="${col.getColId()}"]`).find(e => e.getBoundingClientRect().width > 0);
    if (!el) throw new Error('The cell did not render: scroll the grid into view and call again.');
    // Click the middle of the part of the cell that's really showing: inside the scrolling area (pinned
    // columns can cover it in a narrow pane) and inside the window. Too little showing -> offscreen.
    const r = el.getBoundingClientRect(), vp = el.closest('.ag-center-cols-viewport, .ag-center-cols-clipper, .ag-pinned-left-cols-container, .ag-pinned-right-cols-container') || el;
    const v = vp.getBoundingClientRect();
    const x0 = Math.max(r.left, v.left, 0), x1 = Math.min(r.right, v.right, innerWidth), y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, innerHeight);
    const value = unwrap(api.getValue(col, n));
    if (x1 - x0 < 12 || y1 - y0 < 8) return { offscreen: true, value, reason: `only ${Math.max(0, Math.round(x1 - x0))} px of the cell can show, even with the sidebar collapsed and the pinned columns narrowed: close any open panel and call again` };
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let hit = document.elementFromPoint(cx, cy);                    // the grid can sit in shadow DOM: drill down
    while (hit && hit.shadowRoot) { const d = hit.shadowRoot.elementFromPoint(cx, cy); if (!d || d === hit) break; hit = d; }
    if (!hit || !(hit === el || el.contains(hit))) return { offscreen: true, value, reason: 'something covers the cell (a panel or the save bar): close it and call again' };
    const k = jirav.frame.width / innerWidth;
    return { x: Math.round(cx * k), y: Math.round(cy * k), value };
  };

  return read;
}, 'read values by period from plan, custom-table-value, report and assumption grids; readGridValues.cellPoint(label, month)');
