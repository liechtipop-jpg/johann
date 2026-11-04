// KI Schere, Stein, Papier: leicht = Zufall, mittel = kontert die Lieblingswahl, schwer = lernt Übergänge (Markow-Kette).
import { CHOICES } from '../games/ssp.js';

const COUNTER = { schere: 'stein', stein: 'papier', papier: 'schere' };

export default {
  choose(view, legal, { level = 'mittel', rng, playerId }) {
    const random = () => ({ type: 'pick', choice: CHOICES[rng.int(3)] });
    const m = view.rounds.at(-1)?.find((x) => !x.winner && (x.a === playerId || x.b === playerId));
    if (!m || level === 'leicht') return random();
    const opp = m.throws.map((t) => (m.a === playerId ? t.b : t.a));
    if (!opp.length || rng.float() < (level === 'schwer' ? 0.2 : 0.35)) return random();
    let guess;
    if (level === 'schwer' && opp.length >= 2) {
      const counts = Object.fromEntries(CHOICES.map((c) => [c, 0]));
      for (let i = 1; i < opp.length; i++) if (opp[i - 1] === opp.at(-1)) counts[opp[i]]++;
      const best = CHOICES.reduce((x, y) => (counts[y] > counts[x] ? y : x));
      guess = counts[best] > 0 ? best : opp.at(-1);
    } else {
      const counts = Object.fromEntries(CHOICES.map((c) => [c, opp.filter((x) => x === c).length]));
      guess = CHOICES.reduce((x, y) => (counts[y] > counts[x] ? y : x));
    }
    return { type: 'pick', choice: COUNTER[guess] };
  },
};
