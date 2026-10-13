// blocks/dashboard-layout.js: jirav.dashboardLayout, helpers for moving and resizing dashboard tiles
// (/<tenant>/dashboard/<id>). Paste after scripts/jirav.js. Workflow: references/dashboards.md.
//
// Read-only: these return the layout and screenshot coordinates; Claude does the drag with the
// browser's own left_click_drag, which works on this grid. Each drag saves immediately.
//   dl.tiles()                         -> {columns, tiles: [{id, title, row, col, sizeX, sizeY, grab:{x,y}, resize:{x,y}, visible}]}
//   dl.moveTilePoints(title, row, col) -> {from:{x,y}, to:{x,y}}   left_click_drag from → to
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
        visible: r.top >= 0 && r.bottom <= innerHeight };
    }).sort((x, y) => x.row - y.row || x.col - y.col) };
  };
  const find = async title => {   // a title, or {row, col} from tiles() when titles repeat
    const all = (await tiles()).tiles, pos = title && typeof title === 'object';
    const hit = all.filter(t => pos ? t.row === title.row && t.col === title.col : t.title === title);
    if (pos && !hit.length) throw new Error(`No tile at row ${title.row}, col ${title.col}. Read tiles().`);
    if (hit.length !== 1) throw new Error(hit.length ? `Several tiles are called "${title}": pass {row, col} from tiles() instead of the title.` : `No tile "${title}". Titles: ${all.map(t => t.title).join(', ')}`);
    return hit[0];
  };
  const onScreen = p => { if (p.y < 0 || p.y > innerHeight * jirav.frame.width / innerWidth) throw new Error('The drop point is off screen: scroll so the tile and its target are both visible (or move the tile up first), then call again.'); return p; };
  const pitch = () => { const { g, k } = grid(); return { x: g.curColWidth * k, y: g.curRowHeight * k }; };   // one grid cell in screenshot px
  const moveTilePoints = async (title, row, col) => {
    const t = await find(title), { g } = grid(), p = pitch();
    if (col < 0 || col + t.sizeX > g.columns) throw new Error(`col ${col} doesn't fit a tile ${t.sizeX} wide in ${g.columns} columns (max col ${g.columns - t.sizeX}).`);
    if (!t.visible) throw new Error('Tile is off screen: scroll it into view, then call again.');
    return { from: t.grab, to: onScreen({ x: Math.round(t.grab.x + (col - t.col) * p.x), y: Math.round(t.grab.y + (row - t.row) * p.y) }) };
  };
  const resizeTilePoints = async (title, sizeX, sizeY) => {
    const t = await find(title), { g, k, items } = grid();
    if (!t.resize) throw new Error('This tile has no resize handle.');
    sizeY = sizeY || t.sizeY;
    if (sizeX < 1 || t.col + sizeX > g.columns) throw new Error(`sizeX ${sizeX} doesn't fit from col ${t.col} in ${g.columns} columns.`);
    const el = items.find(l => { const gi = angular.element(l).scope().gridsterItem; return gi.row === t.row && gi.col === t.col; });
    const r = el.getBoundingClientRect();
    // The grid rounds a dragged size UP to whole cells, so aim for half a cell less than the target size.
    return { from: t.resize, to: onScreen({ x: Math.round(t.resize.x + ((sizeX - 0.5) * g.curColWidth - r.width) * k),
      y: Math.round(t.resize.y + ((sizeY - 0.5) * g.curRowHeight - r.height) * k) }) };
  };
  return { tiles, moveTilePoints, resizeTilePoints };
}, 'move and resize dashboard tiles: layout and drag coordinates');
