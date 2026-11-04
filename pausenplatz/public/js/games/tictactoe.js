// Darstellung Tic-Tac-Toe (SVG, per Tippen oder Tastatur).
import { s } from '../ui/dom.js';
import { play } from '../sound.js';

export function create(root, api) {
  const svg = s('svg', { viewBox: '0 0 300 300', class: 'board-svg', role: 'grid', 'aria-label': 'Spielfeld' });
  root.append(svg);
  return {
    update({ view, legal, events }) {
      const allowed = new Set(legal.map((a) => a.cell));
      svg.replaceChildren(s('rect', { x: 0, y: 0, width: 300, height: 300, rx: 22, fill: 'var(--surface)' }));
      for (const x of [100, 200]) {
        svg.append(s('line', { x1: x, y1: 18, x2: x, y2: 282, stroke: 'var(--line-2)', 'stroke-width': 6, 'stroke-linecap': 'round' }));
        svg.append(s('line', { x1: 18, y1: x, x2: 282, y2: x, stroke: 'var(--line-2)', 'stroke-width': 6, 'stroke-linecap': 'round' }));
      }
      view.board.forEach((mark, i) => {
        const cx = (i % 3) * 100 + 50;
        const cy = Math.floor(i / 3) * 100 + 50;
        const fresh = events.some((e) => e.cell === i);
        const label = mark === 0 ? 'Kreuz' : mark === 1 ? 'Kreis' : allowed.has(i) ? 'frei, antippen zum Setzen' : 'frei';
        const g = s('g', { class: allowed.has(i) ? 'cellbtn' : '', role: 'gridcell', tabindex: allowed.has(i) ? 0 : -1, 'aria-label': `Feld ${i + 1}: ${label}` });
        g.append(s('rect', { x: cx - 46, y: cy - 46, width: 92, height: 92, rx: 14, fill: 'transparent' }));
        if (mark === 0) g.append(s('path', { d: `M${cx - 26} ${cy - 26}L${cx + 26} ${cy + 26}M${cx + 26} ${cy - 26}L${cx - 26} ${cy + 26}`, stroke: 'var(--red)', 'stroke-width': 12, 'stroke-linecap': 'round', class: fresh ? 'pop' : '' }));
        if (mark === 1) g.append(s('circle', { cx, cy, r: 27, fill: 'none', stroke: 'var(--blue)', 'stroke-width': 12, class: fresh ? 'pop' : '' }));
        if (allowed.has(i)) {
          const go = () => api.act({ type: 'place', cell: i });
          g.addEventListener('click', go);
          g.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go()));
        }
        svg.append(g);
      });
      if (view.win) {
        const [a, , c] = view.win.line;
        const p = (i) => [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50];
        const [x1, y1] = p(a);
        const [x2, y2] = p(c);
        svg.append(s('line', { x1, y1, x2, y2, stroke: 'var(--text)', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.85, class: 'pop' }));
      }
      if (events.length) play('move');
    },
    log: (view) => [],
    sideLabel: (side) => (side === 0 ? '✕ Kreuz' : '◯ Kreis'),
    destroy() {
      svg.remove();
    },
  };
}
