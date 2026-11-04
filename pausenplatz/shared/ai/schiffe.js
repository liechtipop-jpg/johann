// KI Schiffe versenken: Leicht = zufällig, Mittel = Jagen und Zielen, Schwer = Wahrscheinlichkeitskarte.
export default {
  choose(view, legal, { level = 'mittel', rng }) {
    if (view.phase === 'place') return legal.find((a) => a.type === 'ready') ?? { type: 'random' };
    const shots = new Map(view.enemyShots.map((s) => [s.k, s]));
    const size = view.size;
    const sunkCells = new Set(view.enemySunk.flatMap((ship) => Array.from({ length: ship.len }, (_, i) => (ship.dir === 'h' ? `${ship.x + i},${ship.y}` : `${ship.x},${ship.y + i}`))));
    const blocked = new Set(sunkCells);
    if (!view.options.touching) for (const k of sunkCells) {
      const [x, y] = k.split(',').map(Number);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) blocked.add(`${x + dx},${y + dy}`);
    }
    const open = legal.filter((a) => !blocked.has(`${a.x},${a.y}`));
    const pool = open.length ? open : legal;
    if (level === 'leicht') return pool[rng.int(pool.length)];
    const hits = [...shots.entries()].filter(([k, s]) => s.hit && !sunkCells.has(k)).map(([k]) => k.split(',').map(Number));
    if (level === 'mittel') {
      if (hits.length) {
        const cand = [];
        const aligned = hits.length > 1 ? (hits.every(([, y]) => y === hits[0][1]) ? 'h' : hits.every(([x]) => x === hits[0][0]) ? 'v' : null) : null;
        for (const [x, y] of hits) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (aligned === 'h' && dy) continue;
          if (aligned === 'v' && dx) continue;
          const a = pool.find((p) => p.x === x + dx && p.y === y + dy);
          if (a) cand.push(a);
        }
        if (cand.length) return cand[rng.int(cand.length)];
      }
      const parity = pool.filter((a) => (a.x + a.y) % 2 === 0);
      return (parity.length ? parity : pool)[rng.int((parity.length ? parity : pool).length)];
    }
    // Schwer: alle möglichen Lagen der übrigen Schiffe zählen
    const heat = new Map();
    const miss = new Set([...shots.entries()].filter(([, s]) => !s.hit).map(([k]) => k));
    const hitSet = new Set(hits.map(([x, y]) => `${x},${y}`));
    for (const len of view.enemyLeft) {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) for (const dir of ['h', 'v']) {
        const cells = Array.from({ length: len }, (_, i) => (dir === 'h' ? `${x + i},${y}` : `${x},${y + i}`));
        if (dir === 'h' ? x + len > size : y + len > size) continue;
        if (cells.some((k) => miss.has(k) || blocked.has(k))) continue;
        const covered = cells.filter((k) => hitSet.has(k)).length;
        const weight = 1 + covered * 40;
        for (const k of cells) if (!shots.has(k)) heat.set(k, (heat.get(k) ?? 0) + weight);
      }
    }
    let best = pool[rng.int(pool.length)];
    let bestHeat = -1;
    for (const a of pool) {
      const v = (heat.get(`${a.x},${a.y}`) ?? 0) + rng.float();
      if (v > bestHeat) [best, bestHeat] = [a, v];
    }
    return best;
  },
};
