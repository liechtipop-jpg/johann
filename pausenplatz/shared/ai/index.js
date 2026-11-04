// Computergegner pro Spiel. Jede KI: choose(view, legal, { level, rng, playerId, timeLimitMs }) → Aktion.
import tictactoe from './tictactoe.js';
import muehle from './muehle.js';
import schiffe from './schiffe.js';
import schach from './schach.js';
import poker from './poker.js';

export const AI = { tictactoe, muehle, schiffe, schach, poker };
export const hasAi = (gameId) => Boolean(AI[gameId]);
