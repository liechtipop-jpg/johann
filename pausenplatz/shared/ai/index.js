// Computergegner pro Spiel. Jede KI: choose(view, legal, { level, rng, playerId, timeLimitMs }) → Aktion.
import tictactoe from './tictactoe.js';

export const AI = { tictactoe };
export const hasAi = (gameId) => Boolean(AI[gameId]);
