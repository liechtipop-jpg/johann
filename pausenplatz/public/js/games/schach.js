// Darstellung Schach: Antippen oder Ziehen, mögliche Züge als Punkte, Umwandlung mit Auswahl,
// Zugliste, geschlagene Figuren, Uhren, Remis/Aufgabe und PGN kopieren.
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { button, copyText, fmtTime, h, s, sheet } from '../ui/dom.js';
import { FIGURINE, PIECE_NAMES, PIECE_PATHS } from './pieces.js';

const SQ = 56;
const FILES = 'abcdefgh';

function parseFen(fen) {
  const map = new Map();
  fen.split(' ')[0].split('/').forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) c += Number(ch);
      else {
        map.set(`${FILES[c]}${8 - r}`, { type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? 'w' : 'b' });
        c++;
      }
    }
  });
  return map;
}

const pieceSvg = (p, x, y, cls = '') => s('path', { d: PIECE_PATHS[p.type], transform: `translate(${x + 5.5} ${y + 5.5})`, fill: p.color === 'w' ? '#f6f1e6' : '#2a2724', stroke: p.color === 'w' ? '#3b3632' : '#d8d2c6', 'stroke-width': 1.6, 'stroke-linejoin': 'round', class: cls, 'pointer-events': 'none' });

/** PGN aus der Zugliste (Standard-SAN, englische Figurenbuchstaben). */
export function toPgn(view) {
  const result = !view.result ? '*' : view.result.winnerSide === 0 ? '1-0' : view.result.winnerSide === 1 ? '0-1' : '1/2-1/2';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const moves = [];
  for (let i = 0; i < view.san.length; i += 2) moves.push(`${i / 2 + 1}. ${view.san[i]}${view.san[i + 1] ? ` ${view.san[i + 1]}` : ''}`);
  return `[Event "Pausenplatz"]\n[Date "${date}"]\n[Result "${result}"]\n\n${moves.join(' ')} ${result}\n`;
}

