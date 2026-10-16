// blocks/dashboard-layout.js: jirav.dashboardLayout, helpers for moving and resizing dashboard tiles
// (/<tenant>/dashboard/<id>). Paste after scripts/jirav.js. Workflow: references/dashboards.md.
//
// Read-only: these return the layout and screenshot coordinates; Claude does the drag with the
// browser's own left_click_drag, which works on this grid. Each drag saves immediately.
//   dl.tiles()                         -> {columns, tiles: [{id, title, row, col, sizeX, sizeY, grab:{x,y}, resize:{x,y}, visible}]}
//   dl.moveTilePoints(title, row, col) -> {from:{x,y}, to:{x,y}, partial?}   left_click_drag from → to; partial: drag, then call again
//     (title may be {row, col} from tiles() when titles repeat; points are in screenshot px)
//   dl.resizeTilePoints(title, sizeX, sizeY) -> {from:{x,y}, to:{x,y}}   drag the corner handle
// The grid is 10 columns wide. Tiles float up, and a tile dropped on others pushes or swaps them, so
// read dl.tiles() again after every drag and check the whole layout.
if (typeof jirav === 'undefined') throw new Error('Paste scripts/jirav.min.js (the core) first.');
jirav.block('dashboardLayout', 'dev', (jirav) => {
  const grid = () => {
    if (!/\/dashboard\//.test(location.pathname)) throw new Error('Open a dashboard first.');
    const items = [...document.querySelectorAll('li.gridster-item')];
    if (!items.length || typeof angular === 'undefined') throw new Error('No tile grid on this page yet: wait with jirav.ready().');
    const g = angular.element(items[0]).scope().gridster;
    return { items, g, k: jirav.frame.width / innerWidth };
  };
  const dashboardId = async () => {
    const name = document.title.split(' | ')[0];
    const d = (await jirav.listDashboards()).find(x => x.name === name);
    if (!d) throw new Error(`Can't match dashboard "${name}" to listDashboards().`);
    return d.id;
  };
  const tiles = async () => {
    const { items, g, k } = grid();
    const api = await jirav.listDashboardTiles(await dashboardId());
    const pt = (x, y) => ({ x: Math.round(x * k), y: Math.round(y * k) });
    return { columns: g.columns, tiles: items.map(li => {
      const gi = angular.element(li).scope().gridsterItem, r = li.getBoundingClientRect();
      const a = api.find(t => t.position && t.position.row === gi.row && t.position.col === gi.col) || {};
      const h = li.querySelector('.handle-se'), hr = h && h.getBoundingClientRect();
      return { id: a.id || null, title: a.title || (a.kind === 'TEXT' ? '(text tile)' : null),
        row: gi.row, col: gi.col, sizeX: gi.sizeX, sizeY: gi.sizeY,
        grab: pt(r.left + r.width / 2, r.top + Math.min(r.height / 2, 120)),
        resize: hr ? pt(hr.left + hr.width / 2, hr.top + hr.height / 2) : null,
        visible: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
    }).sort((x, y) => x.row - y.row || x.col - y.col) };
  };
  const find = async (title, tries = 6) => {   // a title, or {row, col} from tiles() when titles repeat
    const all = (await tiles()).tiles, pos = title && typeof title === 'object';
    // Right after a drag the tile list reloads and titles are blank for a moment: wait and retry.
    if (!pos && tries > 1 && !all.some(t => t.title === title) && all.some(t => !t.title)) { await new Promise(r => setTimeout(r, 700)); return find(title, tries - 1); }
    const hit = all.filter(t => pos ? t.row === title.row && t.col === title.col : t.title === title);
    if (pos && !hit.length) throw new Error(`No tile at row ${title.row}, col ${title.col}. Read tiles().`);
    if (hit.length !== 1) throw new Error(hit.length ? `Several tiles are called "${title}": pass {row, col} from tiles() instead of the title.` : `No tile "${title}". Titles: ${all.map(t => t.title).join(', ')}`);
    return hit[0];
  };
  // Narrow panes (Cowork ~800 px): the tile grid is wider than the pane and scrolls sideways. The helpers
  // scroll (view-only) so both drag points are on screen; a drag too long for one screen comes back as the
  // furthest step that fits, {partial: true}: drag it, then call again with the same target.
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const scroller = () => { const { items } = grid();
    for (let n = items[0].parentElement; n; n = n.parentElement) { const cs = getComputedStyle(n);
      if (n.scrollWidth > n.clientWidth + 2 && /(auto|scroll)/.test(cs.overflowX)) return n; }
    return null; };
  const view = () => { const sc = scroller(), r = sc ? sc.getBoundingClientRect() : { left: 0, right: innerWidth };
    return { left: Math.max(r.left, 0), right: Math.min(r.right, innerWidth), top: 0, bottom: innerHeight }; };
  // Scroll so the CSS-px box [x0,x1]×[y0,y1] (as measured now) is inside the view, as far as it fits.
  const show = async (x0, x1, y0, y1) => {
    const sc = scroller(), v = view(), m = 8;
    if (sc) { if (x1 > v.right - m) sc.scrollLeft += Math.min(x1 - (v.right - m), x0 - (v.left + m)); else if (x0 < v.left + m) sc.scrollLeft -= (v.left + m) - x0; }
    if (y1 > v.bottom - m) window.scrollBy(0, Math.min(y1 - (v.bottom - m), y0 - m)); else if (y0 < m) window.scrollBy(0, y0 - m);
    await sleep(350);
  };
  const elOf = t => grid().items.find(l => { const gi = angular.element(l).scope().gridsterItem; return gi.row === t.row && gi.col === t.col; });
  const moveTilePoints = async (title, row, col) => {
    let t = await find(title); const { g } = grid();
    if (col < 0 || col + t.sizeX > g.columns) throw new Error(`col ${col} doesn't fit a tile ${t.sizeX} wide in ${g.columns} columns (max col ${g.columns - t.sizeX}).`);
    const v = view(), r = elOf(t).getBoundingClientRect(), cw = g.curColWidth, rh = g.curRowHeight;
    // How far one drag can go while the tile and its drop spot both fit on screen.
    const maxDc = Math.max(1, Math.floor((v.right - v.left - r.width - 16) / cw)), maxDr = Math.max(1, Math.floor((v.bottom - v.top - Math.min(r.height, 240) - 16) / rh));
    const dc = Math.max(-maxDc, Math.min(maxDc, col - t.col)), dr = Math.max(-maxDr, Math.min(maxDr, row - t.row));
    const tx = r.left + dc * cw, ty = r.top + dr * rh;
    await show(Math.min(r.left, tx), Math.max(r.right, tx + r.width), Math.min(r.top, ty), Math.max(r.top, ty) + Math.min(r.height, 240));
    t = await find({ row: t.row, col: t.col });
    const k = jirav.frame.width / innerWidth, to = { x: Math.round(t.grab.x + dc * cw * k), y: Math.round(t.grab.y + dr * rh * k) };
    const partial = t.col + dc !== col || t.row + dr !== row;
    return partial ? { from: t.grab, to, partial: true, next: `drag, then call moveTilePoints again with row ${row}, col ${col}` } : { from: t.grab, to };
  };
  const resizeTilePoints = async (title, sizeX, sizeY) => {
    const t = await find(title), { g, k, items } = grid();
    if (!t.resize) throw new Error('This tile has no resize handle.');
    sizeY = sizeY || t.sizeY;
    if (sizeX < 1 || t.col + sizeX > g.columns) throw new Error(`sizeX ${sizeX} doesn't fit from col ${t.col} in ${g.columns} columns.`);
    let r = elOf(t).getBoundingClientRect(); const v = view();
    // Only the corner handle and its target have to be on screen (the tile's left edge may scroll away):
    // change the size by at most what fits between them in one drag (partial), then call again.
    const stepX = Math.max(1, Math.floor((v.right - v.left - 32) / g.curColWidth)), stepY = Math.max(1, Math.floor((v.bottom - v.top - 32) / g.curRowHeight));
    const sx = Math.max(t.sizeX - stepX, Math.min(sizeX, t.sizeX + stepX)), sy = Math.max(t.sizeY - stepY, Math.min(sizeY, t.sizeY + stepY));
    const hx = r.left + (sx - 0.5) * g.curColWidth, hy = r.top + (sy - 0.5) * g.curRowHeight;   // where the handle goes
    await show(Math.min(r.right, hx) - 24, Math.max(r.right, hx) + 24, Math.min(r.bottom, hy) - 24, Math.max(r.bottom, hy) + 24);
    const t2 = await find({ row: t.row, col: t.col }); r = elOf(t2).getBoundingClientRect();
    // The grid rounds a dragged size UP to whole cells, so aim for half a cell less than the target size.
    const to = { x: Math.round(t2.resize.x + ((sx - 0.5) * g.curColWidth - r.width) * k), y: Math.round(t2.resize.y + ((sy - 0.5) * g.curRowHeight - r.height) * k) };
    return sx !== sizeX || sy !== sizeY ? { from: t2.resize, to, partial: true, next: `drag, then call resizeTilePoints again with ${sizeX}, ${sizeY}` } : { from: t2.resize, to };
  };
  return { tiles, moveTilePoints, resizeTilePoints };
}, 'move and resize dashboard tiles: layout and drag coordinates');
