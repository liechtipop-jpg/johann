// Darstellung Ultimate Tic-Tac-Toe: grosses Feld aus neun kleinen; erlaubte kleine Felder leuchten.
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { s } from '../ui/dom.js';

const color = (view, side) => (view.sides[side]?.team === 'blue' ? 'var(--blue)' : view.sides[side]?.team === 'red' ? 'var(--red)' : side === 0 ? 'var(--red)' : 'var(--blue)');

function mark(view, side, cx, cy, r, w, cls = '') {
  if (side === 0) return s('path', { d: `M${cx - r} ${cy - r}L${cx + r} ${cy + r}M${cx + r} ${cy - r}L${cx - r} ${cy + r}`, stroke: color(view, 0), 'stroke-width': w, 'stroke-linecap': 'round', class: cls });
  return s('circle', { cx, cy, r: r * 1.05, fill: 'none', stroke: color(view, 1), 'stroke-width': w, class: cls });
}

export function create(root, api) {
  const svg = s('svg', { viewBox: '0 0 930 930', class: 'board-svg uttt', role: 'grid', 'aria-label': t('games.ultimate.board') });
  root.append(svg);
  return {
    update({ view, legal, events }) {
      const allowed = new Set(legal.map((a) => a.board * 9 + a.cell));
      const open = new Set(view.open);
      svg.replaceChildren();
      for (let b = 0; b < 9; b++) {
        const ox = (b % 3) * 310 + 5;
        const oy = Math.floor(b / 3) * 310 + 5;
        const active = open.has(b) && legal.length > 0;
        svg.append(s('rect', { x: ox, y: oy, width: 300, height: 300, rx: 22, fill: active ? 'var(--accent-soft)' : 'var(--surface)', stroke: active ? 'var(--accent)' : 'var(--line)', 'stroke-width': active ? 5 : 2 }));
        for (const x of [100, 200]) {
          svg.append(s('line', { x1: ox + x, y1: oy + 16, x2: ox + x, y2: oy + 284, stroke: 'var(--line-2)', 'stroke-width': 4, 'stroke-linecap': 'round' }));
          svg.append(s('line', { x1: ox + 16, y1: oy + x, x2: ox + 284, y2: oy + x, stroke: 'var(--line-2)', 'stroke-width': 4, 'stroke-linecap': 'round' }));
        }
        for (let c = 0; c < 9; c++) {
          const i = b * 9 + c;
          const cx = ox + (c % 3) * 100 + 50;
          const cy = oy + Math.floor(c / 3) * 100 + 50;
          const v = view.cells[i];
          const can = allowed.has(i);
          const g = s('g', { class: can ? 'cellbtn' : '', role: 'gridcell', tabindex: can ? 0 : -1, 'aria-label': t('games.ultimate.cell', { b: b + 1, c: c + 1 }) + ': ' + (v === 0 ? '✕' : v === 1 ? '◯' : can ? t('games.ultimate.free') : '–') });
          g.append(s('rect', { x: cx - 46, y: cy - 46, width: 92, height: 92, rx: 12, fill: 'transparent' }));
          if (v !== null) g.append(mark(view, v, cx, cy, 24, 11, view.last?.board === b && view.last?.cell === c ? 'pop' : ''));
          if (can) {
            const go = () => api.act({ type: 'play', board: b, cell: c });
            g.addEventListener('click', go);
            g.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go()));
          }
          svg.append(g);
        }
        if (view.small[b] === 0 || view.small[b] === 1) {
          svg.append(s('rect', { x: ox, y: oy, width: 300, height: 300, rx: 22, fill: 'var(--bg)', opacity: 0.72 }));
          svg.append(mark(view, view.small[b], ox + 150, oy + 150, 95, 26, events.some((e) => e.type === 'board' && e.board === b) ? 'pop' : ''));
        } else if (view.small[b] === 'draw') svg.append(s('rect', { x: ox, y: oy, width: 300, height: 300, rx: 22, fill: 'var(--bg)', opacity: 0.55 }));
      }
      if (view.win) {
        const p = (b) => [(b % 3) * 310 + 155, Math.floor(b / 3) * 310 + 155];
        const [x1, y1] = p(view.win.line[0]);
        const [x2, y2] = p(view.win.line[2]);
        svg.append(s('line', { x1, y1, x2, y2, stroke: 'var(--text)', 'stroke-width': 16, 'stroke-linecap': 'round', opacity: 0.85, class: 'pop' }));
      }
      if (events.some((e) => e.type === 'board')) play('win');
      else if (events.length) play('move');
    },
    turnText: (view, payload) => (payload.legal.length ? (view.open.length === 1 ? t('games.ultimate.forced', { n: view.open[0] + 1 }) : t('games.ultimate.anywhere')) : null),
    log: () => [],
    destroy: () => svg.remove(),
  };
}
