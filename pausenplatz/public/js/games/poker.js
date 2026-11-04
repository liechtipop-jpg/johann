// Darstellung Poker: ovaler Tisch, eigene Karten, Chips, Einsatz-Regler mit Schnellknöpfen, beste Hand, Showdown.
import { t } from '../i18n/index.js';
import { play } from '../sound.js';
import { avatar, button, h } from '../ui/dom.js';
import { cardSvg } from './cards.js';

const fmt = (n) => new Intl.NumberFormat('de-CH').format(n);

export function create(root, api) {
  const box = h('div', { class: 'poker' });
  root.append(box);
  let raiseTo = null;

  function render(payload) {
    const { view, legal, events } = payload;
    const me = api.me();
    const people = new Map(api.people().map((p) => [p.id, p]));
    const n = view.players.length;
    const myIndex = Math.max(0, view.players.findIndex((p) => p.id === me));
    const winCards = new Set(view.phase === 'between' && view.showdown ? Object.entries(view.showdown.hands).filter(([id]) => view.showdown.awards.some((a) => a.winners.includes(id))).flatMap(([, hd]) => hd.cards) : []);
    const seats = view.players.map((p, i) => {
      const rel = (i - myIndex + n) % n;
      const angle = Math.PI / 2 + (rel / n) * Math.PI * 2;
      const info = people.get(p.id) ?? { name: '…' };
      const reveal = view.showdown?.reveal?.[p.id];
      const isTurn = view.toMove === p.id;
      const seat = h('div', { class: `pseat ${isTurn ? 'turn' : ''} ${p.folded ? 'folded' : ''} ${p.out ? 'out' : ''}`, style: { '--x': `${50 + Math.cos(angle) * 42}%`, '--y': `${50 + Math.sin(angle) * 40}%` } },
        h('div', { class: 'pname' }, avatar(info), h('span', {}, info.name), p.team ? h('span', { class: `team-tag ${p.team}` }, t(`teams.${p.team}`)) : null),
        h('div', { class: 'pchips' }, `${fmt(p.chips)}`, i === view.dealer ? h('span', { class: 'dealer', title: 'Dealer' }, 'D') : null, i === view.blindsAt?.[0] ? h('span', { class: 'blind' }, 'SB') : i === view.blindsAt?.[1] ? h('span', { class: 'blind' }, 'BB') : null),
        h('div', { class: 'pcards' }, reveal ? reveal.map((c) => cardSvg(c, { w: 30, highlight: winCards.has(c) })) : p.hasCards && p.id !== me ? [cardSvg(null, { w: 26 }), cardSvg(null, { w: 26 })] : null),
        p.folded ? h('span', { class: 'tiny' }, t('games.poker.folded')) : p.allIn ? h('span', { class: 'badge accent' }, 'All-in') : p.out ? h('span', { class: 'tiny' }, t('games.poker.out')) : null,
        p.bet > 0 ? h('div', { class: 'pbet', 'aria-label': `${t('games.poker.bet')} ${p.bet}` }, h('span', { class: 'chip-dot' }), fmt(p.bet)) : null);
      return seat;
    });
    const boardCards = Array.from({ length: 5 }, (_, i) => (view.board[i] ? cardSvg(view.board[i], { w: 48, highlight: winCards.has(view.board[i]), cls: events.some((e) => e.type === 'deal') ? 'pop' : '' }) : h('span', { class: 'slot' })));
    const awards = view.phase === 'between' && view.showdown ? view.showdown.awards.map((a) => h('p', { class: 'award' }, t('games.poker.wins', { names: a.winners.map((id) => people.get(id)?.name ?? '…').join(' & '), amount: fmt(a.amount), hand: a.hand ? ` – ${a.hand}` : '' }))) : [];
    const table = h('div', { class: 'ptable' }, h('div', { class: 'felt' }, h('div', { class: 'pboard' }, boardCards), h('div', { class: 'ppot' }, `${t('games.poker.pot')}: ${fmt(view.pot)}`), awards), seats);
    const mine = h('div', { class: 'pmine' }, view.hole.length ? view.hole.map((c) => cardSvg(c, { w: 70, highlight: winCards.has(c) })) : null,
      view.best ? h('p', { class: 'muted small' }, `${t('games.poker.best')}: ${view.best.name}`) : null);
    const bar = h('div', { class: 'pactions' });
    if (legal.length) {
      const has = (type) => legal.find((a) => a.type === type);
      if (has('fold')) bar.append(button(t('games.poker.fold'), { kind: 'danger', onClick: () => api.act({ type: 'fold' }) }));
      if (has('check')) bar.append(button(t('games.poker.check'), { onClick: () => api.act({ type: 'check' }) }));
      if (has('call')) bar.append(button(`${t('games.poker.call')} ${fmt(Math.min(view.toCall, view.players.find((p) => p.id === me)?.chips ?? 0))}`, { kind: 'primary', onClick: () => api.act({ type: 'call' }) }));
      const raise = has('raise');
      if (raise) {
        const { min, max } = raise.amount;
        raiseTo = Math.min(max, Math.max(min, raiseTo ?? min));
        const label = h('output', { class: 'raise-out' }, fmt(raiseTo));
        const slider = h('input', { type: 'range', min, max, step: Math.max(1, Math.round(view.bb / 2)), value: raiseTo, 'aria-label': t('games.poker.amount'), onInput: () => { raiseTo = Number(slider.value); label.textContent = fmt(raiseTo); } });
        const quick = (text, value) => button(text, { kind: 'small', onClick: () => { raiseTo = Math.min(max, Math.max(min, Math.round(value))); slider.value = raiseTo; label.textContent = fmt(raiseTo); } });
        bar.append(h('div', { class: 'raise' }, h('div', { class: 'row' }, quick(t('games.poker.half'), view.currentBet + view.pot / 2), quick(t('games.poker.potBtn'), view.currentBet + view.pot), quick('Max', max)), h('div', { class: 'row' }, slider, label),
          button(view.currentBet === 0 ? t('games.poker.betBtn') : t('games.poker.raise'), { kind: 'primary', onClick: () => api.act({ type: 'raise', amount: raiseTo }) })));
      }
      if (has('allin')) bar.append(button('All-in', { kind: 'small', onClick: () => api.act({ type: 'allin' }) }));
    } else raiseTo = null;
    box.replaceChildren(h('div', { class: 'row tiny' }, `${t('games.poker.hand')} ${view.handNo}${view.team ? ` / ${view.hands}` : ''} · Blinds ${view.sb}/${view.bb}`), table, mine, bar);
    if (events.some((e) => ['call', 'raise', 'allin'].includes(e.type))) play('chip');
    else if (events.some((e) => e.type === 'deal')) play('card');
  }

  return {
    update: render,
    turnText: (view, payload) => (view.phase === 'between' && !view.result ? t('games.poker.nextHand') : payload.legal.length ? t('game.yourTurn') : null),
    log: (view) => view.log.map((e) => e.type === 'hand' ? `— ${t('games.poker.hand')} ${e.no} (${e.sb}/${e.bb}) —` : e.type === 'street' ? `${t(`games.poker.streets.${e.street}`)}` : e.type === 'win' ? e.awards.map((a) => `${a.winners.map((id) => api.nameOf(id)).join(' & ')} +${fmt(a.amount)}${a.hand ? ` (${a.hand})` : ''}`).join(' · ') : `${api.nameOf(e.id)}: ${t(`games.poker.acts.${e.act}`)}${e.amount ? ` ${fmt(e.amount)}` : ''}`),
    destroy: () => box.remove(),
  };
}
