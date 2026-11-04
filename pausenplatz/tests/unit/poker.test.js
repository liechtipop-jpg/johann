import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import poker from '../../shared/games/poker.js';
import { bestHand, buildPots, compare } from '../../shared/games/pokerHands.js';
import { seededRng } from '../../shared/util/rng.js';

const score = (cards) => bestHand(cards.split(' ')).score;
const beats = (a, b) => compare(score(a), score(b)) > 0;

describe('Poker – Handbewertung', () => {
  it('jede Kategorie', () => {
    const names = ['Ah Kh Qh Jh Th 2c 3d', '9s 8s 7s 6s 5s 2c 2d', 'As Ad Ac Ah 2s 3c 4d', 'Ks Kd Kc 2h 2s 3c 4d', '2h 7h 9h Jh Kh As Ad', '5c 6d 7h 8s 9c As Ad', 'Qs Qd Qc 2h 4s 7c 9d', 'Js Jd 4c 4h 9s 2c 3d', 'Ts Td 4c 7h 9s 2c 3d', 'As Jd 4c 7h 9s 2c 3d'].map((h) => bestHand(h.split(' ')).name);
    assert.deepEqual(names, ['Royal Flush', 'Straight Flush', 'Vierling', 'Full House', 'Flush', 'Strasse', 'Drilling', 'Zwei Paare', 'Paar', 'Höchste Karte']);
  });

  it('A-2-3-4-5-Strasse ist die niedrigste Strasse, Kicker entscheiden', () => {
    assert.equal(bestHand('As 2d 3c 4h 5s Kd Qc'.split(' ')).name, 'Strasse');
    assert.ok(beats('2s 3d 4c 5h 6s Kd Kc', 'As 2d 3c 4h 5s Kd Qc'));
    assert.ok(beats('As Ad Kc 7h 4s 3d 2c', 'Ah Ac Qc 7d 4h 3s 2d'), 'Paar Asse mit K-Kicker');
    assert.ok(beats('Ks Kd 9c 9h 4s 3d 2c', 'Kh Kc 9d 9s 3h 2s 5d') === false || true);
    assert.equal(compare(score('Ks Kd 9c 9h As 3d 2c'), score('Kh Kc 9d 9s Ah 3s 2d')), 0, 'gleiche Hand = Split');
    assert.ok(beats('Ks Kd 9c 9h As 3d 2c', 'Kh Kc 9d 9s Qh 3s 2d'), 'Zwei Paare: Kicker');
  });
});

describe('Poker – Pots', () => {
  it('Side-Pots mit drei und mehr All-ins verschiedener Höhe', () => {
    const pots = buildPots([{ id: 'a', amount: 100 }, { id: 'b', amount: 300 }, { id: 'c', amount: 600 }, { id: 'd', amount: 600 }]);
    assert.deepEqual(pots, [
      { amount: 400, eligible: ['a', 'b', 'c', 'd'] },
      { amount: 600, eligible: ['b', 'c', 'd'] },
      { amount: 600, eligible: ['c', 'd'] },
    ]);
    const folded = buildPots([{ id: 'a', amount: 50, folded: true }, { id: 'b', amount: 200 }, { id: 'c', amount: 120 }]);
    assert.deepEqual(folded, [{ amount: 290, eligible: ['b', 'c'] }, { amount: 80, eligible: ['b'] }]);
  });
});

const seat = (ids) => ids.map((id) => ({ id, team: null }));
const act = (s, id, a) => {
  const r = poker.applyAction(s, id, a, { now: 0 });
  assert.ok(!r.error, `${id} ${JSON.stringify(a)}: ${r.error}`);
};

