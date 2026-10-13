// jirav.js: core of the Jirav browser kit (readable source). Paste jirav.min.js, its built copy, into
// javascript_tool ONCE per tab. After editing this file, run tools/build-min.sh.
//
// The kit is READ-ONLY. Its functions find things, read state and give click coordinates so that
// Claude's own browser actions (clicks, typing, Save) are easy and reliable. It never saves or
// submits anything. The one exception is jirav.drag: the browser drag tool can't perform the
// gesture, and the result stays pending until the user-visible Save.
//
// After a full page load (navigate, reload, switching company) the globals are gone. ONE line
// restores the core and every block that was loaded in this tab:
//
//   location.host !== 'app.jirav.com' ? 'WAIT: on '+location.host+', not app.jirav.com yet: retry in a few seconds' : (typeof jirav !== 'undefined' && jirav.build === 'e5794eed') ? jirav.status() : (localStorage.jiravKit || '').includes("KIT_BUILD='e5794eed'") ? (0, eval)(localStorage.jiravKit) : 'PASTE scripts/jirav.min.js (not cached in this browser, or out of date)'
//
// Blocks add page-specific helpers: one function mounted on jirav, or a namespace when there are several.
// Paste a block file after the core when jirav.page() suggests it:
//   blocks/grid-values.js    -> jirav.readGridValues()  read grid values by period (plans, custom table values, reports)
//   blocks/custom-table-structure.js -> jirav.customTableStructure  Settings → Custom Tables editor
//   blocks/dashboard-layout.js -> jirav.dashboardLayout  move / resize dashboard tiles
//   blocks/exports.js          -> jirav.exports  catch Excel/PDF exports in the page (no save prompt); any page
// jirav.help() lists everything that's loaded.
//
// ── Core ─────────────────────────────────────────────────────────────────────────────
//   jirav.page()                    where am I? -> {tenant, area, planId?, planPage?, reportSlug?, reportPage?, blocks:{name: loaded?}}
//   Lookups. Each takes an optional company name as its last argument (default: the company in the URL).
//   jirav.listTenants() / jirav.getTenant(name?)  companies; API base = `${apiServerURI}/${tenantId}`
//   jirav.listDashboards()          [{id, name, position}]          position 1 = default
//   jirav.listReports()             [{id, name, status, lastUpdateTime}]  newest first
//   jirav.listReportPages(reportId) [{name, type, hasGrid}]
//   jirav.listPlans()               [{planId, shortName, type, editable, cutoverDate, ...}]  active plans only
//   jirav.listCustomTables()        [{id, name}]
//   jirav.listPlanDrivers(planId)   [{id, name, type, page, account, department, inputs, misconfigured}]  this plan only;
//                                   type = the page for formula drivers (revenue, opex…) or the kind (annual_target, capex…)
//   jirav.listGlobalDrivers()       [{id, name, table, line, start, end, inputs, misconfigured}]  company-wide
//   jirav.listAssumptions()         [{tableId, table, assumptions: [{id, name, type}]}]  definitions; values are per plan
//   jirav.listDateRanges()          [{id, name, type: system|custom, start, width, dates: [from, to]}]
//   jirav.listDepartments()        [{id, name, path, unassigned}]  company-wide
//   jirav.listStaff(planId)         [{id, name, role, department, hireDate, termDate, annualWages, kind: imported|planned, raises}]  this plan
//   jirav.getChartOfAccounts()     [{section, mode: manual|auto, accounts: [{key, name, category, mappedFrom}], notMapped}]  company-wide
//   jirav.getDepartmentMappings()  [{key, name, accounting: [...], workforce: [...]}]  company-wide
//   jirav.getLimits()               plan/department/account/dashboard caps for this company
//   jirav.listGoals()              [{section, id, name, type, series, values: {'YYYY-MM': n}}]  company-wide targets
//   jirav.listUsers()               {users: [{name, email, role, lastActivity}], invitations, roles}
//   jirav.getVarianceRules()        [{line, favorable, valueThreshold, percentThreshold, match, exceptions}]
//   jirav.getCashFlowSetup()        [{key, name, parent, activity: operating|investing|financing}]  balance sheet → cash flow class
//   jirav.listReportSources(company?) [{id, name, type, planId?, pointsTo?, dates}]  what report pages/tiles can show (Actuals, plans, Current PoR, Goals)
//   jirav.getReportSetup(reportId)  [{page, type, template, departments, groups: [{source, range, show, compareTo, thirdSource, variance, percentOf}]}]  per page; compareTo carries its relative range
//   jirav.listDashboardTiles(dashboardId)  [{id, kind, title, chart, source, compareTo, range, frequency, position}]
//   jirav.getTileValues(dashboardId, tileId)  {title, periods, rows: [[label, ...values]], overlay?}  a chart tile's numbers
//   jirav.getDataStatus()          {accounting: {source, company, connected, last…}, workforce, customTables, closeMonth}  where actuals come from, how fresh
//   jirav.getPeriods(planId?)       {fiscalYearStartMonth, closeMonth, plan?: {actuals, forecast, editable}}
//   jirav.getAutoForecast(planId?)  {company: {mode, method, departments, accountSettings}, plan?: {enabled}}
//   jirav.go(path) / jirav.ready()  in-app navigation that keeps the kit loaded; wait for load
//   jirav.readTableRows(i?)        rows of a plain/Material table (Audit Log, Users) as {header: text}
//   jirav.saveBar()                 {pending, covered, save:{x,y}, cancel:{x,y}}  the bottom SAVE CHANGES / Cancel bar; covered: an open panel hides it
//   jirav.alerts({since})           [{kind: success|info|warning|error, text, at}]  every alert seen (success/info auto-close after 4 s)
//   jirav.dismissAlerts()           close the alerts on screen (after reading warnings/errors); jirav.autoDismiss(false) to keep them
//   jirav.waitIdle() / jirav.busy() wait out / detect the "Applying changes…" recalculation overlay (after every Save)
//   jirav.pageLinks()               plan/report sidebar links
//   jirav.deepAll(root, selector)   querySelectorAll through shadow DOM
//   jirav.at(el)                    click point of an element in screenshot coordinates {x, y}
//   jirav.menu()                    items of the open menu/dropdown -> [{label, x, y}] (to click)
//   jirav.drag(fromEl, toEl, {where:'before'|'after'})   drag-reorder within one list (see block docs)

