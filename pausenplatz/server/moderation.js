// Wortfilter und Längenprüfung für Chat, Spitznamen und eigene Karten.
import { censor, containsBadWord } from '../shared/util/badwords.js';
import { config } from './config.js';

export { censor, containsBadWord };

export function cleanText(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Prüft einen Spitznamen: 2–16 Zeichen, ohne gesperrte Wörter. */
export function checkName(value) {
  const name = cleanText(value, 40);
  if (name.length < config.limits.nameMin || name.length > config.limits.nameMax) return { error: 'name_length' };
  if (containsBadWord(name)) return { error: 'name_bad' };
  return { name };
}