export function create(root, api) {
  const box = h('div', { class: 'chess-box' });
  root.append(box);
  let selected = null;
  let current = null;
  let drag = null;

  const figurine = (san, side) => san.replace(/^[KQRBN]/, (m) => FIGURINE[m.toLowerCase()] ?? m).replace(/=([QRBN])/, (_, m) => `=${FIGURINE[m.toLowerCase()]}`) + (side === undefined ? '' : '');

  function tryMove(from, to) {
    const options = current.legal.filter((a) => a.from === from && a.to === to);
    if (!options.length) return false;
    selected = null;
    if (options.some((o) => o.promotion)) {
      const ref = sheet(t('games.schach.promote'), h('div', { class: 'row' }, ['q', 'r', 'b', 'n'].map((p) => button(PIECE_NAMES[p], { kind: 'primary', onClick: () => { ref.close(); api.act({ type: 'move', from, to, promotion: p }); } }))));
      return true;
    }
    api.act({ type: 'move', from, to });
    return true;
  }

  function render(payload) {
    current = payload;
    const { view, legal, events } = payload;
    const pieces = parseFen(view.fen);
    const flip = view.mySide === 1;
    const sq = (name) => {
      const f = FILES.indexOf(name[0]);
      const r = Number(name[1]);
      return flip ? [(7 - f) * SQ, (r - 1) * SQ] : [f * SQ, (8 - r) * SQ];
    };
    const movable = new Set(legal.map((a) => a.from));
    if (selected && !movable.has(selected)) selected = null;
    const targets = new Set(legal.filter((a) => a.from === selected).map((a) => a.to));
    const svg = s('svg', { viewBox: `0 0 ${SQ * 8 + 20} ${SQ * 8 + 20}`, class: 'board-svg chess', role: 'grid', 'aria-label': t('games.schach.board') });
    const g = s('g', { transform: 'translate(10 10)' });
    svg.append(s('rect', { x: 0, y: 0, width: SQ * 8 + 20, height: SQ * 8 + 20, rx: 14, fill: 'var(--surface)' }), g);
    for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
      const name = `${FILES[f]}${r}`;
      const [x, y] = sq(name);
      const light = (f + r) % 2 === 1;
      const p = pieces.get(name);
      const isLast = view.last && (view.last.from === name || view.last.to === name);
      const actionable = movable.has(name) || targets.has(name);
      const label = `${name}: ${p ? `${p.color === 'w' ? 'weisser' : 'schwarzer'} ${PIECE_NAMES[p.type]}` : 'leer'}${targets.has(name) ? ', hierhin ziehen' : movable.has(name) ? ', auswählen' : ''}`;
      const cell = s('g', { class: actionable ? 'cellbtn' : '', role: 'gridcell', tabindex: actionable ? 0 : -1, 'aria-label': label, 'data-sq': name });
      cell.append(s('rect', { x, y, width: SQ, height: SQ, fill: light ? '#e9dfc8' : '#9b7b58' }));
      if (isLast) cell.append(s('rect', { x, y, width: SQ, height: SQ, fill: '#f2d75c', opacity: 0.45 }));
      if (view.checkSquare === name) cell.append(s('circle', { cx: x + SQ / 2, cy: y + SQ / 2, r: SQ / 2 - 3, fill: '#ff4d4d', opacity: 0.55 }));
      if (selected === name) cell.append(s('rect', { x: x + 2, y: y + 2, width: SQ - 4, height: SQ - 4, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 4, rx: 4 }));
      if (p) cell.append(pieceSvg(p, x, y, events.some((e) => e.to === name) ? 'pop' : ''));
      if (targets.has(name)) cell.append(p ? s('circle', { cx: x + SQ / 2, cy: y + SQ / 2, r: SQ / 2 - 4, fill: 'none', stroke: '#1d2a1d', 'stroke-opacity': 0.45, 'stroke-width': 4 }) : s('circle', { cx: x + SQ / 2, cy: y + SQ / 2, r: 8, fill: '#1d2a1d', opacity: 0.4 }));
      if ((flip ? f === 7 : f === 0)) cell.append(s('text', { x: x + 3, y: y + 12, 'font-size': 10, fill: light ? '#9b7b58' : '#e9dfc8', 'font-weight': 700 }, r));
      if ((flip ? r === 8 : r === 1)) cell.append(s('text', { x: x + SQ - 9, y: y + SQ - 4, 'font-size': 10, fill: light ? '#9b7b58' : '#e9dfc8', 'font-weight': 700 }, FILES[f]));
      const go = () => {
        if (targets.has(name)) return tryMove(selected, name);
        if (movable.has(name)) {
          selected = selected === name ? null : name;
          play('click');
          render(current);
          box.querySelector(`[data-sq="${name}"]`)?.focus();
        }
      };
      if (actionable) {
        cell.addEventListener('click', go);
        cell.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go()));
      }
      if (movable.has(name)) cell.addEventListener('pointerdown', (e) => { drag = { from: name, x: e.clientX, y: e.clientY, moved: false }; });
      g.append(cell);
    }
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8 && !drag.moved) {
        drag.moved = true;
        selected = drag.from;
      }
    });
    svg.addEventListener('pointerup', (e) => {
      if (!drag?.moved) return (drag = null);
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-sq]')?.dataset.sq;
      const from = drag.from;
      drag = null;
      if (!target || !tryMove(from, target)) render(current);
    });
    const clock = (side) => {
      if (!view.clock) return null;
      const running = view.clock.running === side;
      const ms = running ? Math.max(0, view.clock.since + view.clock.left[side] - (Date.now() + api.offset())) : view.clock.left[side];
      return h('span', { class: `timer ${running ? '' : 'idle'} ${ms < 20_000 ? 'low' : ''}`, 'data-clock': side }, fmtTime(ms));
    };
    const capturedRow = (side) => h('div', { class: 'captured', 'aria-label': t('games.schach.captured') }, view.captured[side].map((p) => FIGURINE[p] ?? '♙').join(' '), view.material[side] > view.material[1 - side] ? h('b', {}, ` +${view.material[side] - view.material[1 - side]}`) : null);
    const top = flip ? 0 : 1;
    const me = view.mySide;
    const controls = h('div', { class: 'row' });
    if (me !== -1 && !view.result) {
      if (view.drawOffer === 1 - me) controls.append(h('span', { class: 'badge accent' }, t('games.schach.drawOffered')), button(t('games.schach.accept'), { kind: 'small primary', onClick: () => api.act({ type: 'acceptDraw' }) }), button(t('games.schach.decline'), { kind: 'small', onClick: () => api.act({ type: 'declineDraw' }) }));
      else controls.append(button(view.drawOffer === me ? t('games.schach.drawPending') : t('games.schach.offerDraw'), { kind: 'small', iconName: 'handshake', disabled: view.drawOffer === me || view.drawVotes[me].includes(api.me()), onClick: () => api.act({ type: 'offerDraw' }) }));
      controls.append(button(view.resignVotes[me].includes(api.me()) ? t('games.schach.resignVoted') : t('games.schach.resign'), { kind: 'small danger', iconName: 'flag', disabled: view.resignVotes[me].includes(api.me()), onClick: () => api.act({ type: 'resign' }) }));
    }
    controls.append(button(t('games.schach.pgn'), { kind: 'small ghost', iconName: 'copy', onClick: () => copyText(toPgn(view)) }));
    box.replaceChildren(h('div', { class: 'row chess-meta' }, h('span', { class: 'tiny' }, t(`games.schach.colors.${top}`)), capturedRow(top), clock(top)), svg, h('div', { class: 'row chess-meta' }, h('span', { class: 'tiny' }, t(`games.schach.colors.${1 - top}`)), capturedRow(1 - top), clock(1 - top)), controls);
    if (events.some((e) => e.check)) play('turn');
    else if (events.some((e) => e.capture)) play('capture');
    else if (events.some((e) => e.type === 'move')) play('move');
  }

  const clockTimer = setInterval(() => {
    if (!current?.view.clock || current.view.result) return;
    const side = current.view.clock.running;
    const el = box.querySelector(`[data-clock="${side}"]`);
    if (el) {
      const ms = Math.max(0, current.view.clock.since + current.view.clock.left[side] - (Date.now() + api.offset()));
      el.textContent = fmtTime(ms);
      el.classList.toggle('low', ms < 20_000);
    }
  }, 250);

  return {
    update: render,
    log: (view) => {
      const out = [];
      for (let i = 0; i < view.san.length; i += 2) out.push(`${i / 2 + 1}. ${figurine(view.san[i])}${view.san[i + 1] ? `  ${figurine(view.san[i + 1])}` : ''}`);
      return out;
    },
    destroy() {
      clearInterval(clockTimer);
      box.remove();
    },
  };
}
