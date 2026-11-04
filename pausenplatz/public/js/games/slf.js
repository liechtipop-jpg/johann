// Darstellung Stadt, Land, Fluss: Antwortblatt (bleibt beim Tippen stehen), Stopp-Knopf, Abstimmungstabelle, Rundenpunkte.
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { button, h } from '../ui/dom.js';

export function create(root, api) {
  const head = h('div', { class: 'stack' });
  const form = h('div', { class: 'slf-form' });
  const stopBtn = button(t('games.slf.stop'), { kind: 'primary', onClick: () => { flushAll(); api.act({ type: 'stop' }); } });
  const board = h('div', { class: 'stack' });
  const scores = h('div', { class: 'scoreboard' });
  const wrap = h('div', { class: 'party slf' }, head, form, stopBtn, board, scores);
  root.append(wrap);
  let formRound = null;
  const inputs = {};
  const timers = {};
  const send = (cat) => {
    clearTimeout(timers[cat]);
    delete timers[cat];
    api.act({ type: 'answer', category: cat, text: inputs[cat].value });
  };
  const flushAll = () => Object.keys(timers).forEach(send);

  const label = (view, key) => (view.teamMode ? t(`teams.${key}`) : api.nameOf(key));

  function buildForm(view) {
    for (const k of Object.keys(inputs)) delete inputs[k];
    form.replaceChildren(...view.cats.map((cat, i) => {
      const input = h('input', { class: 'input', maxlength: 30, autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', value: view.mySheet?.[cat] ?? '', 'aria-label': t(`games.slf.values.categories.${cat}`) });
      input.addEventListener('input', () => {
        clearTimeout(timers[cat]);
        timers[cat] = setTimeout(() => send(cat), 400);
      });
      input.addEventListener('blur', () => timers[cat] && send(cat));
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (timers[cat]) send(cat);
        Object.values(inputs)[i + 1]?.focus();
      });
      inputs[cat] = input;
      return h('label', { class: 'field slf-field' }, h('span', {}, t(`games.slf.values.categories.${cat}`)), input);
    }));
  }

  return {
    update({ view, legal, events }) {
      const me = api.me();
      const writing = view.phase === 'write' || view.phase === 'stop';
      const canWrite = legal.some((a) => a.type === 'answer');
      if (writing && view.myKey && formRound !== view.round) {
        buildForm(view);
        formRound = view.round;
      }
      if (writing && view.myKey) {
        for (const cat of view.cats) {
          const input = inputs[cat];
          if (!input) continue;
          input.disabled = !canWrite;
          if (document.activeElement !== input && !timers[cat] && input.value !== (view.mySheet?.[cat] ?? '')) input.value = view.mySheet?.[cat] ?? '';
        }
      }
      if (events.some((e) => e.type === 'stop')) {
        flushAll();
        play('move');
      }
      form.hidden = !(writing && view.myKey);
      stopBtn.hidden = !(view.phase === 'write' && view.myKey);
      stopBtn.disabled = !legal.some((a) => a.type === 'stop');
      stopBtn.title = stopBtn.disabled ? t('games.slf.stopHint') : '';

      const status = view.phase === 'write' ? t('games.slf.write') : view.phase === 'stop' ? t('games.slf.stopped', { name: api.nameOf(view.stopBy) }) : view.phase === 'vote' ? t('games.slf.vote') : t('games.slf.roundDone');
      head.replaceChildren(...[
        h('div', { class: 'slf-head' }, h('div', { class: 'slf-letter', 'aria-label': t('games.slf.letter', { l: view.letter }) }, view.letter), h('div', { class: 'stack' }, h('p', { class: 'muted small' }, t('games.slf.roundN', { n: view.round + 1, total: view.total })), h('p', { 'aria-live': 'polite' }, status))),
        writing ? h('p', { class: 'tiny' }, view.keys.map((k) => `${label(view, k)} ${view.progress[k]}/${view.cats.length}`).join(' · ')) : null,
      ].filter(Boolean));

      if (view.board) {
        const doubtable = new Set(legal.find((a) => a.type === 'doubt')?.answerIdChoices ?? []);
        board.replaceChildren(...[
          ...view.board.map(({ cat, entries }) => h('section', { class: 'panel slf-cat' }, h('h3', {}, t(`games.slf.values.categories.${cat}`)),
            entries.map((e) => {
              const invalid = e.auto || e.doubts > e.voters / 2;
              const note = e.auto === 'empty' ? '–' : e.auto === 'letter' ? t('games.slf.wrongLetter') : e.doubts ? t('games.slf.doubts', { n: e.doubts, of: e.voters }) : '';
              return h('div', { class: `prow ${invalid ? 'slf-bad' : ''}` },
                h('span', { class: 'slf-who' }, label(view, e.key)), h('b', { class: 'grow' }, e.text || '—'), note ? h('span', { class: 'tiny' }, note) : null,
                e.points !== null ? h('span', { class: 'badge' }, `+${e.points}`) : null,
                doubtable.has(e.id) ? button(e.mine ? t('games.slf.undoubt') : t('games.slf.doubt'), { kind: 'small', onClick: () => api.act({ type: 'doubt', answerId: e.id }) }) : null);
            }))),
          legal.some((a) => a.type === 'done') ? button(t('games.slf.done'), { kind: 'primary', onClick: () => api.act({ type: 'done' }) }) : view.phase === 'vote' ? h('p', { class: 'muted' }, t('games.slf.waitVotes', { n: view.voted.length, total: api.people().length })) : null,
        ].filter(Boolean));
      } else board.replaceChildren();
      scores.replaceChildren(...view.keys.map((k) => h('div', { class: `prow ${k === view.myKey ? 'turn-now' : ''}` }, h('span', { class: 'grow' }, label(view, k)), h('b', {}, String(view.scores[k] ?? 0)))));
      if (events.some((e) => e.type === 'scored' || e.type === 'voted') && view.phase === 'result') play('win');
      void me;
    },
    turnText: (view, payload) => (payload.legal.some((a) => a.type === 'answer') ? t('games.slf.write') : payload.legal.some((a) => a.type === 'done') ? t('games.slf.vote') : null),
    log: (view) => view.history.map((x) => `${x.letter}: ${Object.entries(x.points).map(([k, n]) => `${view.teamMode ? t(`teams.${k}`) : api.nameOf(k)} +${n}`).join(', ')}`),
    resultExtra: ({ view }) => h('p', { class: 'muted' }, Object.entries(view.scores).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${view.teamMode ? t(`teams.${k}`) : api.nameOf(k)} ${n}`).join(' · ')),
    destroy() {
      Object.values(timers).forEach(clearTimeout);
      wrap.remove();
    },
  };
}
