// Verbindung zum Server (Socket.IO, gleicher Port). Anfragen mit Antwort (ack) und Zeitlimit.
import { io } from '/socket.io/socket.io.esm.min.js';
import { store } from './store.js';

const listeners = new Map();
let socket = null;

export function connect() {
  if (socket) return socket;
  socket = io({ auth: { token: store.token }, transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });
  for (const event of ['room:state', 'game:view', 'chat:msg', 'room:kicked', 'notice', 'connect', 'disconnect']) {
    socket.on(event, (payload) => (listeners.get(event) ?? []).forEach((fn) => fn(payload)));
  }
  return socket;
}

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

export const connected = () => Boolean(socket?.connected);

export function request(event, payload = {}, timeout = 8000) {
  connect();
  return new Promise((resolve) => {
    if (!socket.connected && !navigator.onLine) return resolve({ error: 'offline' });
    socket.timeout(timeout).emit(event, payload, (err, res) => resolve(err ? { error: 'timeout' } : (res ?? { error: 'default' })));
  });
}
