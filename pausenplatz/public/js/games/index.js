// Darstellung pro Spiel (Renderer). Die Regeln selbst stehen in /shared/games.
export const RENDERERS = {
  tictactoe: () => import('./tictactoe.js'),
};
export const CATEGORY_OF = (game) => game.category;
