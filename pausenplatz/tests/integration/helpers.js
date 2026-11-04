// Test-Helfer: echter Server im Prozess, simulierte Spieler mit socket.io-client.
import { io as connect } from 'socket.io-client';
import { randomAction } from '../../shared/util/actions.js';
import { seededRng } from '../../shared/util/rng.js';

process.env.BOT_DELAY_MS ??= '0';
process.env.DISCONNECTED_TURN_MS ??= '200';
process.env.RATE_LIMIT_FACTOR ??= '1000';

export async function startTestServer() {
  const { startServer } = await import('../../server/index.js');
  return startServer(0);
}

let counter = 0;
export function makeClient(port, name = `Spieler${++counter}`) {
  const token = `test-token-${Date.now().toString(36)}-${(++counter).toString(36)}-abcdef`;
  const socket = connect(`http://localhost:${port}`, { auth: { token }, transports: ['websocket'], forceNew: true });
  const client = { socket, token, name, profile: { name: name.slice(0, 16), avatar: '🦊', color: '#5db4ff' }, last: null, room: null, views: [] };
  socket.on('game:view', (p) => (client.last = p));
  socket.on('room:state', (r) => (client.room = r));
  client.emit = (event, payload = {}) => new Promise((resolve) => socket.timeout(5000).emit(event, payload, (err, res) => resolve(err ? { error: 'timeout' } : res)));
  client.ready = new Promise((r) => socket.on('connect', r));
  client.close = () => socket.close();
  return client;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function until(check, timeout = 5000, step = 10) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await check();
    if (value) return value;
    await wait(step);
  }
  throw new Error('Zeitlimit überschritten');
}

/** Raum mit n Spielern (Host + Beitretende) im gewünschten Modus anlegen. */
export async function setupRoom(port, gameId, mode, n, options = {}) {
  const clients = Array.from({ length: n }, (_, i) => makeClient(port, `P${i + 1}-${gameId}`.slice(0, 16)));
  await Promise.all(clients.map((c) => c.ready));
  const created = await clients[0].emit('room:create', { gameId, mode, options, profile: clients[0].profile });
  if (created.error) throw new Error(created.error);
  for (const c of clients.slice(1)) {
    const res = await c.emit('room:join', { code: created.code.toLowerCase().replace(/(...)/, '$1-'), profile: c.profile });
    if (res.error) throw new Error(res.error);
    await c.emit('room:ready', { ready: true });
  }
  await until(() => clients[0].room?.canStart);
  return { code: created.code, clients, host: clients[0] };
}

/** Alle spielen zufällige gültige Züge, bis das Spiel vorbei ist. */
export async function playRandom(clients, { seed = 1, timeout = 30000 } = {}) {
  const rng = seededRng(seed);
  const done = new Set();
  let actions = 0;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Spiel hängt (Aktionen: ${actions})`)), timeout);
    const step = async (c) => {
      if (c.busy) return;
      c.busy = true;
      try {
        for (let guard = 0; guard < 6; guard++) {
          const p = c.last;
          if (!p) break;
          if (p.result?.over) {
            done.add(c);
            if (done.size === clients.length) {
              clearTimeout(timer);
              resolve();
            }
            break;
          }
          if (!p.legal?.length) break;
          const action = randomAction(p.legal, rng);
          const res = await c.emit('game:action', { action });
          actions++;
          if (!res.error) break;
          await wait(5);
        }
      } finally {
        c.busy = false;
      }
    };
    for (const c of clients) {
      c.socket.on('game:view', () => setImmediate(() => step(c)));
      step(c);
    }
    const poll = setInterval(() => {
      if (done.size === clients.length) return clearInterval(poll);
      clients.forEach(step);
    }, 50);
  });
  for (const c of clients) c.socket.off('game:view');
  for (const c of clients) c.socket.on('game:view', (p) => (c.last = p));
  return actions;
}
