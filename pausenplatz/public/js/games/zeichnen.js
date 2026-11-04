// Darstellung Zeichnen & Raten: Live-Zeichenfläche (Teilstriche alle 80 ms), Wortwahl, Buchstabentipps, Rate-Feld.
// Eingabefelder bleiben erhalten, damit Tippen nicht unterbrochen wird, wenn andere raten.
import { CHUNK, COLORS } from '/shared/games/zeichnen.js';
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { drawStrokes } from '../ui/canvas.js';
import { avatar, button, h, toast } from '../ui/dom.js';

const BG = '#1b2030';

export function create(root, api) {
  const head = h('div', { class: 'stack' });
  const canvas = h('canvas', { class: 'pad', width: 800, height: 600, role: 'img', 'aria-label': t('canvas.label') });
  const ctx = canvas.getContext('2d');
  const tools = h('div', { class: 'row pad-tools' });
  const guessInput = h('input', { class: 'input', maxlength: 40, autocomplete: 'off', placeholder: t('games.zeichnen.guessPh'), 'aria-label': t('games.zeichnen.guessPh') });
  const sendGuess = () => {
    const text = guessInput.value.trim();
    if (!text) return;
    guessInput.value = '';
    api.act({ type: 'guess', text });
  };
  guessInput.addEventListener('keydown', (e) => e.key === 'Enter' && sendGuess());
  const guessForm = h('div', { class: 'chat-form' }, guessInput, button(t('games.zeichnen.guess'), { kind: 'primary', onClick: sendGuess }));
  const feed = h('div', { class: 'guess-list', 'aria-live': 'polite' });
  const board = h('div', { class: 'scoreboard' });
  const wrap = h('div', { class: 'party zeichnen' }, head, h('div', { class: 'stack pad-wrap' }, canvas, tools), guessForm, feed, board);
  root.append(wrap);

  let strokes = [];
  let current = null;
  let lastSid = 0;
  let canDraw = false;
  let color = COLORS[0];
  let width = 8;
  let flushTimer = null;
  let toolsBuiltFor = null;

  const redraw = () => drawStrokes(ctx, strokes, canvas.width, canvas.height, BG);
  // Während des Zeichnens geht alle 80 ms ein Teilstück raus; am Strichende der ganze Rest.
  const flush = (st = current) => {
    flushTimer = null;
    while (st?.pending.length) {
      const points = st.pending.splice(0, CHUNK);
      api.act({ type: 'draw', sid: st.sid, points, color: st.color, width: st.width });
      if (st === current) break;
    }
    if (current?.pending.length) flushTimer = setTimeout(flush, 80);
  };
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 1000, ((e.clientY - r.top) / r.height) * 1000].map((v) => Math.round(Math.min(1000, Math.max(0, v))));
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!canDraw) return;
    canvas.setPointerCapture(e.pointerId);
    lastSid = Math.max(lastSid, strokes.at(-1)?.sid ?? 0) + 1;
    current = { sid: lastSid, color, width, points: [point(e)] };
    current.pending = [current.points[0]];
    strokes.push(current);
    redraw();
    flushTimer ??= setTimeout(flush, 80);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!current) return;
    const p = point(e);
    const q = current.points.at(-1);
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 4) return;
    current.points.push(p);
    current.pending.push(p);
    redraw();
    flushTimer ??= setTimeout(flush, 80);
  });
  const end = () => {
    if (!current) return;
    clearTimeout(flushTimer);
    const st = current;
    current = null;
    flush(st);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  function buildTools() {
    tools.replaceChildren(
      ...COLORS.filter((c) => c !== 'erase').map((c) => h('button', { type: 'button', class: 'swatch', style: { '--c': c }, 'aria-label': `${t('canvas.color')} ${c}`, 'aria-pressed': String(color === c), onClick: (e) => { color = c; tools.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } })),
      h('select', { class: 'input small', 'aria-label': t('canvas.width'), onChange: (e) => (width = Number(e.target.value)) }, [[4, t('canvas.thin')], [8, t('canvas.medium')], [16, t('canvas.thick')]].map(([v, l]) => h('option', { value: v, selected: v === width }, l))),
      button(t('canvas.eraser'), { kind: 'small', iconName: 'eraser', onClick: () => (color = 'erase') }),
      button(t('canvas.undo'), { kind: 'small', iconName: 'undo', onClick: () => api.act({ type: 'undo' }) }),
      button(t('games.zeichnen.clear'), { kind: 'small', onClick: () => api.act({ type: 'clear' }) }),
    );
  }

  return {
    update({ view, legal, events }) {
      const me = api.me();
      const name = api.nameOf;
      const drawer = view.drawer === me;
      canDraw = drawer && legal.some((a) => a.type === 'draw');
      // Striche übernehmen; ein laufender eigener Strich bleibt erhalten
      strokes = view.strokes.map((st) => (current && st.sid === current.sid ? current : { ...st, points: [...st.points] }));
      if (current && !strokes.includes(current)) strokes.push(current);
      redraw();
      canvas.classList.toggle('drawable', canDraw);
      const key = `${view.turn}-${drawer}`;
      if (drawer && view.phase === 'draw' && toolsBuiltFor !== key) {
        buildTools();
        toolsBuiltFor = key;
      }
      tools.hidden = !(drawer && view.phase === 'draw');
      guessForm.hidden = !legal.some((a) => a.type === 'guess');

      const parts = [h('p', { class: 'muted small' }, `${t('games.zeichnen.turnN', { n: Math.min(view.turn + 1, view.total), total: view.total })} · ${t('games.zeichnen.drawer', { name: name(view.drawer) })}`)];
      if (view.teamScores) parts.push(h('p', { class: 'badge' }, `${t('teams.red')} ${view.teamScores.red} : ${view.teamScores.blue} ${t('teams.blue')}`));
      if (view.phase === 'choose') {
        if (view.choices) parts.push(h('h2', {}, t('games.zeichnen.choose')), h('div', { class: 'row' }, view.choices.map((w, i) => button(w, { kind: i === 0 ? 'primary' : '', onClick: () => api.act({ type: 'choose', word: w }) }))));
        else parts.push(h('h2', {}, t('games.zeichnen.waitChoose', { name: name(view.drawer) })));
      } else if (view.word && (drawer || view.phase === 'reveal' || view.correct.includes(me))) {
        parts.push(h('h2', { 'aria-live': 'polite' }, view.phase === 'reveal' ? t('games.zeichnen.was', { word: view.word }) : drawer ? t('games.zeichnen.draw', { word: view.word }) : t('games.zeichnen.gotIt', { word: view.word })));
      } else if (view.pattern) {
        parts.push(h('div', { class: 'word-row', 'aria-label': t('games.zeichnen.pattern', { n: view.pattern.filter((c) => c === null || /\p{L}/u.test(c)).length }) }, view.pattern.map((ch) => h('span', { class: `wl ${ch === ' ' ? 'space' : ''}` }, ch ?? ''))));
        if (!view.guessers.includes(me) && view.phase === 'draw') parts.push(h('p', { class: 'muted small' }, t('games.zeichnen.otherTeam')));
      }
      head.replaceChildren(...parts);
      feed.replaceChildren(...view.guesses.slice(-30).reverse().map((g) => h('div', { class: `prow ${g.correct ? 'turn-now' : ''}` }, h('span', { class: 'grow' }, g.correct ? t('games.zeichnen.correct', { name: name(g.by) }) : `${name(g.by)}: ${g.text}`), g.correct ? h('span', { class: 'state-ok' }, '✓') : null)));
      board.replaceChildren(...api.people().map((p) => h('div', { class: `prow ${view.turnIds.includes(p.id) ? 'turn-now' : ''}` }, avatar(p), h('span', { class: 'grow' }, p.name, p.id === view.drawer ? ' ✏️' : ''), h('b', {}, String(view.scores[p.id] ?? 0)))));
      if (events.some((e) => e.type === 'close')) toast(t('games.zeichnen.close'));
      if (events.some((e) => e.type === 'correct')) play(events.some((e) => e.type === 'correct' && e.by === me) ? 'win' : 'move');
    },
    onLight(events) {
      for (const e of events) {
        if (e.type !== 'draw') continue;
        const st = strokes.find((x) => x.sid === e.sid);
        if (st) st.points.push(...e.points);
        else strokes.push({ sid: e.sid, color: e.color, width: e.width, points: [...e.points] });
      }
      redraw();
    },
    turnText: (view, payload) => (payload.legal.some((a) => a.type === 'guess') ? t('games.zeichnen.guessNow') : payload.legal.some((a) => a.type === 'draw') ? t('games.zeichnen.drawNow') : payload.legal.length ? t('game.yourTurn') : null),
    log: (view) => view.log.map((l) => `${api.nameOf(l.drawer)}: ${l.word} – ${l.solvedBy.length}×`),
    resultExtra: ({ view }) => h('p', { class: 'muted' }, Object.entries(view.scores).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${api.nameOf(id)} ${n}`).join(' · ')),
    destroy() {
      clearTimeout(flushTimer);
      wrap.remove();
    },
  };
}
