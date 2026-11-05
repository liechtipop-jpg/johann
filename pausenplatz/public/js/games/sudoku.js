// Darstellung Sudoku: Gitter mit dick umrandeten Blöcken, Zahlenfeld, Notizen, Tipps (allein) und der Fortschritt der anderen Seiten.
// Die Zellen werden einmal gebaut und danach nur aktualisiert – Auswahl und Fokus bleiben so erhalten.
import { geometry } from '/shared/games/sudoku.js';
import { t } from '../i18n/index.js';
import { buzz, play } from '../sound.js';
import { button, h } from '../ui/dom.js';

/** Vergangene Zeit als m:ss (abgerundet, anders als die Countdown-Anzeige). */
export function clock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function create(root, api) {
  const box = h('div', { class: 'sudoku' });
  root.append(box);
  const st = { view: null, legal: [], sel: null, digit: null, notes: false, flash: null, flashTimer: null, cells: [], keys: [], n: 0, geo: null };
  const timeEl = h('span', { class: 'sd-time', role: 'timer', 'aria-label': t('games.sudoku.time') });
  const mistakesEl = h('span', { class: 'sd-mist' });
  const levelEl = h('span', { class: 'badge' });
  const race = h('div', { class: 'sd-race' });
  const gridEl = h('div', { class: 'sd-grid', role: 'grid', 'aria-label': t('games.sudoku.grid') });
  const msg = h('p', { class: 'sd-msg', 'aria-live': 'polite' });
  const pad = h('div', { class: 'sd-pad', role: 'group', 'aria-label': t('games.sudoku.pad') });
  const notesBtn = button(t('games.sudoku.notes'), { kind: 'small', iconName: 'pencil', 'aria-pressed': 'false', onClick: () => toggleNotes() });
  const eraseBtn = button(t('games.sudoku.erase'), { kind: 'small', iconName: 'eraser', 'aria-label': t('games.sudoku.eraseLong'), onClick: () => erase() });
  const hintLabel = h('span', {});
  const hintBtn = button(hintLabel, { kind: 'small', iconName: 'eye', onClick: () => hint() });
  const tools = h('div', { class: 'sd-tools' }, notesBtn, eraseBtn, hintBtn);
  box.append(h('div', { class: 'sd-info' }, timeEl, mistakesEl, levelEl), race, gridEl, msg, pad, tools);

  const canAct = () => st.legal.some((a) => a.type === 'set');
  const mySide = () => st.view?.sides[st.view.mySide] ?? null;
  const sideName = (s) => {
    const names = s.members.map(api.nameOf).join(' & ');
    return s.members.length > 1 && s.team ? `${t('games.sudoku.team', { team: t(`teams.${s.team}`) })}: ${names}` : names;
  };

  function build(view) {
    st.n = view.n;
    st.geo = geometry(view.n, view.br, view.bc);
    gridEl.style.setProperty('--n', view.n);
    gridEl.style.setProperty('--bc', view.bc);
    pad.style.setProperty('--n', view.n);
    st.cells = [];
    const rows = [];
    for (let r = 0; r < view.n; r++) {
      const row = h('div', { class: 'sd-row', role: 'row' });
      for (let c = 0; c < view.n; c++) {
        const i = r * view.n + c;
        const cell = h('button', { type: 'button', class: 'sd-cell', role: 'gridcell', tabindex: '-1', onClick: () => select(i) });
        st.cells.push(cell);
        row.append(cell);
      }
      rows.push(row);
    }
    // Dicke Blocklinien als Ebene darüber – so gibt es keine Kerben, wo dünne und dicke Linien sich treffen.
    const lines = h('div', { class: 'sd-lines', 'aria-hidden': 'true' });
    const line = (kind, at) => {
      const el = h('i', { class: kind });
      el.style.setProperty('--at', `${(100 * at) / view.n}%`);
      lines.append(el);
    };
    for (let c = view.bc; c < view.n; c += view.bc) line('v', c);
    for (let r = view.br; r < view.n; r += view.br) line('h', r);
    gridEl.replaceChildren(...rows, lines);
    st.keys = Array.from({ length: view.n }, (_, k) => h('button', { type: 'button', class: 'sd-key', onClick: () => digit(k + 1) }, h('b', {}, String(k + 1)), h('small', {})));
    pad.replaceChildren(...st.keys);
  }

  function select(i, focus = false) {
    st.sel = i;
    st.digit = null;
    paint();
    if (focus) st.cells[i]?.focus();
  }

  function digit(d, asNote = st.notes) {
    const v = st.view;
    if (!v) return;
    // Volles oder kein Feld gewählt: Die Zahl im ganzen Gitter hervorheben (hilft beim Suchen).
    if (st.sel === null || v.grid[st.sel] || !canAct()) {
      st.digit = st.digit === d ? null : d;
      paint();
      return;
    }
    api.act({ type: asNote ? 'note' : 'set', cell: st.sel, value: d });
  }

  function erase() {
    const v = st.view;
    if (v && st.sel !== null && !v.grid[st.sel] && v.notes?.[st.sel] && canAct()) api.act({ type: 'erase', cell: st.sel });
  }

  function hint() {
    const v = st.view;
    if (!v || !st.legal.some((a) => a.type === 'hint')) return;
    api.act(st.sel !== null && !v.grid[st.sel] ? { type: 'hint', cell: st.sel } : { type: 'hint' });
  }

  function toggleNotes() {
    st.notes = !st.notes;
    paint();
  }

  function cellLabel(v, i, shown, notes) {
    const r = Math.floor(i / v.n) + 1;
    const c = (i % v.n) + 1;
    let text = t('games.sudoku.cell', { r, c });
    if (st.flash?.cell === i) text += `: ${t('games.sudoku.wrongCell', { value: st.flash.value })}`;
    else if (shown) text += `: ${shown}${v.givens[i] ? ` (${t('games.sudoku.given')})` : ''}`;
    else if (notes) text += `: ${t('games.sudoku.notesOf', { list: [...Array(v.n).keys()].map((k) => k + 1).filter((d) => notes & (1 << d)).join(' ') })}`;
    else text += `: ${t('games.sudoku.empty')}`;
    return text;
  }

  function paint() {
    const v = st.view;
    if (!v) return;
    const selValue = st.sel !== null ? v.grid[st.sel] : 0;
    const mark = st.digit ?? selValue;
    const peers = new Set(st.sel !== null ? st.geo.peers[st.sel] : []);
    const focusAt = st.sel ?? 0;
    v.grid.forEach((value, i) => {
      const cell = st.cells[i];
      const flash = st.flash?.cell === i ? st.flash : null;
      const shown = value || (v.solution ? v.solution[i] : 0);
      const notes = !shown && !flash && v.notes ? v.notes[i] : 0;
      cell.className = 'sd-cell';
      if (v.givens[i]) cell.classList.add('given');
      else if (value) cell.classList.add('mine');
      else if (shown) cell.classList.add('reveal');
      if (st.sel === i) cell.classList.add('sel');
      else if (peers.has(i)) cell.classList.add('peer');
      if (mark && shown === mark && !flash) cell.classList.add('same');
      if (flash) cell.classList.add('wrong');
      cell.tabIndex = focusAt === i ? 0 : -1;
      cell.setAttribute('aria-selected', String(st.sel === i));
      cell.setAttribute('aria-label', cellLabel(v, i, shown, notes));
      if (flash) cell.replaceChildren(String(flash.value));
      else if (shown) cell.replaceChildren(String(shown));
      else if (notes) cell.replaceChildren(h('span', { class: 'sd-notes', 'aria-hidden': 'true' }, Array.from({ length: v.n }, (_, k) => h('i', {}, notes & (1 << (k + 1)) ? String(k + 1) : ''))));
      else cell.replaceChildren();
    });
    const counts = Array(v.n + 1).fill(0);
    for (const value of v.grid) counts[value]++;
    const active = canAct();
    st.keys.forEach((key, k) => {
      const left = v.n - counts[k + 1];
      key.disabled = left <= 0;
      key.classList.toggle('marked', mark === k + 1);
      key.lastChild.textContent = left > 0 ? String(left) : '✓';
      key.setAttribute('aria-label', `${t('games.sudoku.digit', { d: k + 1 })}, ${t('games.sudoku.left', { n: left })}`);
    });
    pad.classList.toggle('notes', st.notes);
    pad.hidden = !active;
    tools.hidden = !active;
    notesBtn.setAttribute('aria-pressed', String(st.notes));
    eraseBtn.disabled = !(st.sel !== null && !v.grid[st.sel] && v.notes?.[st.sel]);
    hintBtn.hidden = !v.solo;
    hintBtn.disabled = !st.legal.some((a) => a.type === 'hint');
    hintLabel.textContent = t('games.sudoku.hint', { n: v.hintsLeft });
  }

  function drawInfo() {
    const v = st.view;
    const me = mySide();
    mistakesEl.textContent = me ? t('games.sudoku.mistakes', { n: me.mistakes, max: v.mistakesMax }) : '';
    mistakesEl.classList.toggle('warn', Boolean(me) && me.mistakes >= v.mistakesMax - 1);
    levelEl.textContent = `${t(`games.sudoku.values.difficulty.${v.difficulty}`)} · ${v.n}×${v.n}`;
    // Eigene Seite zuerst, dann die anderen in fester Reihenfolge
    const order = v.sides.map((s, i) => ({ s, i })).sort((a, b) => Number(b.i === v.mySide) - Number(a.i === v.mySide));
    race.replaceChildren(...(v.solo ? [] : order.map(({ s, i }) => {
      const fill = h('i', {});
      fill.style.setProperty('--p', `${Math.round((100 * s.filled) / v.toFill)}%`);
      const status = s.done ? `✓ ${t('games.sudoku.done')}` : s.out ? `✗ ${t('games.sudoku.outShort')}` : t('games.sudoku.progress', { filled: s.filled, total: v.toFill });
      return h('div', { class: `sd-side${s.team ? ` ${s.team}` : ''}${i === v.mySide ? ' me' : ''}${s.out ? ' out' : ''}${s.done ? ' done' : ''}` },
        h('span', { class: 'sd-name' }, sideName(s), i === v.mySide ? ` (${t('games.sudoku.you')})` : ''),
        h('span', { class: 'sd-count' }, `${status} · ${t('games.sudoku.mistakes', { n: s.mistakes, max: v.mistakesMax })}`),
        h('span', { class: 'sd-bar', 'aria-hidden': 'true' }, fill));
    })));
    msg.textContent = v.solution ? '' : v.mySide < 0 ? t('games.sudoku.watch') : me?.out ? t('games.sudoku.out') : '';
    tickClock();
  }

  function tickClock() {
    const v = st.view;
    if (!v) return;
    timeEl.textContent = `⏱ ${clock((v.endedAt ?? Date.now() + api.offset()) - v.startedAt)}`;
  }
  const clockTimer = setInterval(tickClock, 500);

  const onKey = (e) => {
    if (!st.view || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || document.querySelector('dialog[open], .overlay')) return;
    const n = st.view.n;
    const code = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
    const d = code ? Number(code[1]) : /^\d$/.test(e.key) ? Number(e.key) : 0;
    if (d >= 1 && d <= n) {
      e.preventDefault();
      digit(d, e.shiftKey || st.notes);
      return;
    }
    const inGame = box.contains(document.activeElement) || document.activeElement === document.body;
    const move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (move && inGame) {
      e.preventDefault();
      const cur = st.sel ?? 0;
      const r = (Math.floor(cur / n) + move[0] + n) % n;
      const c = ((cur % n) + move[1] + n) % n;
      select(st.sel === null ? 0 : r * n + c, true);
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && inGame) {
      e.preventDefault();
      erase();
    } else if (e.key === 'n' || e.key === 'N') toggleNotes();
  };
  document.addEventListener('keydown', onKey);

  return {
    update({ view, legal, events }) {
      const fresh = !st.view || st.view.startedAt !== view.startedAt;
      if (!st.view || st.n !== view.n || fresh) {
        if (st.n !== view.n || !st.cells.length) build(view);
        st.sel = null;
        st.digit = null;
        st.flash = null;
      }
      st.view = view;
      st.legal = legal;
      const me = api.me();
      let sound = null;
      // Lokal kommen alle Ereignisse an – nur die eigenen zählen (wie online, wo der Server filtert).
      for (const e of events.filter((x) => (!x.onlyFor || x.onlyFor.includes(me)) && !x.notFor?.includes(me))) {
        if (e.type === 'wrong') {
          st.flash = { cell: e.cell, value: e.value };
          clearTimeout(st.flashTimer);
          st.flashTimer = setTimeout(() => {
            st.flash = null;
            paint();
          }, 900);
          sound = 'capture';
          if (e.by === me) buzz();
        } else if ((e.type === 'placed' || e.type === 'hint') && !sound) sound = e.by === me ? 'move' : 'click';
        else if ((e.type === 'finished' || e.type === 'out') && e.side !== view.mySide && !sound) sound = 'turn';
      }
      if (sound) play(sound);
      drawInfo();
      paint();
    },
    turnText: (view, payload) => {
      if (payload.result.over) return null;
      if (view.mySide < 0) return t('games.sudoku.watch');
      if (view.sides[view.mySide].out) return t('games.sudoku.outShort');
      return view.solo ? t('games.sudoku.solo') : t('games.sudoku.race');
    },
    log: (view) => view.sides.flatMap((s) => (s.done ? [t('games.sudoku.finished', { name: sideName(s) })] : s.out ? [t('games.sudoku.outLog', { name: sideName(s) })] : [])),
    resultExtra: ({ view: v }) => {
      if (v.solo) {
        const s = v.sides[0];
        return h('p', { class: 'muted' }, [t('games.sudoku.resultTime', { time: clock((v.endedAt ?? Date.now()) - v.startedAt) }), t('games.sudoku.mistakes', { n: s.mistakes, max: v.mistakesMax }), s.hints ? t('games.sudoku.resultHints', { n: s.hints }) : null].filter(Boolean).join(' · '));
      }
      const order = v.sides.map((s, i) => ({ s, i })).sort((a, b) => Number(b.i === v.winner) - Number(a.i === v.winner) || b.s.filled - a.s.filled || a.s.mistakes - b.s.mistakes);
      return h('ol', { class: 'sd-ranking' }, order.map(({ s }) => h('li', {}, h('b', {}, sideName(s)), ' – ', s.done
        ? t('games.sudoku.resultLine', { time: clock(s.finishedAt - v.startedAt), mistakes: s.mistakes })
        : t('games.sudoku.resultProgress', { filled: s.filled, total: v.toFill, mistakes: s.mistakes }))));
    },
    destroy() {
      clearInterval(clockTimer);
      clearTimeout(st.flashTimer);
      document.removeEventListener('keydown', onKey);
      box.remove();
    },
  };
}
