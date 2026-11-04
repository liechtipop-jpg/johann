// Darstellung Schiffe versenken: Platzieren (Antippen, Ziehen, Drehen, Zufall) und Schiessen.
import { canPlace, cellName, shipCells } from '/shared/games/schiffe.js';
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { button, h, s } from '../ui/dom.js';

const C = 32;

function grid(size, label, cellFn, extra = []) {
  const px = size * C + 24;
  const svg = s('svg', { viewBox: `0 0 ${px} ${px}`, class: 'board-svg sea', role: 'grid', 'aria-label': label });
  svg.append(s('rect', { x: 0, y: 0, width: px, height: px, rx: 14, fill: 'var(--surface)' }));
  for (let i = 0; i < size; i++) {
    svg.append(s('text', { x: 24 + i * C + C / 2, y: 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--text-3)' }, 'ABCDEFGHIJKLMN'[i]));
    svg.append(s('text', { x: 11, y: 24 + i * C + C / 2 + 4, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--text-3)' }, i + 1));
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) svg.append(cellFn(x, y, 24 + x * C, 24 + y * C));
  extra.forEach((e) => svg.append(e));
  return svg;
}

const water = (px, py, tint) => s('rect', { x: px + 1, y: py + 1, width: C - 2, height: C - 2, rx: 5, fill: tint ?? 'color-mix(in srgb, #2a7fb8 26%, var(--surface-2))' });
const shipShape = (ship, extra = {}) => {
  const w = (ship.dir === 'h' ? ship.len : 1) * C - 6;
  const hgt = (ship.dir === 'v' ? ship.len : 1) * C - 6;
  return s('rect', { x: 24 + ship.x * C + 3, y: 24 + ship.y * C + 3, width: w, height: hgt, rx: 12, fill: '#8a97a8', stroke: '#c3ccd8', 'stroke-width': 2, ...extra });
};
const missMark = (px, py) => s('circle', { cx: px + C / 2, cy: py + C / 2, r: 4.5, fill: 'var(--text-2)', class: 'pop' });
const hitMark = (px, py, fresh) => s('g', { class: fresh ? 'pop' : '' }, s('circle', { cx: px + C / 2, cy: py + C / 2, r: 11, fill: '#ff7a3d', opacity: 0.85 }), s('path', { d: `M${px + 10} ${py + 10}L${px + C - 10} ${py + C - 10}M${px + C - 10} ${py + 10}L${px + 10} ${py + C - 10}`, stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round' }));

export function create(root, api) {
  const wrap = h('div', { class: 'ships-wrap' });
  root.append(wrap);
  let sel = null;
  let dir = 'h';
  let lastTap = { id: null, at: 0 };
  let current = null;
  const onKey = (e) => {
    if ((e.key === 'r' || e.key === 'R') && current?.view.phase === 'place' && !e.target.closest('input, textarea')) {
      dir = dir === 'h' ? 'v' : 'h';
      if (sel !== null) rotatePlaced(sel);
      render(current);
    }
  };
  document.addEventListener('keydown', onKey);

  function rotatePlaced(id) {
    const ship = current.view.own.find((x) => x.id === id);
    if (ship?.x != null) api.act({ type: 'place', ship: id, x: ship.x, y: ship.y, dir: ship.dir === 'h' ? 'v' : 'h' });
  }

  function placement(view, legal) {
    const me = api.me();
    const mine = view.own.filter((x) => x.owner === me);
    const done = view.ready.includes(me);
    const preview = { cells: null, ok: false };
    const boardBox = h('div', { class: 'board-box' });
    const draw = () => {
      const cells = new Map();
      view.own.forEach((ship) => ship.x != null && shipCells(ship).forEach(([x, y]) => cells.set(`${x},${y}`, ship)));
      const svg = grid(view.size, t('games.schiffe.ownBoard'), (x, y, px, py) => {
        const ship = cells.get(`${x},${y}`);
        const inPreview = preview.cells?.some(([a, b]) => a === x && b === y);
        const g = s('g', { class: 'cellbtn', role: 'gridcell', tabindex: done ? -1 : 0, 'aria-label': `${cellName(x, y)}${ship ? `: Schiff (${ship.len})` : ''}`, 'data-x': x, 'data-y': y });
        g.append(water(px, py, inPreview ? (preview.ok ? 'color-mix(in srgb, var(--ok) 45%, transparent)' : 'color-mix(in srgb, var(--danger) 45%, transparent)') : undefined));
        if (!done) {
          g.addEventListener('click', () => tapCell(x, y, ship));
          g.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tapCell(x, y, ship)));
          g.addEventListener('pointerenter', () => hover(x, y));
        }
        return g;
      }, view.own.filter((x) => x.x != null).map((ship) => shipShape(ship, { stroke: ship.id === sel ? 'var(--accent)' : ship.owner === me ? '#c3ccd8' : '#5c6675', 'stroke-width': ship.id === sel ? 4 : 2, 'pointer-events': 'none', opacity: ship.owner === me ? 1 : 0.7 })));
      boardBox.replaceChildren(svg);
      svg.addEventListener('pointerleave', () => { preview.cells = null; draw(); });
      svg.addEventListener('pointerup', (e) => {
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-x]');
        if (dragging !== null && target) drop(Number(target.dataset.x), Number(target.dataset.y));
        dragging = null;
      });
    };
    let dragging = null;
    const hover = (x, y) => {
      if (sel === null) return;
      const ship = mine.find((m) => m.id === sel);
      const trial = { ...ship, x, y, dir };
      preview.cells = shipCells(trial);
      preview.ok = canPlace(view.own, trial, view.size, view.options.touching);
      draw();
    };
    const drop = (x, y) => {
      if (sel === null) return;
      api.act({ type: 'place', ship: sel, x, y, dir }).then((r) => !r?.error && (play('move'), (sel = nextUnplaced(sel))));
    };
    const nextUnplaced = (after) => mine.find((m) => m.x == null && m.id !== after)?.id ?? null;
    const tapCell = (x, y, ship) => {
      if (ship && ship.owner === me) {
        const now = Date.now();
        if (lastTap.id === ship.id && now - lastTap.at < 400) return rotatePlaced(ship.id);
        lastTap = { id: ship.id, at: now };
        sel = ship.id;
        dir = ship.dir;
        return render(current);
      }
      if (sel === null) sel = nextUnplaced(null);
      drop(x, y);
    };
    draw();
    const list = h('div', { class: 'ship-list', role: 'group', 'aria-label': t('games.schiffe.yourShips') }, mine.map((ship) => h('button', {
      type: 'button', class: 'ship-chip', 'aria-pressed': String(sel === ship.id), 'data-placed': String(ship.x != null),
      onClick: () => { sel = ship.id; render(current); },
      onPointerdown: () => { sel = ship.id; dragging = ship.id; },
    }, h('span', { class: 'ship-bar', style: { '--len': ship.len } }), `${ship.len}er`, ship.x != null ? ' ✓' : '')));
    return h('div', { class: 'stack' },
      h('p', { class: 'muted small' }, done ? t('games.schiffe.waitOthers') : t('games.schiffe.placeHint')), list,
      h('div', { class: 'row' }, button(t('games.schiffe.rotate'), { kind: 'small', iconName: 'rotate', disabled: done, onClick: () => { dir = dir === 'h' ? 'v' : 'h'; if (sel !== null) rotatePlaced(sel); render(current); } }),
        h('span', { class: 'tiny' }, dir === 'h' ? t('games.schiffe.horizontal') : t('games.schiffe.vertical')),
        button(t('games.schiffe.random'), { kind: 'small', iconName: 'dice', disabled: done, onClick: () => api.act({ type: 'random' }) }),
        button(t('games.schiffe.ready'), { kind: 'small primary', iconName: 'check', disabled: !legal.some((a) => a.type === 'ready'), onClick: () => api.act({ type: 'ready' }) })),
      boardBox);
  }

  function battle(view, legal, events) {
    const canShoot = new Set(legal.map((a) => `${a.x},${a.y}`));
    const fresh = new Set(events.map((e) => `${e.x},${e.y}`));
    const sunkOutline = (list) => list.map((ship) => shipShape(ship, { fill: 'none', stroke: '#ff7a3d', 'stroke-width': 3, 'pointer-events': 'none' }));
    if (view.mySide === -1) {
      return h('div', { class: 'boards' }, view.boards.map((b, i) => {
        const shots = new Map(b.shots.map((x) => [x.k, x]));
        return h('div', { class: 'stack' }, h('h3', {}, view.sides[i].team ? t(`teams.${view.sides[i].team}`) : `Flotte ${i + 1}`), grid(view.size, `Flotte ${i + 1}`, (x, y, px, py) => {
          const shot = shots.get(`${x},${y}`);
          return s('g', {}, water(px, py), shot ? (shot.hit ? hitMark(px, py, fresh.has(`${x},${y}`)) : missMark(px, py)) : null);
        }, sunkOutline(b.sunk)));
      }));
    }
    const enemyShots = new Map(view.enemyShots.map((x) => [x.k, x]));
    const enemy = grid(view.size, t('games.schiffe.enemyBoard'), (x, y, px, py) => {
      const k = `${x},${y}`;
      const shot = enemyShots.get(k);
      const can = canShoot.has(k);
      const g = s('g', { class: can ? 'cellbtn' : '', role: 'gridcell', tabindex: can ? 0 : -1, 'aria-label': `${cellName(x, y)}: ${shot ? (shot.hit ? (shot.sunk != null ? 'versenkt' : 'Treffer') : 'Wasser') : can ? 'antippen zum Schiessen' : 'unbekannt'}` });
      g.append(water(px, py), shot ? (shot.hit ? hitMark(px, py, fresh.has(k)) : missMark(px, py)) : null);
      if (can) {
        const go = () => api.act({ type: 'shoot', x, y });
        g.addEventListener('click', go);
        g.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go()));
      }
      return g;
    }, [...sunkOutline(view.enemySunk.filter((x) => x.sunk)), ...(view.result ? view.enemySunk.filter((x) => !x.sunk).map((ship) => shipShape(ship, { fill: 'none', stroke: 'var(--text-3)', 'stroke-dasharray': '4 4', 'pointer-events': 'none' })) : [])]);
    const ownShots = new Map(view.ownShots.map((x) => [x.k, x]));
    const own = grid(view.size, t('games.schiffe.ownBoard'), (x, y, px, py) => {
      const shot = ownShots.get(`${x},${y}`);
      return s('g', {}, water(px, py), shot && !shot.hit ? missMark(px, py) : null);
    }, [...view.own.map((ship) => shipShape(ship, { opacity: ship.sunk ? 0.45 : 1, 'pointer-events': 'none' })), ...view.ownShots.filter((x) => x.hit).map((x) => { const [a, b] = x.k.split(',').map(Number); return hitMark(24 + a * C, 24 + b * C, fresh.has(x.k)); })]);
    own.classList.add('small-board');
    return h('div', { class: 'boards' },
      h('div', { class: 'stack' }, h('h3', {}, t('games.schiffe.enemyBoard')), enemy, h('p', { class: 'tiny' }, `${t('games.schiffe.left')}: ${view.enemyLeft.map((l) => `${l}er`).join(', ') || '–'}`, view.options.salvo && legal.length ? ` · ${t('games.schiffe.shots', { n: view.shotsLeft })}` : '')),
      h('div', { class: 'stack' }, h('h3', {}, t('games.schiffe.ownBoard')), own));
  }

  function render(payload) {
    current = payload;
    const { view, legal, events } = payload;
    wrap.replaceChildren(view.phase === 'place' && view.own ? placement(view, legal) : view.phase === 'place' ? h('p', { class: 'muted' }, t('games.schiffe.waitOthers')) : battle(view, legal, events));
    if (events.some((e) => e.type === 'sunk')) play('boom');
    else if (events.some((e) => e.type === 'hit')) play('capture');
    else if (events.some((e) => e.type === 'miss')) play('splash');
  }

  return {
    update: render,
    turnText: (view, payload) => (view.phase === 'place' ? (payload.legal.length ? t('games.schiffe.placeTitle') : t('games.schiffe.waitOthers')) : null),
    log: (view) => view.log.map((e) => `${api.nameOf(e.by)}: ${cellName(e.x, e.y)} – ${e.sunk ? `versenkt (${e.sunk}er)` : e.hit ? 'Treffer' : 'Wasser'}`),
    destroy() {
      document.removeEventListener('keydown', onKey);
      wrap.remove();
    },
  };
}
