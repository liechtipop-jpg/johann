// Darstellung Vier gewinnt: Spalten antippen (oder mit Tastatur wählen), Steine fallen animiert.
import { COLS, ROWS, at } from '/shared/games/viergewinnt.js';
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { s } from '../ui/dom.js';

const color = (view, side) => (view.sides[side]?.team === 'blue' ? 'var(--blue)' : view.sides[side]?.team === 'red' ? 'var(--red)' : side === 0 ? 'var(--red)' : 'var(--blue)');

export function create(root, api) {
  const svg = s('svg', { viewBox: `0 0 ${COLS * 100} ${ROWS * 100 + 70}`, class: 'board-svg c4', role: 'group', 'aria-label': t('games.viergewinnt.board') });
  root.append(svg);
  let focusCol = 3;
  return {
    update({ view, legal, events }) {
      const allowed = new Set(legal.map((a) => a.col));
      const win = new Set(view.win?.line ?? []);
      const top = 70;
      svg.replaceChildren(s('rect', { x: 0, y: top - 10, width: COLS * 100, height: ROWS * 100 + 20, rx: 24, fill: 'var(--c4-frame, #2a4fae)' }));
      for (let c = 0; c < COLS; c++) {
        const g = s('g', { class: allowed.has(c) ? 'cellbtn colbtn' : 'colbtn', role: 'button', tabindex: allowed.has(c) ? 0 : -1, 'aria-disabled': String(!allowed.has(c)), 'aria-label': t('games.viergewinnt.column', { n: c + 1 }) + (allowed.has(c) ? '' : ` (${t('games.viergewinnt.full')})`) });
        g.append(s('rect', { x: c * 100, y: 0, width: 100, height: ROWS * 100 + top, fill: 'transparent' }));
        if (allowed.has(c)) g.append(s('circle', { class: 'ghost', cx: c * 100 + 50, cy: 32, r: 26, fill: color(view, view.turn) }));
        for (let r = 0; r < ROWS; r++) {
          const v = view.board[at(r, c)];
          const cy = top + (ROWS - 1 - r) * 100 + 50;
          g.append(s('circle', { cx: c * 100 + 50, cy, r: 38, fill: 'var(--bg)' }));
          if (v !== null) {
            const fresh = events.some((e) => e.type === 'drop' && e.row === r && e.col === c);
            const disc = s('circle', { cx: c * 100 + 50, cy, r: 36, fill: color(view, v), class: fresh ? 'drop' : null });
            // Startpunkt der Fall-Animation per CSSOM (erlaubt unter der strengen CSP, anders als ein style-Attribut)
            if (fresh) disc.style.setProperty('--from', `${-(cy - 30)}px`);
            g.append(disc);
            if (win.has(at(r, c))) g.append(s('circle', { cx: c * 100 + 50, cy, r: 20, fill: 'none', stroke: '#fff', 'stroke-width': 7, class: 'pop' }));
          }
        }
        if (allowed.has(c)) {
          const go = () => api.act({ type: 'drop', col: c });
          g.addEventListener('click', go);
          g.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') (e.preventDefault(), go());
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              const list = [...allowed].sort((a, b) => a - b);
              const i = list.indexOf(c) + (e.key === 'ArrowRight' ? 1 : -1);
              focusCol = list[(i + list.length) % list.length];
              svg.querySelectorAll('.colbtn')[focusCol]?.focus();
            }
          });
        }
        svg.append(g);
      }
      if (events.some((e) => e.type === 'drop')) play(view.win ? 'win' : 'move');
    },
    log: () => [],
    destroy: () => svg.remove(),
  };
}
