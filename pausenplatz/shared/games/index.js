// Verzeichnis aller Spiele. Ein neues Spiel: Modul in shared/games/ anlegen und hier eintragen.
import tictactoe from './tictactoe.js';

export const GAMES = [tictactoe];
export const GAME_MAP = new Map(GAMES.map((g) => [g.id, g]));
export const getGame = (id) => GAME_MAP.get(id);
