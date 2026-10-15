// blocks/grid-values.js: jirav.readGridValues(), which reads financial VALUES BY MONTH (or quarter/year) from the
// page's data grid as compact JSON. Paste after scripts/jirav.js. Options and output:
// references/reading-grid-values.md.
//
//   jirav.readGridValues(opts)  -> {context, columns, periods, kinds, grains, rowFields, rows, ...}
//   jirav.readGridValues.cellPoint(label, "YYYY-MM", {department, index}) -> {x, y, value}   point to real-click a cell
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
    if (!comps.length) throw new Error('No data grid on this page (dashboards/text pages have none). Wait with jirav.ready() or check the page.');

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
      // Locked plans carry no *_DRIVER_ALLOWED tags. Then infer structurally: accounts are
      // non-driver rows at depth >= 1 whose Department is "All" (per-department rows are drivers
      // or allocations); "System Salaries" / "Manual Input" are sub-lines. Marked kindsInferred.
      const deptCol = cols.find(c2 => /^department$/i.test(String(header(c2))));
      let anyAllowed = false; api.forEachNode(n => { if (!anyAllowed && tagsOf(n).some(x => /_DRIVER_ALLOWED$/.test(x))) anyAllowed = true; });
      const isPlanGrid = (() => { let r = false; api.forEachNode(n => { if (!r && n.data && n.data.metadata && !n.data.rowMeta) r = true; }); return r; })();
      const inferred = isPlanGrid && !anyAllowed;
      const SUBLINES = /^(System Salaries|Manual Input)$/;
      const isAccountNode = n => {
        const tags = tagsOf(n);
        if (!inferred) return tags.some(x => /_DRIVER_ALLOWED$/.test(x));
        if (tags.includes('DRIVER') || n.level < 1) return false;
        const lbl = String(unwrap(api.getValue(labelCol, n)));
        const dep = deptCol ? String(unwrap(api.getValue(deptCol, n))) : 'All';
        return dep === 'All' && !SUBLINES.test(lbl);
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
          return 'line';
        }
        if (tags.includes('DRIVER')) return 'driver';
        if (isAccountNode(n)) return (n.childrenAfterGroup || []).some(isAccountNode) ? 'group' : 'account';
        if (n.level === 0) return 'total';
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
      if (inferred) g.kindsInferred = 'locked plan: account/group kinds inferred from structure (Department = All)';
      if (out.length < total) g.truncated = { kept: out.length, total };
      if (o.under && !underNode) g.note = `No row is labelled "${o.under}". Section and account labels are the company's own: read {maxDepth: 0} (or {maxDepth: 1}) to see them.`;
      else if (o.match && !out.length) g.note = `Nothing matched ${o.match}. Labels are the company's own: read {maxDepth: 1} to see them.`;
      return g;
    });
    return grids.length === 1 ? grids[0] : grids;
  };

  // read.cellPoint(label, 'YYYY-MM', {department, index, grid}) -> {x, y, value}: screenshot point of one cell,
  // scrolled into view (parents expanded), for a real click before typing or Delete.
  read.cellPoint = async (label, period, opts = {}) => {
    const MON = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const comps = deepAll(document, '.ag-root-wrapper').map(el => el.__agComponent).filter(c => c && (c.gridApi || (c.gos && c.gos.api)));
    const c = comps[opts.grid || 0];
    if (!c) throw new Error('No data grid on this page.');
    const api = c.gridApi || c.gos.api, capi = c.columnApi || (c.gos && c.gos.columnApi) || api;
    const cols = capi.getAllDisplayedColumns(), labelCol = cols[0];
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
    const hits = []; api.forEachNode(n => { if (unwrap(api.getValue(labelCol, n)) === label) hits.push(n); });
    if (!hits.length) throw new Error(`No row labelled "${label}".`);
    if (hits.length > 1 && opts.index == null) throw new Error(`${hits.length} rows are labelled "${label}": pass {index} (0 = first, in grid order).`);
    const n = hits[opts.index || 0];
    for (let p = n.parent; p && p.level >= 0; p = p.parent) if (p.setExpanded && !p.expanded) p.setExpanded(true);
    await new Promise(r => setTimeout(r, 300));
    api.ensureNodeVisible(n, 'middle'); (api.ensureColumnVisible || capi.ensureColumnVisible).call(api.ensureColumnVisible ? api : capi, col);
    await new Promise(r => setTimeout(r, 500));
    const el = deepAll(document, `.ag-row[row-index="${n.rowIndex}"] .ag-cell[col-id="${col.getColId()}"]`).find(e => e.getBoundingClientRect().width > 0);
    if (!el) throw new Error('The cell did not render: scroll the grid into view and call again.');
    return { ...jirav.at(el), value: unwrap(api.getValue(col, n)) };
  };

  return read;
}, 'read values by period from plan, custom-table-value, report and assumption grids; readGridValues.cellPoint(label, month)');
