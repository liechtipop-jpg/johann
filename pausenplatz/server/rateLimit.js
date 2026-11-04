// Begrenzung von Anfragen pro Verbindung (Token-Bucket bzw. Zeitfenster).
export function tokenBucket(perSecond, burst = perSecond) {
  let tokens = burst;
  let last = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(burst, tokens + ((now - last) / 1000) * perSecond);
    last = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}

/** Zählt Ereignisse in einem gleitenden Fenster (z. B. falsche Codes pro Minute). */
export function windowCounter(limit, windowMs) {
  const hits = [];
  return {
    blocked() {
      const now = Date.now();
      while (hits.length && now - hits[0] > windowMs) hits.shift();
      return hits.length >= limit;
    },
    hit() {
      hits.push(Date.now());
    },
  };
}
