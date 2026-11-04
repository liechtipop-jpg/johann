// Gemeinsame Hilfen für Zweier-Spiele mit Teams (Staffel: Teammitglieder ziehen reihum für ihre Seite).
export function sides(players, options) {
  const first = options.firstTeam === 'blue' ? 'blue' : 'red';
  const second = first === 'red' ? 'blue' : 'red';
  const byTeam = (team) => players.filter((p) => p.team === team).map((p) => p.id);
  let a = byTeam(first);
  let b = byTeam(second);
  if (!a.length || !b.length) {
    // Lokal oder ohne Teams: Reihenfolge der Plätze
    a = [players[0].id];
    b = [players[1].id];
  }
  return [
    { team: a.length && players.some((p) => p.team) ? first : null, members: a, next: 0 },
    { team: b.length && players.some((p) => p.team) ? second : null, members: b, next: 0 },
  ];
}

/** Wer aus dem Team ist als Nächstes dran? */
export const currentMember = (side) => side.members[side.next % side.members.length];
export const advanceMember = (side) => (side.next = (side.next + 1) % side.members.length);
export const sideOf = (state, playerId) => state.sides.findIndex((s) => s.members.includes(playerId));
