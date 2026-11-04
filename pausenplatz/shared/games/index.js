// Verzeichnis aller Spiele. Ein neues Spiel: Modul in shared/games/ anlegen und hier eintragen.
import tictactoe from './tictactoe.js';
import muehle from './muehle.js';
import schiffe from './schiffe.js';
import schach from './schach.js';
import poker from './poker.js';
import wahrheit from './wahrheit.js';

export const GAMES = [schach, poker, muehle, schiffe, wahrheit, tictactoe];
export const GAME_MAP = new Map(GAMES.map((g) => [g.id, g]));
export const getGame = (id) => GAME_MAP.get(id);
