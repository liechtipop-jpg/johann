// Darstellung Wort-Raten: Ballon verliert mit jedem Fehler Luft, Buchstaben-Tastatur, Lösen per Eingabe.
import { LETTERS, toLetters } from '/shared/games/wortraten.js';
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { avatar, button, h, s } from '../ui/dom.js';

function balloon(view) {
  const air = Math.max(0, 1 - view.misses / view.lives);
  const svg = s('svg', { viewBox: '0 0 200 240', class: 'balloon', role: 'img', 'aria-label': view.popped ? t('games.wortraten.popped') : t('games.wortraten.air', { n: view.lives - view.misses }) });
  if (view.popped) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      svg.append(s('path', { d: `M${100 + Math.cos(a) * 30} ${110 + Math.sin(a) * 30}L${100 + Math.cos(a) * 70} ${110 + Math.sin(a) * 70}`, stroke: 'var(--accent)', 'stroke-width': 6, 'stroke-linecap': 'round', class: 'pop' }));
    }
    svg.append(s('text', { x: 100, y: 118, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 800, fill: 'var(--text)' }, 'Peng!'));
    return svg;
  }
  const rx = 28 + 52 * air;
  const ry = rx * 1.18;
  const cy = 172 - ry;
  svg.append(s('path', { d: 'M100 176 C 88 196, 112 210, 100 236', fill: 'none', stroke: 'var(--text-3)', 'stroke-width': 3 }));
  svg.append(s('ellipse', { cx: 100, cy, rx, ry, fill: 'var(--accent)', class: 'balloon-body' }));
  svg.append(s('ellipse', { cx: 100 - rx * 0.38, cy: cy - ry * 0.38, rx: rx * 0.18, ry: ry * 0.24, fill: '#fff', opacity: 0.35 }));
  if (air < 0.6) svg.append(s('path', { d: `M${100 - rx * 0.5} ${cy + ry * 0.2} q ${rx * 0.25} ${-ry * 0.12} ${rx * 0.5} 0 M${100 + rx * 0.1} ${cy + ry * 0.45} q ${rx * 0.2} ${-ry * 0.1} ${rx * 0.4} 0`, fill: 'none', stroke: 'rgb(0 0 0 / 0.25)', 'stroke-width': 3 }));
  svg.append(s('path', { d: `M94 ${cy + ry + 6} L106 ${cy + ry + 6} L100 ${cy + ry - 2} Z`, fill: 'var(--accent)' }));
  return svg;
}

