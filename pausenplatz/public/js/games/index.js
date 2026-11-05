// Darstellung pro Spiel (Renderer). Die Regeln selbst stehen in /shared/games.
export const RENDERERS = {
  tictactoe: () => import('./tictactoe.js'),
  muehle: () => import('./muehle.js'),
  schiffe: () => import('./schiffe.js'),
  schach: () => import('./schach.js'),
  poker: () => import('./poker.js'),
  wahrheit: () => import('./wahrheit.js'),
  viergewinnt: () => import('./viergewinnt.js'),
  ultimate: () => import('./ultimate.js'),
  slf: () => import('./slf.js'),
  zeichnen: () => import('./zeichnen.js'),
  wortraten: () => import('./wortraten.js'),
  ssp: () => import('./ssp.js'),
  sudoku: () => import('./sudoku.js'),
};
export const CATEGORY_OF = (game) => game.category;
