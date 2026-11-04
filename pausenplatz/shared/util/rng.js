// Zufall: Spielmodule bekommen immer ein RNG-Objekt { int(n), float() } von aussen.
// Server: crypto.randomInt (server/random.js). Browser: crypto.getRandomValues. Tests: fester Seed.

/** Seed-basierter Zufall (sfc32) – reproduzierbar für Tests. */
export function seededRng(seed = 1) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = seed >>> 0;
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return (r >>> 0) / 4294967296;
  };
  for (let i = 0; i < 15; i++) next();
  return { float: next, int: (n) => Math.floor(next() * n) };
}

/** Kryptografisch sicherer Zufall über Web Crypto (Browser und Node). */
export function cryptoRng() {
  const buf = new Uint32Array(1);
  const u32 = () => (globalThis.crypto.getRandomValues(buf), buf[0]);
  return {
    float: () => u32() / 4294967296,
    int(n) {
      if (n <= 1) return 0;
      const limit = Math.floor(4294967296 / n) * n;
      let x;
      do x = u32(); while (x >= limit);
      return x % n;
    },
  };
}

/** Fisher-Yates (mischt eine Kopie). */
export function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = (list, rng) => list[rng.int(list.length)];

/** Hängt das RNG unsichtbar an den Zustand (nicht in JSON/Views). */
export function attachRng(state, rng) {
  Object.defineProperty(state, 'rng', { value: rng, enumerable: false, writable: true });
  return state;
}
