// Darstellung Mühle: SVG-Brett in Holzoptik, Antippen zum Setzen, Ziehen und Wegnehmen.
import { ADJ } from '/shared/games/muehle.js';
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { s } from '../ui/dom.js';

const U = 60;
const M = 40;
export const coord = (i) => {
  const r = Math.floor(i / 8);
  const k = i % 8;
  const lo = r;
  const hi = 6 - r;
  const xy = [[lo, lo], [3, lo], [hi, lo], [hi, 3], [hi, hi], [3, hi], [lo, hi], [lo, 3]][k];
  return [M + xy[0] * U, M + xy[1] * U, xy];
};
export const pointName = (i) => {
  const [, , [x, y]] = coord(i);
  return `${'abcdefg'[x]}${7 - y}`;
};
const COLORS = [['#f4ead7', '#b9a57f'], ['#2c2522', '#0f0c0b']];

export function create(root, api) {
  const svg = s('svg', { viewBox: '0 0 440 470', class: 'board-svg', role: 'group', 'aria-label': 'Mühle-Brett' });
  root.append(svg);
  let selected = null;
  let last = null;

  function render(payload) {
    const { view, legal, events } = payload;
    last = payload;
    const sideName = (i) => t(`games.muehle.sides.${i}`);
    svg.replaceChildren();
    const defs = s('defs', {}, s('linearGradient', { id: 'wood', x1: 0, y1: 0, x2: 1, y2: 1 }, s('stop', { offset: '0', 'stop-color': '#d6a467' }), s('stop', { offset: '1', 'stop-color': '#a8723f' })),
      ...COLORS.map(([a, b], i) => s('radialGradient', { id: `stone${i}`, cx: 0.35, cy: 0.3, r: 0.8 }, s('stop', { offset: '0', 'stop-color': a }), s('stop', { offset: '1', 'stop-color': b }))));
    svg.append(defs, s('rect', { x: 4, y: 4, width: 432, height: 432, rx: 26, fill: 'url(#wood)' }));
    for (let g = 0; g < 9; g++) svg.append(s('path', { d: `M14 ${40 + g * 46} q 210 ${g % 2 ? 10 : -10} 412 0`, stroke: '#7a4f25', 'stroke-opacity': 0.18, fill: 'none', 'stroke-width': 3 }));
    const lines = new Set();
    for (let i = 0; i < 24; i++) for (const j of ADJ[i]) lines.add([Math.min(i, j), Math.max(i, j)].join('-'));
    for (const l of lines) {
      const [a, b] = l.split('-').map(Number);
      const [x1, y1] = coord(a);
      const [x2, y2] = coord(b);
      svg.append(s('line', { x1, y1, x2, y2, stroke: '#4a2e14', 'stroke-width': 4, 'stroke-linecap': 'round' }));
    }
    const removeSet = new Set(legal.filter((a) => a.type === 'remove').map((a) => a.at));
    const placeSet = new Set(legal.filter((a) => a.type === 'place').map((a) => a.to));
    const movers = new Set(legal.filter((a) => a.type === 'move').map((a) => a.from));
    if (selected !== null && !movers.has(selected)) selected = null;
    const targets = new Set(legal.filter((a) => a.type === 'move' && a.from === selected).map((a) => a.to));
    const moved = events.find((e) => e.type === 'move');
    for (let i = 0; i < 24; i++) {
      const [x, y] = coord(i);
      const v = view.board[i];
      const actionable = removeSet.has(i) || placeSet.has(i) || movers.has(i) || targets.has(i);
      const label = `${pointName(i)}: ${v === -1 ? 'frei' : sideName(v)}${removeSet.has(i) ? ', wegnehmen' : targets.has(i) ? ', hierhin ziehen' : movers.has(i) ? ', auswählen' : placeSet.has(i) ? ', setzen' : ''}`;
      const g = s('g', { class: actionable ? 'cellbtn' : '', role: actionable ? 'button' : 'img', tabindex: actionable ? 0 : -1, 'aria-label': label });
      g.append(s('circle', { cx: x, cy: y, r: 24, fill: 'transparent' }));
      if (v === -1) g.append(s('circle', { cx: x, cy: y, r: targets.has(i) || placeSet.has(i) ? 9 : 6, fill: targets.has(i) || placeSet.has(i) ? 'var(--accent)' : '#4a2e14', opacity: targets.has(i) || placeSet.has(i) ? 0.9 : 1 }));
      else {
        const stone = s('circle', { cx: x, cy: y, r: 21, fill: `url(#stone${v})`, stroke: selected === i ? 'var(--accent)' : 'rgb(0 0 0 / 0.35)', 'stroke-width': selected === i ? 5 : 2 });
        if (moved && moved.to === i) {
          const [fx, fy] = coord(moved.from);
          stone.classList.add('slide');
          stone.style.setProperty('--dx', `${fx - x}px`);
          stone.style.setProperty('--dy', `${fy - y}px`);
        } else if (events.some((e) => e.type === 'place' && e.to === i)) stone.classList.add('pop');
        g.append(stone);
        if (view.last && view.last.to === i) g.append(s('circle', { cx: x, cy: y, r: 6, fill: v === 0 ? '#a8723f' : '#d6a467' }));
        if (removeSet.has(i)) g.append(s('path', { d: `M${x - 9} ${y - 9}L${x + 9} ${y + 9}M${x + 9} ${y - 9}L${x - 9} ${y + 9}`, stroke: '#ff5d5d', 'stroke-width': 5, 'stroke-linecap': 'round', class: 'pulse' }));
      }
      if (actionable) {
        const go = () => {
          if (removeSet.has(i)) return api.act({ type: 'remove', at: i });
          if (placeSet.has(i)) return api.act({ type: 'place', to: i });
          if (targets.has(i)) {
            const from = selected;
            selected = null;
            return api.act({ type: 'move', from, to: i });
          }
          if (movers.has(i)) {
            selected = selected === i ? null : i;
            play('click');
            render(last);
            svg.querySelector(`[aria-label^="${pointName(i)}:"]`)?.focus();
          }
        };
        g.addEventListener('click', go);
        g.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go()));
      }
      svg.append(g);
    }
    // Vorrat: noch zu setzende Steine
    [0, 1].forEach((side) => {
      const y = 456;
      const x0 = side === 0 ? 20 : 240;
      svg.append(s('text', { x: x0, y: y + 5, fill: 'var(--text-2)', 'font-size': 14, 'font-weight': 700 }, `${sideName(side)}: ${view.inHand[side]}`));
      for (let n = 0; n < view.inHand[side]; n++) svg.append(s('circle', { cx: x0 + 78 + n * 14, cy: y, r: 6, fill: `url(#stone${side})`, stroke: 'rgb(0 0 0 / 0.3)' }));
    });
    if (events.some((e) => e.type === 'remove')) play('capture');
    else if (events.length) play('move');
  }

  return {
    update: render,
    turnText(view, payload) {
      if (!payload.legal.length) return null;
      if (view.pendingRemove) return t('games.muehle.remove');
      if (view.inHand[view.turn] > 0) return t('games.muehle.place', { n: view.inHand[view.turn] });
      return view.fly[view.turn] ? t('games.muehle.fly') : t('games.muehle.move');
    },
    log: (view) => view.log.map((e) => `${t(`games.muehle.sides.${e.side}`)}: ${e.type === 'place' ? `setzt ${pointName(e.to)}` : e.type === 'move' ? `${pointName(e.from)}–${pointName(e.to)}` : `nimmt ${pointName(e.at)}`}`),
    destroy: () => svg.remove(),
  };
}