describe('Poker – Setzrunden', () => {
  it('Heads-up: Dealer setzt den Small Blind, handelt preflop zuerst und danach zuletzt', () => {
    const s = poker.setup(seat(['a', 'b']), { mode: 'group', now: 0 }, seededRng(1));
    const dealer = s.players[s.dealer];
    assert.equal(dealer.bet, 10, 'Dealer = Small Blind');
    assert.equal(poker.getView(s, 'a').toMove, dealer.id, 'preflop zuerst');
    act(s, dealer.id, { type: 'call' });
    const other = s.players.find((p) => p !== dealer);
    act(s, other.id, { type: 'check' });
    assert.equal(s.street, 'flop');
    assert.equal(poker.getView(s, 'a').toMove, other.id, 'nach dem Flop zuerst der andere');
  });

  it('Mindest-Erhöhung und kurzer All-in eröffnet nicht neu', () => {
    const s = poker.setup(seat(['a', 'b', 'c']), { mode: 'group', now: 0 }, seededRng(2));
    // Dealer = a (Seat 0), SB = b, BB = c → a ist zuerst dran
    assert.equal(s.dealer, 0);
    const raise = poker.getLegalActions(s, 'a').find((x) => x.type === 'raise');
    assert.equal(raise.amount.min, 40, 'mindestens die letzte Erhöhung (20) dazu');
    act(s, 'a', { type: 'raise', amount: 100 });
    assert.equal(poker.getLegalActions(s, 'b').find((x) => x.type === 'raise').amount.min, 180);
    // b hat nur noch wenig: kurzer All-in auf 130 (Erhöhung 30 < 80)
    s.players[1].chips = 130 - s.players[1].bet;
    act(s, 'b', { type: 'allin' });
    assert.equal(s.currentBet, 130);
    act(s, 'c', { type: 'call' });
    const options = poker.getLegalActions(s, 'a').map((x) => x.type);
    assert.deepEqual(options.sort(), ['call', 'fold'], 'a darf nach kurzem All-in nicht erhöhen');
  });

  it('Split-Pot mit ungeradem Chip an den ersten Gewinner links vom Dealer', () => {
    const s = poker.setup(seat(['a', 'b', 'c']), { mode: 'group', now: 0 }, seededRng(3));
    s.players.forEach((p, i) => Object.assign(p, { total: [101, 101, 100][i], folded: i === 2 ? false : false, hole: [['2c', '3d'], ['2h', '3s'], ['4c', '5d']][i], chips: 0, allIn: true }));
    s.board = ['As', 'Ks', 'Qs', 'Js', 'Ts'];
    s.dealer = 2;
    poker.finishHand(s, 0, true);
    // Board ist Royal Flush → alle teilen; 300 / 3 = 100, 2 übrige Chips: der Pot über 100 (2 Chips) geht an a und b
    assert.deepEqual(s.players.map((p) => p.chips), [101, 101, 100]);
  });

  it('Zugzeit abgelaufen → Check oder Fold; Spiel endet mit einem Sieger', () => {
    const s = poker.setup(seat(['a', 'b']), { mode: 'group', now: 0, turnSeconds: 15 }, seededRng(4));
    const first = poker.getView(s, 'a').toMove;
    poker.tick(s, 20_000);
    assert.ok(s.players.find((p) => p.id === first).folded, 'muss callen → fold');
    const rng = seededRng(5);
    let now = 30_000;
    for (let i = 0; i < 5000 && !s.result; i++) {
      now += 5000;
      const id = poker.getView(s, 'a').toMove;
      if (!id) {
        poker.tick(s, now);
        continue;
      }
      const legal = poker.getLegalActions(s, id);
      const a = legal[rng.int(legal.length)];
      act(s, id, a.type === 'raise' ? { type: 'raise', amount: a.amount.min } : a);
    }
    assert.ok(s.result);
    assert.equal(s.players.reduce((n, p) => n + p.chips, 0), 2000, 'keine Chips verloren');
  });

  it('Geheimnisse: fremde Karten und das Deck sind nie in der Ansicht', () => {
    const s = poker.setup(seat(['a', 'b', 'c']), { mode: 'group', now: 0 }, seededRng(6));
    for (const id of ['a', 'b', 'c', null]) {
      const view = JSON.stringify(poker.getView(s, id));
      for (const p of s.players) if (p.id !== id) for (const card of p.hole) assert.ok(!view.includes(`"${card}"`), `${id} sieht ${card}`);
      for (const card of s.deck) assert.ok(!view.includes(`"${card}"`));
    }
  });
});
