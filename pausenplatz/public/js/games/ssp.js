// Darstellung Schere, Stein, Papier: drei grosse Knöpfe mit eigenen Symbolen, letzter Wurf und Turnierbaum.
import { CHOICES } from '/shared/games/ssp.js';
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { h, s } from '../ui/dom.js';

export function symbol(choice, size = 64) {
  const svg = s('svg', { viewBox: '0 0 64 64', width: size, height: size, 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  if (choice === 'schere') svg.append(s('circle', { cx: 18, cy: 47, r: 8 }), s('circle', { cx: 46, cy: 47, r: 8 }), s('path', { d: 'M23 41 L45 8 M41 41 L19 8' }), s('circle', { cx: 32, cy: 26, r: 2.5, fill: 'currentColor' }));
  else if (choice === 'stein') svg.append(s('path', { d: 'M10 42 L16 22 L30 12 L47 17 L55 35 L46 52 L22 55 Z', fill: 'currentColor', 'fill-opacity': 0.18 }), s('path', { d: 'M22 26 L31 21 M40 40 L46 34', 'stroke-width': 3 }));
  else svg.append(s('path', { d: 'M16 7 H39 L50 18 V57 H16 Z', fill: 'currentColor', 'fill-opacity': 0.12 }), s('path', { d: 'M39 7 V18 H50' }), s('path', { d: 'M23 29 H43 M23 37 H43 M23 45 H36', 'stroke-width': 3 }));
  return svg;
}

export function create(root, api) {
  const box = h('div', { class: 'ssp' });
  root.append(box);

  function matchBox(view, m, r) {
    const row = (id, i) => h('div', { class: `bslot ${m.winner && m.winner === id ? 'won' : ''} ${m.winner && id && m.winner !== id ? 'lost' : ''}` },
      h('span', { class: 'grow' }, id ? api.nameOf(id) : r === 0 ? t('games.ssp.bye') : '?'), id && m.b !== null ? h('b', {}, String(m.wins[i])) : null);
    return h('div', { class: `bmatch ${!m.winner && m.b ? 'live' : ''}` }, row(m.a, 0), row(m.b, 1));
  }

  function bracket(view) {
    const cols = [];
    let count = view.size / 2;
    for (let r = 0; count >= 1; r++, count /= 2) {
      const real = view.rounds[r];
      const list = real ?? Array.from({ length: count }, () => null);
      const title = count === 1 ? t('games.ssp.final') : count === 2 ? t('games.ssp.semi') : t('games.ssp.roundN', { n: r + 1 });
      cols.push(h('div', { class: 'bcol' }, h('h4', {}, title), list.map((m) => (m ? matchBox(view, m, r) : h('div', { class: 'bmatch' }, h('div', { class: 'bslot' }, '?'), h('div', { class: 'bslot' }, '?'))))));
    }
    return h('div', { class: 'bracket', role: 'region', 'aria-label': t('games.ssp.bracket'), tabindex: 0 }, cols);
  }

  return {
    update({ view, legal, events }) {
      const me = api.me();
      const round = view.rounds.at(-1);
      const mine = round.find((m) => m.a === me || m.b === me);
      const parts = [];
      if (mine && mine.b) {
        const opp = mine.a === me ? mine.b : mine.a;
        const myIdx = mine.a === me ? 0 : 1;
        parts.push(h('p', { class: 'muted small' }, t('games.ssp.vs', { name: api.nameOf(opp), bestOf: view.bestOf })),
          h('p', { class: 'ssp-score', 'aria-live': 'polite' }, `${mine.wins[myIdx]} : ${mine.wins[1 - myIdx]}`));
        const last = mine.throws.at(-1);
        if (last) {
          const myPick = myIdx === 0 ? last.a : last.b;
          const oppPick = myIdx === 0 ? last.b : last.a;
          const res = last.winner === null ? t('games.ssp.tie') : last.winner === me ? t('games.ssp.won') : t('games.ssp.lost');
          parts.push(h('div', { class: 'ssp-last' }, h('div', { class: 'ssp-hand' }, symbol(myPick, 56), h('span', {}, t('room.you'))), h('b', {}, res), h('div', { class: 'ssp-hand' }, symbol(oppPick, 56), h('span', {}, api.nameOf(opp)))));
        }
        if (!mine.winner) {
          const picked = mine.mine;
          parts.push(h('div', { class: 'ssp-choices', role: 'group', 'aria-label': t('games.ssp.choose') }, CHOICES.map((c) => h('button', {
            type: 'button', class: 'ssp-btn', 'aria-pressed': String(picked === c), disabled: !legal.length,
            onClick: () => api.act({ type: 'pick', choice: c }),
          }, symbol(c, 56), h('span', {}, t(`games.ssp.choices.${c}`))))));
          if (picked) parts.push(h('p', { class: 'muted' }, mine.picked[1 - myIdx] ? '…' : t('games.ssp.waitOpp', { name: api.nameOf(opp) })));
        } else parts.push(h('p', { class: mine.winner === me ? 'state-ok' : 'muted' }, mine.winner === me ? t('games.ssp.next') : t('games.ssp.out')));
      } else if (view.champion) parts.push(h('h2', {}, t('games.ssp.champion', { name: api.nameOf(view.champion) })));
      else parts.push(h('p', { class: 'muted' }, mine ? t('games.ssp.byeYou') : t('games.ssp.watch')));
      if (view.size > 2) parts.push(bracket(view));
      box.replaceChildren(...parts);
      const thrown = events.find((e) => e.type === 'throw' && (e.a === me || e.b === me));
      if (thrown) play(thrown.winner === me ? 'win' : thrown.winner ? 'lose' : 'move');
    },
    turnText: (view, payload) => (payload.legal.length ? t('games.ssp.choose') : null),
    log: (view) => view.rounds.flatMap((round) => round.filter((m) => m.winner && m.b).map((m) => `${api.nameOf(m.a)} ${m.wins[0]} : ${m.wins[1]} ${api.nameOf(m.b)}`)),
    destroy: () => box.remove(),
  };
}
