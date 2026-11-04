// Darstellung pro Spiel (Renderer). Die Regeln selbst stehen in /shared/games.
export const RENDERERS = {
  tictactoe: () => import('./tictactoe.js'),
  muehle: () => import('./muehle.js'),
  schiffe: () => import('./schiffe.js'),
};
export const CATEGORY_OF = (game) => game.category;
