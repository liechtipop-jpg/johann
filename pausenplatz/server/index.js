// Start: Express liefert die Seite aus, Socket.IO übernimmt die Echtzeit-Verbindungen (gleicher Port).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { renderSVG } from 'uqr';
import { BotPool } from './botPool.js';
import { config } from './config.js';
import { isValidCode, normalizeCode } from './rooms.js';
import { attachSockets } from './sockets.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const pub = join(root, 'public');
const IMPORT_MAP = JSON.stringify({ imports: { 'chess.js': '/vendor/chess.js' } });

function listFiles(dir, base) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path, base) : [`/${relative(base, path).split('\\').join('/')}`];
  });
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  const importMapHash = createHash('sha256').update(IMPORT_MAP).digest('base64');
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", `'sha256-${importMapHash}'`],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", (req) => `ws://${req.headers.host}`, (req) => `wss://${req.headers.host}`],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const html = readFileSync(join(pub, 'index.html'), 'utf8')
    .replaceAll('{{SITE_NAME}}', config.siteName)
    .replace('{{IMPORT_MAP}}', IMPORT_MAP);
  const sendIndex = (_req, res) => res.type('html').set('Cache-Control', 'no-cache').send(html);

  // Offline-Liste für den Service Worker (ohne Build-Schritt immer aktuell)
  const files = [...listFiles(pub, pub).filter((f) => !/\/(index\.html|sw\.js)$/.test(f)), ...listFiles(join(root, 'shared'), root), '/vendor/chess.js', '/js/site-config.js', '/manifest.webmanifest', '/'];
  const version = createHash('sha256').update(files.join('|') + files.map((f) => { try { return statSync(join(f.startsWith('/shared') ? root : pub, f)).mtimeMs; } catch { return 0; } }).join('|')).digest('hex').slice(0, 10);
  const sw = readFileSync(join(pub, 'sw.js'), 'utf8').replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files));

  app.get('/', sendIndex);
  app.get(['/r/:code', '/spiel/:id', '/profil', '/raum'], sendIndex);
  app.get('/sw.js', (_req, res) => res.type('js').set('Cache-Control', 'no-cache').send(sw));
  app.get('/js/site-config.js', (_req, res) => res.type('js').send(`export default ${JSON.stringify({ siteName: config.siteName, limits: { nameMin: config.limits.nameMin, nameMax: config.limits.nameMax, chatMaxLength: config.limits.chatMaxLength } })};`));
  app.get('/manifest.webmanifest', (_req, res) => {
    const manifest = JSON.parse(readFileSync(join(pub, 'manifest.webmanifest'), 'utf8'));
    manifest.name = config.siteName;
    manifest.short_name = config.siteName;
    res.type('application/manifest+json').send(JSON.stringify(manifest));
  });
  app.get('/qr/:code.svg', (req, res) => {
    const code = normalizeCode(req.params.code);
    if (!isValidCode(code)) return res.status(404).end();
    const url = `${req.protocol}://${req.get('host')}/r/${code}`;
    res.type('image/svg+xml').set('Cache-Control', 'public, max-age=3600').send(renderSVG(url, { border: 2, whiteColor: '#ffffff', blackColor: '#0b0d12' }));
  });
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/shared', express.static(join(root, 'shared'), { maxAge: '1h' }));
  app.get('/vendor/chess.js', (_req, res) => res.type('js').sendFile(join(root, 'node_modules/chess.js/dist/esm/chess.js')));
  app.use(express.static(pub, { maxAge: '1h', index: false }));
  app.use((_req, res) => res.status(404).type('html').send(html));
  return app;
}

export function startServer(port = config.port) {
  const app = createApp();
  const server = createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 64_000, serveClient: true });
  const botPool = new BotPool();
  const manager = attachSockets(io, { botPool });
  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, io, manager, botPool, port: server.address().port, close: async () => { io.close(); await botPool.close(); await new Promise((r) => server.close(r)); } }));
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const running = await startServer();
  console.log(`${config.siteName} läuft auf http://localhost:${running.port}`);
  // Sauber beenden (Docker, Hosting, Strg+C): alle kurz informieren, dann schliessen
  let closing = false;
  const shutdown = (signal) => {
    if (closing) return;
    closing = true;
    console.log(`${signal}: ${config.siteName} wird beendet …`);
    running.io.emit('notice', { code: 'restart' });
    setTimeout(() => running.close().finally(() => process.exit(0)), 1500);
    setTimeout(() => process.exit(0), 6000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
