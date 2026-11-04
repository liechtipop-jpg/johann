import { parentPort } from 'node:worker_threads';
import { AI } from '../shared/ai/index.js';
import { Chess } from 'chess.js';
import { cryptoRng } from '../shared/util/rng.js';

const rng = cryptoRng();
parentPort.on('message', ({ id, gameId, input }) => {
  let action = null;
  try {
    action = AI[gameId]?.choose(input.view, input.legal, { ...input, rng, Chess }) ?? null;
  } catch (err) {
    console.error(`[bot ${gameId}]`, err);
  }
  parentPort.postMessage({ id, action });
});
