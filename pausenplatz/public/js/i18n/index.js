import { de } from './de.js';
// Alle Texte zentral in i18n/de.js. Weitere Sprachen: gleiche Struktur, hier auswählen.
const dict = de;
export function t(key, vars = {}) {
  const value = key.split('.').reduce((o, k) => (o == null ? o : o[k]), dict);
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}
export const tObj = (key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), dict);
