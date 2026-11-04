import { randomInt } from 'node:crypto';
/** Echter Zufall für Spiele auf dem Server: crypto.randomInt. */
export const secureRng = () => ({ int: (n) => (n <= 1 ? 0 : randomInt(n)), float: () => randomInt(2 ** 47) / 2 ** 47 });
