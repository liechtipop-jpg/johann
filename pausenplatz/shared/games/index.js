// Verzeichnis aller Spiele. Ein neues Spiel: Modul in shared/games/ anlegen und hier eintragen.
import tictactoe from './tictactoe.js';
import muehle from './muehle.js';
import schiffe from './schiffe.js';

export const GAMES = [muehle, schiffe, tictactoe];
export const GAME_MAP = new Map(GAMES.map((g) => [g.id, g]));
export const getGame = (id) => GAME_MAP.get(id);
