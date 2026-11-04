// Verzeichnis aller Spiele. Ein neues Spiel: Modul in shared/games/ anlegen und hier eintragen.
import tictactoe from './tictactoe.js';
import muehle from './muehle.js';
import schiffe from './schiffe.js';
import schach from './schach.js';
import poker from './poker.js';
import wahrheit from './wahrheit.js';
import viergewinnt from './viergewinnt.js';
import ultimate from './ultimate.js';
import slf from './slf.js';
import zeichnen from './zeichnen.js';
import wortraten from './wortraten.js';
import ssp from './ssp.js';

export const GAMES = [schach, poker, muehle, schiffe, wahrheit, viergewinnt, ultimate, slf, zeichnen, wortraten, ssp, tictactoe];
export const GAME_MAP = new Map(GAMES.map((g) => [g.id, g]));
export const getGame = (id) => GAME_MAP.get(id);
