// Hilfen für Aktionen: zufällige gültige Aktion aus der Liste (für Tests und als Ersatzzug).
const WORDS = ['Apfel', 'Tafel', 'Ball', 'Hund', 'Sonne', 'Haus', 'Baum', 'Buch', 'Katze', 'Fenster'];

export function randomAction(legal, rng) {
  if (!legal || legal.length === 0) return null;
  const d = legal[rng.int(legal.length)];
  const a = { ...d };
  for (const [key, value] of Object.entries(d)) {
    if (value === '$text') a[key] = WORDS[rng.int(WORDS.length)];
    else if (value && typeof value === 'object' && 'min' in value && 'max' in value) a[key] = value.min + rng.int(value.max - value.min + 1);
    else if (Array.isArray(value) && key.endsWith('Choices')) {
      delete a[key];
      a[key.slice(0, -7)] = value[rng.int(value.length)];
    }
  }
  return a;
}

export const ok = (state, events = []) => ({ state, events });
export const fail = (error) => ({ error });
