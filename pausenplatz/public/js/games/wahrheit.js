// Darstellung Wahrheit oder Tat: animierte Flasche, Karte, Antwort oder Zeichnung, Abstimmung, Punkte.
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { avatar, button, h } from '../ui/dom.js';
import { drawingPad } from '../ui/canvas.js';

export function create(root, api) {
  const box = h('div', { class: 'party' });
  root.append(box);
  let pad = null;
  let padKey = null;
  let bottleAngle = 0;

  function render({ view, legal, events }) {
    const me = api.me();
    const people = api.people();
    const name = (id) => api.nameOf(id);
    const has = (type) => legal.some((a) => a.type === type);
    const isMe = view.current === me;
    if (events.some((e) => e.type === 'spin') || (view.phase === 'spin' && padKey !== `spin-${view.round}`)) {
      const idx = Math.max(0, people.findIndex((p) => p.id === view.current));
      bottleAngle += 720 + (idx / Math.max(1, people.length)) * 360 - (bottleAngle % 360);
    }
    const circle = h('div', { class: 'bottle-circle', 'aria-hidden': 'true' },
      people.map((p, i) => h('span', { class: `bc-seat ${p.id === view.current && view.phase !== 'spin' ? 'on' : ''}`, style: { '--a': `${(i / people.length) * 360}deg` } }, avatar(p))),
      h('span', { class: 'bottle', style: { '--r': `${bottleAngle}deg` } }));
    const top = h('div', { class: 'party-top' }, circle,
      h('div', { class: 'stack' }, h('p', { class: 'muted small' }, t('games.wahrheit.round', { n: Math.min(view.round, view.total), total: view.total })),
        h('h2', { 'aria-live': 'polite' }, view.phase === 'spin' ? t('games.wahrheit.spinning') : isMe ? t('games.wahrheit.yourTurn') : t('games.wahrheit.turnOf', { name: name(view.current) })),
        view.teamScores ? h('p', { class: 'badge' }, `${t('teams.red')} ${view.teamScores.red} : ${view.teamScores.blue} ${t('teams.blue')}`) : null));
    const main = h('div', { class: 'stack' });
    if (view.phase === 'choose') {
      main.append(isMe && has('choose') ? h('div', { class: 'row' }, button(t('games.wahrheit.truth'), { kind: 'primary', onClick: () => api.act({ type: 'choose', choice: 'truth' }) }), button(t('games.wahrheit.dare'), { kind: 'primary', onClick: () => api.act({ type: 'choose', choice: 'dare' }) }), h('span', { class: 'tiny' }, t('games.wahrheit.jokers', { n: view.jokers[me] }))) : h('p', { class: 'muted' }, t('games.wahrheit.choosing', { name: name(view.current) })));
    }
    if (view.card && (view.phase === 'task' || view.phase === 'vote' || view.phase === 'result')) {
      main.append(h('div', { class: `tcard ${view.card.type}` }, h('span', { class: 'badge' }, view.card.type === 'truth' ? t('games.wahrheit.truth') : t('games.wahrheit.dare'), view.card.cat ? ` · ${t(`games.wahrheit.values.categories.${view.card.cat}`)}` : ''), h('p', { class: 'tcard-text' }, view.card.text)));
      if (view.card.input === 'draw') {
        const key = `${view.round}-${view.card.text}`;
        if (padKey !== key) {
          pad = drawingPad({ strokes: view.strokes, editable: isMe && view.phase === 'task', onStroke: (st) => api.act({ type: 'stroke', ...st }), onUndo: () => api.act({ type: 'undoStroke' }) });
          padKey = key;
        } else pad.update(view.strokes);
        main.append(pad.el);
      }
      if (view.answer) main.append(h('blockquote', { class: 'answer' }, view.answer));
      if (view.phase === 'task' && isMe) {
        const row = h('div', { class: 'row' });
        if (has('answer')) {
          const input = h('input', { class: 'input', maxlength: 240, placeholder: t('games.wahrheit.answerPh'), 'aria-label': t('games.wahrheit.answerPh') });
          row.append(input, button(t('games.wahrheit.send'), { kind: 'primary', iconName: 'send', onClick: () => input.value.trim() && api.act({ type: 'answer', text: input.value }) }));
        }
        row.append(button(view.card.type === 'truth' ? t('games.wahrheit.saidAloud') : t('games.wahrheit.doneBtn'), { iconName: 'check', onClick: () => api.act({ type: 'done' }) }));
        if (has('joker')) row.append(button(t('games.wahrheit.joker', { n: view.jokers[me] }), { kind: 'ghost', onClick: () => api.act({ type: 'joker' }) }));
        main.append(row);
      }
      if (view.phase === 'vote') {
        main.append(has('vote')
          ? h('div', { class: 'row' }, h('b', {}, t('games.wahrheit.voteQ', { name: name(view.current) })), button(t('games.wahrheit.yes'), { kind: 'primary', iconName: 'check', onClick: () => api.act({ type: 'vote', passed: true }) }), button(t('games.wahrheit.no'), { iconName: 'close', onClick: () => api.act({ type: 'vote', passed: false }) }))
          : h('p', { class: 'muted' }, t('games.wahrheit.votes', { n: view.votes, total: view.voters })));
      }
      if (view.phase === 'result') {
        const last = view.log[view.log.length - 1];
        main.append(h('p', { class: last?.passed ? 'state-ok' : 'muted', role: 'status' }, last?.passed ? t('games.wahrheit.passed', { name: name(view.current) }) : t('games.wahrheit.failed', { name: name(view.current) })));
      }
    }
    const board = h('div', { class: 'scoreboard' }, people.map((p) => h('div', { class: 'prow' }, avatar(p), h('span', { class: 'grow' }, p.name), h('b', {}, view.scores[p.id] ?? 0))));
    box.replaceChildren(top, main, board);
    if (events.some((e) => e.type === 'passed')) play('win');
    else if (events.some((e) => e.type === 'spin' || e.type === 'chosen')) play('card');
  }

  return {
    update: render,
    turnText: (view, payload) => (payload.legal.length ? (view.phase === 'vote' ? t('games.wahrheit.voteNow') : t('game.yourTurn')) : null),
    log: (view) => view.log.map((l) => `${api.nameOf(l.id)}: ${l.joker ? 'Joker' : `${l.choice === 'truth' ? 'Wahrheit' : 'Tat'} – ${l.passed ? 'geschafft' : 'nicht geschafft'}`}`),
    resultExtra: ({ view }) => h('p', { class: 'muted' }, Object.entries(view.scores).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${api.nameOf(id)} ${n}`).join(' · ')),
    destroy: () => box.remove(),
  };
}