export function create(root, api) {
  const box = h('div', { class: 'party wortraten' });
  root.append(box);
  let legalNow = [];
  const onKey = (e) => {
    if (e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey) return;
    const letter = e.key.length === 1 ? toLetters(e.key) : '';
    const open = legalNow.find((a) => a.type === 'letter')?.letterChoices ?? [];
    if (open.includes(letter)) api.act({ type: 'letter', letter });
  };
  document.addEventListener('keydown', onKey);

  return {
    update({ view, legal, events }) {
      legalNow = legal;
      const me = api.me();
      const name = api.nameOf;
      const parts = [h('p', { class: 'muted small' }, `${t('games.wortraten.wordN', { n: Math.min(view.done + 1, view.total), total: view.total })} · ${view.giver ? t('games.wortraten.by', { name: name(view.giver) }) : t('games.wortraten.byApp')}`)];
      if (view.teamScores) parts.push(h('p', { class: 'badge' }, `${t('teams.red')} ${view.teamScores.red} : ${view.teamScores.blue} ${t('teams.blue')}`));
      if (view.phase === 'word') {
        if (legal.some((a) => a.type === 'word')) {
          const input = h('input', { class: 'input', maxlength: 24, autocomplete: 'off', placeholder: t('games.wortraten.wordPh'), 'aria-label': t('games.wortraten.wordPh') });
          const send = () => input.value.trim() && api.act({ type: 'word', text: input.value });
          input.addEventListener('keydown', (e) => e.key === 'Enter' && send());
          parts.push(h('h2', {}, t('games.wortraten.giveWord')), h('p', { class: 'muted small' }, t('games.wortraten.wordHint')), h('div', { class: 'chat-form' }, input, button(t('games.wortraten.set'), { kind: 'primary', onClick: send })));
        } else parts.push(h('h2', {}, t('games.wortraten.waitWord', { name: name(view.giver) })));
      } else {
        const row = h('div', { class: 'word-row', 'aria-label': t('games.wortraten.word') }, (view.phase === 'reveal' && view.secret ? [...toLetters(view.secret)] : view.pattern).map((ch, i) => h('span', { class: `wl ${ch === ' ' ? 'space' : ''} ${view.phase === 'reveal' && view.pattern?.[i] === null ? 'missed' : ''}` }, ch === null ? '' : ch)));
        parts.push(h('div', { class: 'wr-stage' }, balloon(view), h('div', { class: 'stack grow' }, row,
          view.secret && view.phase === 'guess' ? h('p', { class: 'tiny' }, t('games.wortraten.yourWord', { word: view.secret })) : null,
          view.phase === 'reveal' ? h('p', { class: view.solvedBy ? 'state-ok' : 'state-off', 'aria-live': 'polite' }, view.solvedBy ? t('games.wortraten.solved', { name: name(view.solvedBy) }) : t('games.wortraten.popped')) : h('p', { class: 'muted small' }, t('games.wortraten.air', { n: view.lives - view.misses })))));
        if (view.phase === 'guess') {
          const open = new Set(legal.find((a) => a.type === 'letter')?.letterChoices ?? []);
          const word = view.secret ? toLetters(view.secret) : null;
          parts.push(h('div', { class: 'keys', role: 'group', 'aria-label': t('games.wortraten.keyboard') }, LETTERS.map((l) => {
            const used = view.guessed.includes(l);
            const hit = used && view.pattern.includes(l);
            return h('button', { type: 'button', class: `key ${used ? (hit ? 'hit' : 'miss') : ''} ${word && !used && word.includes(l) ? 'hint' : ''}`, disabled: !open.has(l), 'aria-label': `${l}${used ? (hit ? ' ✓' : ' ✗') : ''}`, onClick: () => api.act({ type: 'letter', letter: l }) }, l);
          })));
          if (legal.some((a) => a.type === 'solve')) {
            const input = h('input', { class: 'input', maxlength: 24, autocomplete: 'off', placeholder: t('games.wortraten.solvePh'), 'aria-label': t('games.wortraten.solvePh') });
            const send = () => input.value.trim() && api.act({ type: 'solve', text: input.value });
            input.addEventListener('keydown', (e) => e.key === 'Enter' && send());
            parts.push(h('div', { class: 'chat-form' }, input, button(t('games.wortraten.solve'), { onClick: send })));
          }
        }
      }
      parts.push(h('div', { class: 'scoreboard' }, api.people().map((p) => h('div', { class: `prow ${view.toMove === p.id ? 'turn-now' : ''}` }, avatar(p), h('span', { class: 'grow' }, p.name, p.id === view.giver ? ` · ${t('games.wortraten.giver')}` : ''), h('b', {}, String(view.scores[p.id] ?? 0))))));
      box.replaceChildren(...parts);
      if (events.some((e) => e.type === 'pop')) play('lose');
      else if (events.some((e) => e.type === 'solved' || e.type === 'hit')) play(events.some((e) => e.type === 'solved') ? 'win' : 'move');
      else if (events.some((e) => e.type === 'miss' && e.by === me)) play('lose');
    },
    turnText: (view, payload) => (payload.legal.some((a) => a.type === 'letter') ? t('games.wortraten.yourGuess') : payload.legal.some((a) => a.type === 'word') ? t('games.wortraten.giveWord') : null),
    log: (view) => view.log.map((l) => `${l.word} – ${l.solvedBy ? api.nameOf(l.solvedBy) : '💥'}`),
    resultExtra: ({ view }) => h('p', { class: 'muted' }, Object.entries(view.scores).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${api.nameOf(id)} ${n}`).join(' · ')),
    destroy() {
      document.removeEventListener('keydown', onKey);
      box.remove();
    },
  };
}
