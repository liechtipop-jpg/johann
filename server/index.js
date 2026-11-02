'use strict';

// Startpunkt des Servers: liefert die Webseite aus und startet Socket.IO.

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { RoomManager } = require('./lobby');
const { attachSockets } = require('./sockets');

function createServer({ createGame = null } = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    // Nachrichten sind klein; grosse Pakete blocken wir ab.
    maxHttpBufferSize: 16 * 1024,
  });

  const manager = new RoomManager();

  app.disable('x-powered-by');
  // Für Hoster wie Render: zeigt an, dass der Server läuft.
  app.get('/health', (req, res) => {
    res.json({ ok: true, rooms: manager.rooms.size });
  });
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const sockets = attachSockets(io, manager, { createGame });

  return { app, server, io, manager, sockets };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const { server } = createServer();
  server.listen(port, () => {
    console.log(`Kartenhaus läuft auf http://localhost:${port}`);
  });
}

module.exports = { createServer };
