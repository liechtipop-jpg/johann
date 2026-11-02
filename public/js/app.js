'use strict';

// Browser-Seite von Kartenhaus. Alles Wichtige (Regeln, Karten, Chips)
// entscheidet der Server – hier wird nur angezeigt und weitergeleitet.

(function () {
  const STORAGE_SESSION = 'kartenhaus.session';
  const STORAGE_NAME = 'kartenhaus.name';

  // ---------- Speicher (kann in privaten Fenstern fehlschlagen) ----------

  function load(storage, key) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* egal – dann eben ohne Speicher */
    }
  }

  function remove(storage, key) {
    try {
      storage.removeItem(key);
    } catch (e) {
      /* egal */
    }
  }

  // Die Sitzung liegt pro Tab im sessionStorage (überlebt Neuladen) und
  // zusätzlich im localStorage (falls der Tab geschlossen wurde).
  function storeSession(session) {
    save(sessionStorage, STORAGE_SESSION, session);
    save(localStorage, STORAGE_SESSION, session);
  }

  function clearSession() {
    remove(sessionStorage, STORAGE_SESSION);
    const shared = load(localStorage, STORAGE_SESSION);
    if (!shared || !state.session || shared.token === state.session.token) {
      remove(localStorage, STORAGE_SESSION);
    }
  }

  // ---------- Zustand ----------

  const state = {
    session: null, // { code, token, playerId, name }
    room: null, // letzter room:state vom Server
    replaced: false,
  };

  const $ = (id) => document.getElementById(id);

  const screens = ['home', 'lobby', 'game', 'replaced', 'loading'];

  function showScreen(name) {
    for (const s of screens) {
      $('screen-' + s).classList.toggle('hidden', s !== name);
    }
  }

  let toastTimer = null;
  function toast(message, kind) {
    const el = $('toast');
    el.textContent = message;
    el.className = 'toast ' + (kind || 'error');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
  }

  function formatChips(n) {
    return Number(n).toLocaleString('de-CH');
  }

  // ---------- Verbindung ----------

  const socket = io({ transports: ['websocket', 'polling'] });

  function emit(event, payload) {
    return new Promise((resolve) => {
      socket.timeout(8000).emit(event, payload, (err, res) => {
        if (err) resolve({ ok: false, error: 'Der Server antwortet nicht. Bitte nochmal versuchen.' });
        else resolve(res || { ok: false, error: 'Leere Antwort vom Server.' });
      });
    });
  }

  function enterRoom(res) {
    state.session = { code: res.code, token: res.token, playerId: res.playerId, name: res.name };
    storeSession(state.session);
    save(localStorage, STORAGE_NAME, res.name);
    // Code in der Adresszeile, damit ein Neuladen am selben Tisch landet.
    history.replaceState(null, '', '?code=' + res.code);
    applyState(res.state);
  }

  function leaveToHome(message) {
    clearSession();
    state.session = null;
    state.room = null;
    history.replaceState(null, '', location.pathname);
    renderTopbar();
    showScreen('home');
    if (message) toast(message, 'info');
  }

  async function tryResume() {
    const own = load(sessionStorage, STORAGE_SESSION);
    const shared = load(localStorage, STORAGE_SESSION);
    const candidate = own || shared;
    const urlCode = new URLSearchParams(location.search).get('code');
    // Wer einen Link zu einem anderen Tisch öffnet, will dort beitreten.
    const wrongTable = !own && candidate && urlCode && urlCode.toUpperCase() !== candidate.code;
    if (!candidate || wrongTable) {
      showScreen('home');
      return;
    }
    const res = await emit('room:resume', {
      code: candidate.code,
      token: candidate.token,
      // Aus einem anderen Tab geerbte Sitzung darf niemanden verdrängen.
      onlyIfOffline: !own,
    });
    if (res.ok) {
      enterRoom(res);
      return;
    }
    if (own) remove(sessionStorage, STORAGE_SESSION);
    if (res.code === 'SESSION_EXPIRED') {
      if (shared && shared.token === candidate.token) remove(localStorage, STORAGE_SESSION);
      if (own) toast('Dieser Tisch existiert nicht mehr.', 'info');
    }
    state.session = null;
    showScreen('home');
  }

  socket.on('connect', () => {
    $('conn-banner').classList.add('hidden');
    if (state.replaced) return;
    if (state.session) {
      // Nach kurzem Verbindungsabbruch zurück an den eigenen Platz.
      emit('room:resume', { code: state.session.code, token: state.session.token }).then((res) => {
        if (res.ok) enterRoom(res);
        else leaveToHome('Deine Sitzung ist abgelaufen.');
      });
    } else {
      tryResume();
    }
  });

  socket.on('disconnect', () => {
    if (!state.replaced) $('conn-banner').classList.remove('hidden');
  });

  socket.on('room:state', (room) => applyState(room));

  socket.on('room:kicked', () => leaveToHome('Der Host hat dich vom Tisch entfernt.'));

  socket.on('session:replaced', () => {
    state.replaced = true;
    remove(sessionStorage, STORAGE_SESSION);
    showScreen('replaced');
  });

  // ---------- Darstellung ----------

  function applyState(room) {
    if (!room || state.replaced) return;
    state.room = room;
    renderTopbar();
    if (room.status === 'lobby') {
      renderLobby(room);
      showScreen('lobby');
    } else {
      renderGame(room);
      showScreen('game');
    }
  }

  function renderTopbar() {
    const info = $('topbar-info');
    if (state.session && state.room) {
      info.textContent = state.session.name + ' · Tisch ' + state.room.code;
    } else {
      info.textContent = '';
    }
  }

  function renderLobby(room) {
    $('lobby-code').textContent = room.code;

    const active = room.players.filter((p) => !p.left);
    $('player-count').textContent = '(' + active.length + '/' + room.maxPlayers + ')';

    const list = $('player-list');
    list.innerHTML = '';
    for (const p of active) {
      const li = document.createElement('li');
      li.className = 'player-item' + (p.id === room.youId ? ' is-you' : '');

      const dot = document.createElement('span');
      dot.className = 'status-dot ' + (p.connected ? 'online' : 'offline');
      dot.title = p.connected ? 'Verbunden' : 'Getrennt';
      li.appendChild(dot);

      const name = document.createElement('span');
      name.className = 'player-name';
      name.textContent = p.name;
      li.appendChild(name);

      if (p.isHost) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-host';
        badge.textContent = 'Host';
        li.appendChild(badge);
      }
      if (p.id === room.youId) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'Du';
        li.appendChild(badge);
      }
      if (room.isHost && p.id !== room.youId) {
        const kick = document.createElement('button');
        kick.className = 'btn btn-small btn-ghost kick';
        kick.textContent = 'Entfernen';
        kick.addEventListener('click', async () => {
          if (!confirm(p.name + ' vom Tisch entfernen?')) return;
          const res = await emit('room:kick', { playerId: p.id });
          if (!res.ok) toast(res.error);
        });
        li.appendChild(kick);
      }
      list.appendChild(li);
    }

    const missing = room.minPlayers - active.length;
    if (missing > 0) {
      $('lobby-hint').textContent = 'Teile den Code mit deinen Freunden. Es fehlt noch mindestens ' + missing + ' Spieler.';
    } else if (room.isHost) {
      $('lobby-hint').textContent = 'Alle da? Dann starte das Spiel.';
    } else {
      $('lobby-hint').textContent = 'Warte, bis der Host das Spiel startet.';
    }

    renderSettings(room);

    const start = $('btn-start');
    start.classList.toggle('hidden', !room.isHost);
    start.disabled = active.length < room.minPlayers;
  }

  function renderSettings(room) {
    const form = $('form-settings');
    for (const el of form.elements) {
      if (!el.name) continue;
      el.disabled = !room.isHost;
      // Nicht überschreiben, während der Host gerade tippt.
      if (document.activeElement !== el) el.value = String(room.settings[el.name]);
    }
    const s = room.settings;
    $('sum-stack').textContent = formatChips(s.startingChips - s.buyIn);
    $('sum-prize').textContent = formatChips(room.prizePool);
    $('settings-hint').textContent = room.isHost
      ? 'Änderungen werden sofort für alle übernommen.'
      : 'Nur der Host kann die Einstellungen ändern.';
  }

  function renderGame(room) {
    $('btn-back-lobby').classList.toggle('hidden', !room.isHost);
  }

  // ---------- Bedienung ----------

  function currentName() {
    const name = $('input-name').value.trim();
    if (!name) {
      toast('Bitte gib zuerst einen Benutzernamen ein.');
      $('input-name').focus();
      return null;
    }
    save(localStorage, STORAGE_NAME, name);
    return name;
  }

  $('btn-create').addEventListener('click', async () => {
    const name = currentName();
    if (!name) return;
    $('btn-create').disabled = true;
    const res = await emit('room:create', { name });
    $('btn-create').disabled = false;
    if (res.ok) enterRoom(res);
    else toast(res.error);
  });

  $('form-join').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = currentName();
    if (!name) return;
    const code = $('input-code').value.trim().toUpperCase();
    if (code.length !== 6) {
      toast('Der Code besteht aus 6 Zeichen.');
      $('input-code').focus();
      return;
    }
    $('btn-join').disabled = true;
    const res = await emit('room:join', { name, code });
    $('btn-join').disabled = false;
    if (res.ok) enterRoom(res);
    else toast(res.error);
  });

  $('input-code').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  $('form-settings').addEventListener('change', async () => {
    if (!state.room || !state.room.isHost) return;
    const form = $('form-settings');
    const settings = {};
    for (const el of form.elements) {
      if (el.name) settings[el.name] = el.value;
    }
    const res = await emit('room:settings', { settings });
    if (!res.ok) {
      toast(res.error);
      if (document.activeElement) document.activeElement.blur();
      if (state.room) renderSettings(state.room);
    }
  });
  $('form-settings').addEventListener('submit', (e) => e.preventDefault());

  $('btn-start').addEventListener('click', async () => {
    const res = await emit('room:start', {});
    if (!res.ok) toast(res.error);
  });

  async function leave() {
    if (!confirm('Tisch wirklich verlassen?')) return;
    await emit('room:leave', {});
    leaveToHome();
  }
  $('btn-leave').addEventListener('click', leave);
  $('btn-game-leave').addEventListener('click', leave);

  $('btn-back-lobby').addEventListener('click', async () => {
    const res = await emit('room:backToLobby', {});
    if (!res.ok) toast(res.error);
  });

  $('btn-reclaim').addEventListener('click', async () => {
    if (!state.session) return location.reload();
    state.replaced = false;
    const res = await emit('room:resume', { code: state.session.code, token: state.session.token });
    if (res.ok) enterRoom(res);
    else leaveToHome('Deine Sitzung ist abgelaufen.');
  });

  function copy(text, okMessage) {
    const done = () => toast(okMessage, 'success');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => prompt('Zum Kopieren:', text));
    } else {
      prompt('Zum Kopieren:', text);
    }
  }

  $('btn-copy-code').addEventListener('click', () => {
    if (state.room) copy(state.room.code, 'Code kopiert!');
  });
  $('btn-copy-link').addEventListener('click', () => {
    if (state.room) copy(location.origin + location.pathname + '?code=' + state.room.code, 'Link kopiert!');
  });

  // ---------- Start ----------

  const savedName = load(localStorage, STORAGE_NAME);
  if (savedName) $('input-name').value = savedName;
  const urlCode = new URLSearchParams(location.search).get('code');
  if (urlCode) $('input-code').value = urlCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
})();