function __jiravKit() {
const KIT_VERSION = '0.2.0';
const KIT_BUILD = 'dev';   // stamped by tools/build-min.sh: a hash of every kit file, so any edit invalidates cached copies
var jirav = (() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const deepAll = (root, sel, out = []) => {
    out.push(...root.querySelectorAll(sel));
    root.querySelectorAll('*').forEach(e => { if (e.shadowRoot) deepAll(e.shadowRoot, sel, out); });
    return out;
  };
  const get = async url => {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error(`GET ${url} -> ${r.status}${r.status === 401 || r.status === 403 ? ' (session expired? ask the user to sign in)' : ''}`);
    return r.json();
  };

  // ── companies ──
  let cache = null;
  const listTenants = async () => (cache = cache || await get('https://api0.jirav.com/-/v1/accessible-tenants'));
  const getTenant = async (name) => {
    const all = await listTenants();
    let hits;
    if (!name) {
      const slug = location.pathname.split('/')[1];
      hits = all.filter(t => t.shortName === slug);
      if (!hits.length) throw new Error('No company in the current URL; pass a company name.');
    } else {
      const q = String(name).toLowerCase();
      hits = all.filter(t => t.shortName.toLowerCase() === q || t.fullName.toLowerCase() === q);
      if (!hits.length) hits = all.filter(t => t.fullName.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q));
    }
    if (hits.length === 0) throw new Error(`No company matches "${name}".`);
    if (hits.length > 1) throw new Error(`Several companies match "${name}": ${hits.map(t => t.fullName).join('; ')}. Ask which.`);
    const t = hits[0];
    return { fullName: t.fullName, shortName: t.shortName, tenantId: t.tenantId, base: `${t.apiServerURI}/${t.tenantId}` };
  };
  // GET a path on the company's API (company = current URL unless named).
  const api = async (path, company) => get((await getTenant(company)).base + path);

  // ── lookups (each takes an optional company name as its last argument) ──
  const listDashboards = async (company) => (await api('/v1/dashboard', company))
    .sort((x, y) => x.position - y.position).map(d => ({ id: d.id, name: d.name, position: d.position }));
  const listReports = async (company) => (await api('/v2/reportPackages/packages', company))
    .map(r => ({ id: r.id, name: r.name, status: r.status, lastUpdateTime: r.lastUpdateTime }))
    .sort((x, y) => String(y.lastUpdateTime).localeCompare(String(x.lastUpdateTime)));
  const listReportPages = async (reportId, company) => (await api(`/v2/reportPackages/package/${reportId}/elements`, company))
    .flatMap(s => s.reports || []).filter(p => p.type !== 'area')
    .map(p => ({ name: p.reportName, type: p.type, hasGrid: p.type === 'reportWithSources' }));
  const listPlans = async (company) => (await api('/v1/model/plans', company)).map(p => ({
    planId: p.planId, shortName: p.shortName, name: p.name, type: p.type, editable: p.editable,
    archived: p.archived, startDate: p.startDate, cutoverDate: p.cutoverDate, endDate: p.endDate, currency: p.currency,
    updateTime: p.contentUpdateTime || p.updateTime }));
  const listCustomTables = async (company) => (await api('/v1/customTable', company))
    .map(t => ({ id: t.customTableConfig.customTableId, name: t.customTableConfig.name }));
  // Plan drivers: stored in one plan. Global drivers are NOT included (see listGlobalDrivers).
  const listPlanDrivers = async (planId, company) => {
    if (!planId) throw new Error('listPlanDrivers(planId) needs a planId');
    const [ds, coa, deps] = await Promise.all([api(`/v1/driver/${planId}/instances`, company), api('/v1/coa/config', company), listDepartments(company)]);
    const acct = {}; Object.values(coa).forEach(sec => (sec.jiravAccounts || []).forEach(a => { acct[a.key] = a.name; }));
    const dep = id => id == null ? null : (deps.find(x => x.id === 'ext:' + id || x.id === String(id)) || {}).name || String(id);
    return ds.map(d => { const a = d.allocation || {};
      return { id: d.instanceId, name: d.name, type: d.driverType, page: a.modelElementId,
        account: a.account == null ? null : acct[a.account] || String(a.account), department: dep(a.department),
        inputs: d.config, misconfigured: !!d.isMisconfigured }; });
  };
  // Global drivers: company-wide, on custom table lines, applied in every plan. misconfigured = its
  // table or line no longer exists (deleting a custom table leaves its global drivers orphaned).
  const listGlobalDrivers = async (company) => {
    const tables = Object.fromEntries((await api('/v1/customTable', company)).map(t => [t.customTableConfig.customTableId, t.customTableConfig]));
    const lineName = (t, id) => { let n = null; const walk = es => es.forEach(e => { const v = Object.values(e)[0]; if (v.id === id) n = v.label; if (v.children) walk(v.children); }); if (t) walk(t.elements || []); return n; };
    return (await api('/v1/driver/global/instances?type=customLines', company)).map(d => {
      const a = d.allocation || {}, t = tables[a.tableId];
      return { id: d.instanceId, name: d.name, type: d.driverType, tableId: a.tableId, table: t ? t.name : null,
        lineId: a.lineId, line: lineName(t, a.lineId), start: d.start, end: d.end, inputs: d.config, misconfigured: !!d.isMisconfigured };
    });
  };
  // Assumption definitions (company-wide). Values are per plan: read them in the plan's Assumptions panel.
  const listAssumptions = async (company) => (await api('/v1/keyAssumption', company)).map(t => ({
    tableId: t.id, table: t.name,
    assumptions: (t.elements || []).map(e => e.constant || Object.values(e)[0]).map(c => ({ id: c.id, name: c.name, type: c.type })) }));
  // Date ranges usable in drivers, reports and tiles: built-in ('system') and the company's own ('custom').
  const listDateRanges = async (company) => (await api('/v1/dateRange', company)).filter(r => !r.deleted).map(r => ({
    id: r.id, name: r.name, type: r.rangeType, start: r.start, width: r.width, end: r.end,
    dates: r.resolvedRange ? [String(r.resolvedRange.start).slice(0, 7), String(r.resolvedRange.end).slice(0, 7)] : null }));
  const dimElements = d => Object.values(((d.dimension || {}).elements || {}).elements || {}).map(x => {
    const m = (x.properties || {}).propertiesMap || {}, out = { id: x.key.id };
    for (const [k, v] of Object.entries(m)) out[k.replace(/^(sys|cus):/, '')] = Object.values(v)[0].value;
    return out;
  });
  const listDepartments = async (company) => dimElements(await api('/v1/model/dimensions/global/sys:department', company))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(d => ({ id: d.id, name: d.displayedName, path: d.displayPath || null, unassigned: !!d.isUnassigned }));
  const listStaff = async (planId, company) => {
    if (!planId) throw new Error('listStaff(planId) needs a planId');
    const [deps, emp] = await Promise.all([listDepartments(company), api(`/v1/model/dimensions/plan/${planId}/sys:employee`, company)]);
    return dimElements(emp).map(e => ({ id: e.id, name: e.displayedName, role: e.roleName || null,
      department: ((deps.find(d => d.id === (e.depId && e.depId.id)) || {}).name) || null,
      hireDate: e.hireDate || null, termDate: e.termDate || null, annualWages: e.annualWages ? e.annualWages.value : null,
      kind: e.importedStaff ? 'imported' : 'planned',
      raises: (e.raises || []).map(r => ({ from: r.startDate, type: r.type, value: r.value })) }));
  };
  const getChartOfAccounts = async (company) => {
    const c = await api('/v1/coa/config', company);
    return Object.entries(c).map(([section, v]) => {
      const ext = Object.fromEntries((v.externalAccounts || []).map(x => [x.key, x.name])), mapped = new Set();
      const accounts = (v.jiravAccounts || []).sort((a, b) => a.sortOrder - b.sortOrder).map(a => {
        const from = ((v.mappings || {})[a.key] || []).map(k => { mapped.add(k); return ext[k] || k; });
        return { key: a.key, name: a.name, parent: a.parentKey, category: a.category, active: a.active, number: a.acctNum, mappedFrom: from };
      });
      return { section, mode: v.mappingMode, accounts, notMapped: Object.keys(ext).filter(k => !mapped.has(k)).map(k => ext[k]) };
    });
  };
  const getDepartmentMappings = async (company) => {
    const c = await api('/v1/departments/config', company);
    const acc = Object.fromEntries((c.accountingDepartments || []).map(x => [x.key, x.name]));
    const wf = Object.fromEntries((c.staffingDepartments || []).map(x => [x.key, x.name]));
    return (c.jiravDepartments || []).sort((a, b) => a.sortOrder - b.sortOrder).map(d => ({ key: d.key, name: d.name, parent: d.parentKey,
      accounting: ((c.accountingMappings || {})[d.key] || []).map(k => acc[k] || k), workforce: ((c.staffingMappings || {})[d.key] || []).map(k => wf[k] || k) }));
  };
  const getLimits = async (company) => api('/v1/config/capacity-limits', company);
  const listGoals = async (company) => {
    const [cfg, input] = await Promise.all([api('/v2/goals/config', company), api('/v2/goals/input', company)]);
    return (cfg.sections || []).flatMap(sec => (sec.goals || []).map(g => ({ section: sec.name, id: g.id, name: g.name,
      type: g.type && g.type.name, series: g.line && g.line.dataElementId,
      values: Object.fromEntries(input.filter(v => v.id === g.id).map(v => [v.month, +v.value])) })));
  };
  const listUsers = async (company) => {
    const [users, inv, roles] = await Promise.all([api('/v1/userManagement/users', company), api('/v1/userManagement/invitations', company), api('/v1/userManagement/roles', company)]);
    const role = r => ((roles || []).find(x => x.jiravRole === r) || {}).name || r;
    return { users: users.map(u => ({ name: u.name, email: u.email, role: role(u.role), lastActivity: u.lastActivity, type: u.type })),
      invitations: inv.map(i => ({ email: i.email, role: role(i.role), sends: i.numberOfSends })),
      roles: roles.map(r => ({ name: r.name, admin: !!r.isAdmin, description: r.description })) };
  };
  const getVarianceRules = async (company) => (await api('/v1/variance-rule', company)).map(r => ({ id: r.id, line: r.dataElementId,
    favorable: r.condition && r.condition.favorableValue, valueThreshold: r.condition && r.condition.valueMaterialityThreshold,
    percentThreshold: r.condition && r.condition.percentMaterialityThreshold, match: r.condition && r.condition.operator, exceptions: r.exceptions }));
  const getCashFlowSetup = async (company) => (await api('/v1/cfs-setup', company)).sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)))
    .map(x => ({ key: x.key, name: x.displayedName, parent: x.parentKey, activity: { OCF: 'operating', ICF: 'investing', FCF: 'financing' }[x.clazz] || x.clazz }));
  const listReportSources = async (company) => (await api('/v2/reports/sources', company)).map(x => ({
    id: x.id, name: x.shortName || x.name, type: x.type, planId: x.planId || null,
    pointsTo: x.type === 'PLAN_OF_RECORD' ? x.name : undefined, dates: [String(x.min).slice(0, 7), String(x.max).slice(0, 7)] }));
  const getReportSetup = async (reportId, company) => {
    if (!reportId) throw new Error('getReportSetup(reportId) needs a reportId (from listReports)');
    const [els, sources, ranges, deps] = await Promise.all([api(`/v2/reportPackages/package/${reportId}/elements`, company),
      api('/v2/reports/sources', company), api('/v1/dateRange', company), listDepartments(company)]);
    // Relative range: a month offset ("-12" = previous year) or a keyword such as YEAR_TOTAL.
    const shift = s => { if (s != null && isNaN(Number(s))) return String(s).toLowerCase().replace(/_/g, ' ');
      const n = Number(s || 0); return n === 0 ? 'same as primary' : n === -12 ? 'previous year' : n === 12 ? 'next year' : `${n > 0 ? '+' : ''}${n} months`; };
    // 'all' (one total), 'by top-level department' / 'by leaf department' (a column per department), or the chosen departments.
    const depFilter = p => { const c = Object.values(p.typeSpecificConfig || {})[0] || {}, f = (c.departmentFilter || {}).filterOption;
      if (!f) return 'all';
      if (f.topLevelDepartmentsTotals) return 'by top-level department';
      if (f.leavesDepartments) return 'by leaf department';
      const ids = ((f.custom || {}).selections || []).map(x => ((x.filter || {}).filter || {}).SingleElement).filter(Boolean);
      return ids.length ? ids.map(id => (deps.find(y => y.id === id.elementId) || {}).name || id.elementId) : 'all'; };
    const src = id => { if (!id) return null; const x = sources.find(y => y.id === id); return x ? (x.shortName || x.name) : id + ' (missing: deleted plan?)'; };
    const rng = r => { if (!r || !r.rangeId) return null; const x = ranges.find(y => y.id === r.rangeId); return x ? x.name : r.rangeId; };
    return els.flatMap(sec => sec.reports || []).filter(p => p.type !== 'area').map(p => {
      const out = { page: p.reportName, type: p.type, template: p.reportType || null };
      if (p.typeSpecificConfig) out.departments = depFilter(p);
      if (p.reportGroupsConfigWithSources) out.groups = p.reportGroupsConfigWithSources.map(g => {
        const b = g.builderConfig || {}, v = b.variance;
        // dates the range resolves to now, and a warning when they fall outside the source's data
        const rr = b.range && ranges.find(y => y.id === b.range.rangeId), sx = b.source && sources.find(y => y.id === b.source);
        const dates = rr && rr.resolvedRange ? [String(rr.resolvedRange.start).slice(0, 7), String(rr.resolvedRange.end).slice(0, 7)] : null;
        const sd = sx ? [String(sx.min).slice(0, 7), String(sx.max).slice(0, 7)] : null;
        const outside = dates && sd && (dates[1] < sd[0] || dates[0] > sd[1]);
        return { name: g.groupName, source: src(b.source), range: rng(b.range), rangeDates: dates,
          ...(outside ? { warning: `range ${dates.join('..')} is outside ${src(b.source)} (${sd.join('..')}): the page will be empty` } : {}),
          show: Object.entries(b.periodicColumns || {}).filter(([, on]) => on).map(([k]) => k),
          compareTo: b.compareToEnabled ? `${src(b.compareTo)} (${shift(v && v.shift)})` : null,
          thirdSource: b.thirdSourceEnabled ? `${src(b.thirdSource)} (${shift(v && v.shiftThirdSource)})` : null,
          variance: v ? { number: !v.numberFormulaHidden, percent: !v.percentFormulaHidden } : null,
          percentOf: ((Object.values(g.reportTypeSpecificGroupConfig || {})[0] || {}).percentOfReferenceType || 'NONE').replace('NONE', '') || null };
      });
      return out;
    });
  };
  const listDashboardTiles = async (dashboardId, company) => {
    if (!dashboardId) throw new Error('listDashboardTiles(dashboardId) needs a dashboardId (from listDashboards)');
    const [tiles, ranges, sources] = await Promise.all([api(`/v3/tiles/dashboard/${dashboardId}`, company), api('/v1/dateRange', company),
      api('/v2/reports/sources', company)]);
    const src = id => { if (!id) return null; const x = sources.find(y => y.id === id); return x ? (x.shortName || x.name) : id + ' (missing: deleted plan?)'; };
    return tiles.map(x => {
      const s = x.setup || {}, ds = s.dataSource || {}, tc = s.timeConfig || {};
      const r = tc.range && ranges.find(y => y.id === tc.range.rangeId);
      return { id: x.id, kind: x.formType, title: s.title || null, chart: s.type || null,
        source: src(ds.primaryPlanId), compareTo: src(ds.comparisonPlanId),
        range: r ? r.name : (tc.range && tc.range.rangeId) || null, frequency: tc.frequency || null, position: s.position || null };
    });
  };
  const getTileValues = async (dashboardId, tileId, company) => {
    const c = await api(`/v3/tiles/content/${dashboardId}/${tileId}`, company);
    const table = d => {
      if (!d || !d.metadata) return null;
      const cols = d.metadata.columns.slice(1);
      const cells = (d.contents && d.contents.cells) || [];
      return { periods: cols.map(k => { const pr = (k.metadata && k.metadata.properties) || {}; return pr.DATE_RANGE_START === pr.DATE_RANGE_END ? pr.DATE_RANGE_START : `${pr.DATE_RANGE_START}..${pr.DATE_RANGE_END}`; }),
        rows: cells.map(row => row.map((cell, i) => { const v = Array.isArray(cell) ? cell[0] : cell; return i === 0 ? v : (v === '' || v == null ? null : +v); })) };
    };
    const out = { title: c.item && c.item.setup && c.item.setup.title, ...(table(c.tileData && c.tileData.data) || { note: 'no data table (text tile?)' }) };
    const ov = table(c.tileData && c.tileData.overlayLineData);
    if (ov && ov.rows.length) out.overlay = ov.rows;
    return out;
  };
  const getDataStatus = async (company) => {
    const t = await getTenant(company), raw = async p => { try { const r = await fetch(t.base + p, { credentials: 'include' }); return { ok: r.ok, body: await r.json().catch(() => null) }; } catch (e) { return { ok: false, body: null }; } };
    const last = async p => { const r = await raw(p); return r.body && r.body.lastImport ? String(r.body.lastImport).slice(0, 10) : null; };
    const [acc, ping, wf, coa, tb, budget, staff, ctActuals, ctBudget, gsheet, periods] = await Promise.all([
      raw('/v1/dataSources/accounting'), raw('/v1/import/accounting/ping'), raw('/v1/dataSources/workforce/selected-data-source'),
      last('/v1/import/coa/info'), last('/v1/import/trialbalance/info'), last('/v1/import/budget/file/info'), last('/v1/import/employees/file/info'),
      last('/v1/import/customLines/file/info'), last('/v1/import/customLines/budget/file/info'), raw('/v1/import/customLines/gdrive/info'), getPeriods(null, company)]);
    const sel = (acc.body || []).find(x => x.selected) || null;
    return {
      accounting: { source: sel ? sel.name : null, company: sel ? sel.companyName : null, connected: sel ? ping.ok : null,
        lastChartOfAccounts: coa, lastTrialBalance: tb, lastBudgetFile: budget },
      workforce: { source: (wf.body && wf.body.dataSource) || (staff ? 'Excel file' : null), lastStaffImport: staff },
      customTables: { lastActualsFile: ctActuals, lastBudgetFile: ctBudget,
        googleSheet: gsheet.body && gsheet.body.fileSelected ? { file: gsheet.body.importedFileName, last: gsheet.body.lastImport, auto: gsheet.body.autoImportEnabled } : null },
      closeMonth: periods.closeMonth,
    };
  };
  const getPeriods = async (planId, company) => {
    const ym = d => d && String(d).slice(0, 7);
    const prevMonth = d => { const [y, m] = ym(d).split('-').map(Number); return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7); };
    const [fys, ranges] = await Promise.all([api('/v1/companyInfo/fys', company), api('/v1/dateRange', company)]);
    const close = ranges.find(r => r.start && r.start.pointer === 'CLOSE_MONTH' && !r.start.shift && r.width === 1 && !r.deleted)
      || ranges.find(r => r.relativeType === 'close' && !r.deleted);
    const out = { fiscalYearStartMonth: fys.month, closeMonth: close && close.resolvedRange ? ym(close.resolvedRange.start) : null };
    if (planId) {
      const plan = (await api('/v1/model/plans', company)).find(p => p.planId === planId);
      if (!plan) throw new Error(`No active plan "${planId}" (archived plans aren't listed).`);
      out.plan = { planId, name: plan.shortName, editable: plan.editable,
        actuals: [ym(plan.startDate), prevMonth(plan.cutoverDate)], forecast: [ym(plan.cutoverDate), ym(plan.endDate)] };
    }
    return out;
  };
  // Auto-Forecast: ON/OFF is per plan; WHAT it forecasts (method, departments, accounts) is company-wide.
  const getAutoForecast = async (planId, company) => {
    const g = await api('/v1/global-auto-forecast-config', company);
    const out = { company: { mode: g.activeMode, method: g.defaultSettings && g.defaultSettings.method,
      departments: g.defaultSettings && g.defaultSettings.depSetup, accountSettings: g.accountSettings } };
    if (planId) out.plan = { planId, enabled: !!(await api(`/v1/auto-forecast-config/${planId}`, company)).enabled };
    return out;
  };
  // ── navigation ──
  // Jirav's full-screen "Applying changes, this may take a few minutes..." overlay (animated giraffe)
  // shows while it recalculates after a save or export. Clicks during it are lost.
  const busy = () => {
    const o = document.querySelector('loading-overlay .loading-overlay-container.enabled');
    return o && o.getBoundingClientRect().height > 0 ? (o.textContent.trim() || 'busy') : false;
  };
  const waitIdle = async (timeoutMs = 300000) => {
    const t0 = Date.now(); let seen = false;
    await sleep(500);                                  // the overlay can take a moment to appear after Save
    while (Date.now() - t0 < timeoutMs) { const b = busy(); if (!b) break; seen = seen || b; await sleep(1000); }
    const waited = Date.now() - t0, still = busy();
    return still ? { busy: true, waitedMs: waited, note: 'still recalculating: wait again before clicking or verifying' } : { busy: false, waitedMs: waited, overlay: seen || null };
  };
  // The batched-edit bar many pages show at the bottom ("SAVE CHANGES" / "SAVE" + "Cancel"). It
  // appears only after the edit is committed (Enter / leaving the cell): check before clicking Save.
  const saveBar = () => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.bottom > innerHeight * 0.75 && r.top < innerHeight; };
    const btn = re => {
      const ok = e => re.test(e.textContent.replace(/\s+/g, ' ').trim()) && vis(e);
      return deepAll(document, 'button, [role=button]').filter(ok)[0]
        || deepAll(document, '.btn, a, span, div').filter(e => e.childElementCount <= 2 && ok(e))
          .sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0];
    };
    const save = btn(/^save( changes)?$/i), cancel = btn(/^cancel$/i);
    if (!save) return { pending: false };
    const r = save.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const within = (outer, el) => { for (let n = el; n; n = n.parentNode || n.host) if (n === outer) return true; return false; };
    const covered = !!top && !within(save, top) && !within(top, save);
    return { pending: true, covered, save: at(save), cancel: cancel ? at(cancel) : null };
  };
  // Jirav's alerts (green/red boxes at the top) pile up. The kit logs every alert it sees, closes
  // success/info ones after 4 s, and leaves warnings/errors until read and dismissed.
  const al = window.__jiravAlerts = window.__jiravAlerts || { log: [], seen: new WeakSet(), auto: true, obs: null, busy: false };
  const alertEls = () => [...document.querySelectorAll('.jv-alert, mat-snack-bar-container')].filter(e => e.offsetParent !== null && e.innerText.trim());
  const alertKind = e => { const c = String(e.className); return /danger|error|mat-warn/.test(c) ? 'error' : /warning/.test(c) ? 'warning' : /success/.test(c) ? 'success' : 'info'; };
  const closeAlert = e => { const x = e.querySelector('.jvi-close, button.close:not(.ng-hide), .mat-mdc-snack-bar-action button, button[aria-label*="lose"]'); if (x) x.click(); };
  const scanAlerts = () => {
    for (const e of alertEls()) {
      if (al.seen.has(e)) continue; al.seen.add(e);
      const rec = { kind: alertKind(e), text: e.innerText.trim().replace(/\s*\n\s*/g, ' '), at: new Date().toISOString() };
      al.log.push(rec); if (al.log.length > 30) al.log.shift();
      if (al.auto && (rec.kind === 'success' || rec.kind === 'info')) setTimeout(() => closeAlert(e), 4000);
    }
  };
  if (!al.obs && document.body) {
    al.obs = new MutationObserver(() => { if (al.busy) return; al.busy = true; setTimeout(() => { al.busy = false; scanAlerts(); }, 200); });
    al.obs.observe(document.body, { childList: true, subtree: true }); scanAlerts();
  }
  const alerts = ({ since } = {}) => { scanAlerts(); return al.log.filter(a => !since || a.at >= since); };
  const dismissAlerts = () => { const els = alertEls(); els.forEach(closeAlert); return els.length; };
  const autoDismiss = (on = true) => { al.auto = !!on; return al.auto; };
  const ready = async (timeoutMs = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (document.title && document.title !== 'Jirav' && !busy()) {
        const grids = deepAll(document, '.ag-root-wrapper');
        const isDataPage = /\/(plan|report)\//.test(location.pathname);
        if (!isDataPage || grids.length || Date.now() - t0 > 6000) { await sleep(800); return { path: location.pathname, title: document.title }; }
      }
      await sleep(250);
    }
    return { path: location.pathname, title: document.title, timedOut: true, busy: busy() || false };
  };

  const go = async (path) => {
    const url = new URL(path, location.origin);
    const target = url.pathname + url.search;
    const sameCompany = url.pathname.split('/')[1] === location.pathname.split('/')[1];
    if (!sameCompany) {
      location.assign(target);
      return { path: target, fullReload: true, note: 'Different company: full page load. In the next call, run the restore line first.' };
    }
    const prev = document.title;
    history.pushState({}, '', target);
    dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    const t0 = Date.now();
    // Wait for the new page's title. A destination can share the current title (e.g. the same page in
    // another plan), so an unchanged title only holds us for 3 s.
    while (Date.now() - t0 < 20000 && (document.title === 'Jirav' || (document.title === prev && Date.now() - t0 < 3000))) await sleep(250);
    const r = await ready();
    r.redirectedToDashboard = !/\/dashboard/.test(target) && /\/dashboard/.test(location.pathname);
    return r;
  };

  const pageLinks = () => {
    const seen = new Set();
    return deepAll(document, 'a').map(a => ({ label: a.textContent.trim(), href: a.getAttribute('href') || '' }))
      .filter(l => /\/(plan|report)\//.test(l.href) && !seen.has(l.href) && seen.add(l.href));
  };

  // ── where am I ──
  const BLOCK_FOR = [
    [/^\/[^/]+\/(plan|report)\//, 'readGridValues'],
    [/^\/[^/]+\/setup\/custom-tables/, 'customTableStructure'],
    [/^\/[^/]+\/dashboard\//, 'dashboardLayout'], [/^\/[^/]+\/setup\/integrations/, 'imports'],
  ];
  const page = () => {
    const p = location.pathname, seg = p.split('/');
    const out = { tenant: seg[1] || null, area: seg[2] || null, title: document.title };
    if (seg[2] === 'plan') { out.planId = seg[4] || null; out.planPage = seg.slice(5).join('/') || null; }
    if (seg[2] === 'report') { out.reportSlug = seg[3] || null; out.reportPage = seg[4] || null; }   // a URL slug, not an id: match listReports() by name
    if (seg[2] === 'setup') out.area = 'setup/' + (seg[3] || '');
    const want = BLOCK_FOR.filter(([re]) => re.test(p)).map(([, b]) => b);
    out.blocks = Object.fromEntries(want.map(b => [b, !!jirav[b]]));
    const missing = want.filter(b => !jirav[b]);
    if (missing.length) out.hint = 'Paste ' + missing.map(b => `scripts/blocks/${{ customTableStructure: 'custom-table-structure', readGridValues: 'grid-values', dashboardLayout: 'dashboard-layout' }[b] || b}.min.js`).join(', ');
    return out;
  };

  // ── click helpers (read-only: they return coordinates, Claude clicks) ──
  // Screenshot coordinates = CSS px × frame.width / innerWidth. The Browser pane's frame is 800 wide;
  // if a screenshot reports another frame width, set jirav.frame.width to it.
  // Plain HTML / Material tables (Audit Log, Users, …): not ag-Grid, so readGridValues can't read them.
  const readTableRows = (index = 0) => {
    const tables = deepAll(document, 'table').filter(t => t.getBoundingClientRect().height > 0);
    const t = tables[index];
    if (!t) throw new Error(`No visible table ${index} (found ${tables.length}). Grids with months are ag-Grid: use readGridValues.`);
    const clean = e => e.textContent.replace(/\b(filter_list|arrow_drop_down|more_vert)\b/g, '').replace(/\s+/g, ' ').trim();
    const head = [...t.querySelectorAll('thead th, tr.mat-mdc-header-row th')].map(clean);
    return [...t.querySelectorAll('tbody tr')].map(r => { const c = [...r.querySelectorAll('td')].map(clean); return head.length ? Object.fromEntries(head.map((h, i) => [h || `col${i}`, c[i] ?? null])) : c; });
  };
  const frame = { width: 800 };
  const at = el => {
    const r = el.getBoundingClientRect(), k = frame.width / innerWidth;
    return { x: Math.round((r.x + r.width / 2) * k), y: Math.round((r.y + r.height / 2) * k) };
  };
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // Material icon ligatures ("more_vert", "remove_circle_outline") show up as text: strip words with
  // underscores, and drop labels that are a single lowercase word ("add", "close", "psychology").
  const ICON = /^[a-z]+$/;
  const menu = () => {
    const sel = '.dropdown-menu li, .dropdown-menu button, .dropdown-panel button, .cdk-overlay-pane button, .cdk-overlay-pane [role=menuitem], ' +
      '[role=menu] [role=menuitem], [role=listbox] [role=option], [role=treeitem], mat-option, .mat-mdc-menu-item, ' +
      '.ag-menu-option, .ag-list-item, .ag-select-list-item, .ui-select-choices-row';
    const seen = new Set();
    return deepAll(document, sel).filter(visible)
      .map(e => ({ label: e.textContent.replace(/\s+/g, ' ').trim().split(' ').filter(w => !/^[a-z]+(_[a-z]+)+$/.test(w)).join(' '), ...at(e) }))
      .filter(i => i.label && i.label.length < 60 && !ICON.test(i.label) && !seen.has(i.label + i.y) && seen.add(i.label + i.y));
  };

  // Drag-reorder among siblings in an Angular CDK drop list or a Muuri grid (custom table rows).
  // Browser drag tools jump straight to the end point, which these libraries ignore, so this
  // steps the pointer. It releases once the target has shifted by most of a row, meaning the
  // list made room. It retries because the first drag after choosing "Move" is often ignored.
  const drag = async (from, to, { where = 'before', step = 4, delay = 30, tries = 3 } = {}) => {
    const item = from.closest('.muuri-item, .cdk-drag') || from;
    to = to.closest('.muuri-item, .cdk-drag') || to;
    const list = el => el.parentElement && el.parentElement.closest('.cdk-drop-list, .muuri');
    if (item === to) return { ok: false, why: 'from and to are the same row' };
    if (!list(item) || list(item) !== list(to)) return { ok: false, why: 'not in the same list: drag only reorders within one level (use Make Sub / Make Parent to change level)' };
    for (let attempt = 1; attempt <= tries; attempt++) {
      const hd = item.querySelector('.cdk-drag-handle, .movable-group-element.draggable');
      if (!hd) return { ok: false, why: 'row is not in move mode: open its ⋯ menu and choose Move first' };
      const h = hd.getBoundingClientRect(), a0 = item.getBoundingClientRect(), b0 = to.getBoundingClientRect(), box = list(item).getBoundingClientRect();
      const x = h.x + Math.min(h.width / 2, 40), y0 = h.y + h.height / 2, dir = where === 'after' ? 1 : -1;
      const maxTravel = dir < 0 ? a0.top - box.top : box.bottom - a0.bottom;   // keep the row inside its list
      const ev = (t, type, y, buttons) => {
        const o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons };
        t.dispatchEvent(new PointerEvent('pointer' + type, o)); t.dispatchEvent(new MouseEvent('mouse' + type, o));
      };
      ev(hd, 'down', y0, 1); await sleep(delay);
      let y = y0, sorted = false, extra = 0;
      for (let d = step; d <= maxTravel; d += step) {
        y = y0 + dir * d; ev(document, 'move', y, 1); await sleep(delay);
        if (!sorted && (b0.y - to.getBoundingClientRect().y) * dir > a0.height * 0.6) sorted = true;
        if (sorted && ++extra > 3) break;
      }
      await sleep(250); ev(document, 'up', y, 0); await sleep(700);
      if (sorted) return { ok: true, attempts: attempt };
    }
    return { ok: false, why: 'the target never moved; check the order on screen' };
  };


  // ── blocks ──
  const blocks = {};
  const block = (name, build, factory, summary) => {
    if (build !== KIT_BUILD) throw new Error(`Block ${name} is build ${build} but the core is ${KIT_BUILD}: paste the current .min.js files (core first).`);
    jirav[name] = factory(jirav);
    blocks[name] = summary || '';
    try { localStorage.setItem('jiravBlock:' + name, JSON.stringify({ b: build, info: summary || '', src: '(' + factory.toString() + ')' })); } catch (e) {}
    return typeof jirav[name] === 'function' ? `jirav.${name}() loaded` : `jirav.${name} loaded: ` + Object.keys(jirav[name]).join(', ');
  };
  const restoreBlocks = () => {
    const out = [], stale = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith('jiravBlock:')) continue;
      const name = key.slice(11);
      try {
        const b = JSON.parse(localStorage.getItem(key));
        if (b.b !== KIT_BUILD) { stale.push(key); continue; }
        jirav[name] = (0, eval)(b.src)(jirav); blocks[name] = b.info; out.push(name);
      } catch (e) { out.push(name + ' (failed: ' + e.message + ')'); }
    }
    stale.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });   // from an older kit build: paste again when needed
    return out;
  };
  const status = () => 'jirav ' + KIT_VERSION + ' (build ' + KIT_BUILD + ') loaded' + (Object.keys(blocks).length ? '; blocks: ' + Object.keys(blocks).join(', ') : '') + '. ' + JSON.stringify(page());
  const help = () => ({
    core: 'page, listTenants, getTenant, listDashboards, listReports, listReportPages, listPlans, listCustomTables, listPlanDrivers, listGlobalDrivers, ' +
      'listAssumptions, listDateRanges, listDepartments, listStaff, getChartOfAccounts, getDepartmentMappings, getLimits, listGoals, listUsers, getVarianceRules, getCashFlowSetup, listReportSources, getReportSetup, ' +
      'listDashboardTiles, getTileValues, getDataStatus, getPeriods, getAutoForecast, ' +
      'go, ready, busy, waitIdle, saveBar, alerts, dismissAlerts, autoDismiss, readTableRows, pageLinks, deepAll, at, menu, drag',
    blocks: Object.fromEntries(Object.keys(blocks).map(b => [b, { summary: blocks[b],
      functions: typeof jirav[b] === 'function' ? [b + '()'] : Object.keys(jirav[b]) }])),
    here: page(),
  });

  return { version: KIT_VERSION, build: KIT_BUILD, help, status, page,
    listTenants, getTenant, listDashboards, listReports, listReportPages, listPlans, listCustomTables, listPlanDrivers,
    listGlobalDrivers, listAssumptions, listDateRanges, listDepartments, listStaff, getChartOfAccounts, getDepartmentMappings, getLimits, listGoals, listUsers, getVarianceRules, getCashFlowSetup, listReportSources, getReportSetup,
    listDashboardTiles, getTileValues, getDataStatus, getPeriods, getAutoForecast, ready, busy, waitIdle, saveBar, alerts, dismissAlerts, autoDismiss, readTableRows, go, pageLinks,
    deepAll, at, menu, frame, drag, block, _restoreBlocks: restoreBlocks };
})();
window.jirav = jirav;
try { localStorage.setItem('jiravKit', '(' + __jiravKit.toString() + ')()'); } catch (e) { /* storage unavailable: re-paste after reloads */ }
const restored = jirav._restoreBlocks();
return jirav.status() + (restored.length ? ' Restored blocks: ' + restored.join(', ') : '');
}
__jiravKit();
