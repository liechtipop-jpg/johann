// Spiel-Optionen: Definitionen im Spielmodul (optionDefs), Prüfung hier – gleich für Server und Browser.
export function sanitizeOptions(game, input = {}) {
  const out = {};
  for (const def of game.optionDefs ?? []) {
    const v = input?.[def.key];
    if (def.type === 'bool') out[def.key] = typeof v === 'boolean' ? v : def.default;
    else if (def.type === 'select') out[def.key] = def.values.some((x) => x === v) ? v : def.default;
    else if (def.type === 'int') out[def.key] = Number.isInteger(v) && v >= def.min && v <= def.max ? v : def.default;
    else if (def.type === 'multi') out[def.key] = Array.isArray(v) && v.length && v.every((x) => def.values.includes(x)) ? [...new Set(v)] : def.default;
  }
  return out;
}

export const TEAM_SIZES = { '1v1': 1, '2v2': 2, '3v3': 3 };
export const ROOM_MODES = ['1v1', '2v2', '3v3', 'group'];

/** Plätze eines Raums: Teams abwechselnd (Rot, Blau, Rot, …) oder freie Plätze in der Gruppe. */
export function buildSeats(game, mode) {
  if (mode === 'group') return Array.from({ length: game.players.max }, () => ({ team: null, playerId: null }));
  const seats = [];
  for (let i = 0; i < TEAM_SIZES[mode]; i++) seats.push({ team: 'red', playerId: null }, { team: 'blue', playerId: null });
  return seats;
}
