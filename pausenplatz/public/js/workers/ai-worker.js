// Web Worker: Computergegner rechnen hier, damit die Seite nie einfriert.
import { cryptoRng } from '/shared/util/rng.js';

const rng = cryptoRng();
const TIME = { leicht: 300, mittel: 900, schwer: 2000 };
let Chess = null;

self.onmessage = async ({ data }) => {
  let action = null;
  try {
    const mod = await import(`/shared/ai/${data.gameId}.js`);
    if (data.gameId === 'schach' && !Chess) Chess = (await import('/vendor/chess.js')).Chess;
    action = mod.default.choose(data.view, data.legal, { level: data.level, rng, playerId: data.playerId, timeLimitMs: TIME[data.level] ?? 900, Chess });
  } catch (err) {
    console.error(err);
  }
  self.postMessage({ id: data.id, action });
};
