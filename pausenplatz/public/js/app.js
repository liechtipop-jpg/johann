// Einstieg: Router, Kopfzeile, Raum-Ablauf. Bildschirme in ui/.
import site from './site-config.js';
import { t } from './i18n/index.js';
import { connect, on, request } from './net.js';
import { store } from './store.js';
import { h, iconButton, showError, toast, clear } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { renderHome } from './ui/home.js';
import { renderProfile } from './ui/profile.js';
import { renderLobby } from './ui/lobby.js';
import { mountGame } from './ui/game.js';
import { OnlineSession } from './session.js';

export const app = { room: null, chat: [], view: null, cleanup: [], game: null };
const root = document.getElementById('app');

export function applyTheme() {
  document.documentElement.dataset.theme = store.settings.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', store.settings.theme === 'light' ? '#f3f5fa' : '#0e1117');
}

export function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  route();
}

function header() {
  const p = store.profile;
  const soundBtn = iconButton(store.settings.sound ? 'soundOn' : 'soundOff', store.settings.sound ? t('game.soundOff') : t('game.soundOn'), () => {
    store.setSetting('sound', !store.settings.sound);
    soundBtn.replaceWith(header().querySelector('[data-sound]'));
  }, { 'aria-pressed': String(store.settings.sound), 'data-sound': '' });
  const themeBtn = iconButton('sun', t('profile.theme'), () => {
    store.setSetting('theme', store.settings.theme === 'light' ? 'dark' : 'light');
    applyTheme();
  });
  const brand = h('a', { href: '/', class: 'brand', onClick: (e) => { e.preventDefault(); leaveRoomIfAny(); navigate('/'); } }, logo(), h('span', {}, site.siteName));
  const chip = h('a', { href: '/profil', class: 'profile-chip', onClick: (e) => { e.preventDefault(); navigate('/profil'); } }, p ? h('span', { class: 'avatar', style: { '--c': p.color } }, p.avatar) : icon('user'), h('span', { class: 'name' }, p?.name ?? t('profile.title')));
  return h('header', { class: 'top' }, brand, soundBtn, themeBtn, chip);
}

export function logo() {
  const wrap = h('span', { 'aria-hidden': 'true' });
  // Eigenes Logo: Pausenplatz-Ball mit Kreidebogen
  wrap.innerHTML = '<svg viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#8b9bff"/><circle cx="16" cy="17" r="8.5" fill="#0e1117"/><path d="M8.5 15c4 2 11 2 15 0M16 8.5c-3 3-3 14 0 17" stroke="#ffd95e" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="25" cy="7" r="2.5" fill="#ff7a7a"/></svg>';
  return wrap.firstChild;
}

export function screen(...children) {
  for (const fn of app.cleanup.splice(0)) fn();
  clear(root);
  root.append(header(), h('main', { class: 'wrap' }, ...children));
  root.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function leaveRoomIfAny() {
  if (app.room) {
    request('room:leave');
    app.room = null;
    store.lastRoom = null;
  }
  app.game?.destroy();
  app.game = null;
}
export const leaveRoom = () => {
  leaveRoomIfAny();
  navigate('/');
};

/** Raum betreten (Code, Link oder QR). Ohne Profil zuerst kurz ins Profil. */
export async function enterRoom(code) {
  if (!store.profile) return renderProfile({ next: `/r/${code}` });
  screen(h('div', { class: 'boot', role: 'status' }, t('app.loading')));
  const res = await request('room:join', { code, profile: store.profile });
  if (res.error) {
    showError(res.error);
    store.lastRoom = null;
    return navigate('/', { replace: true });
  }
  if (location.pathname !== `/r/${res.code}`) history.replaceState({}, '', `/r/${res.code}`);
  store.lastRoom = res.code;
  if (res.spectator) toast(t('room.spectatorFull'));
  else if (res.rejoined) toast(t('room.rejoined'));
  showRoomPhase();
}

/** Lobby oder Spiel je nach Raumphase. */
export function showRoomPhase() {
  const room = app.room;
  if (!room) return;
  if (room.phase === 'lobby') {
    if (app.game) {
      app.game.destroy();
      app.game = null;
    }
    renderLobby(room);
    return;
  }
  if (!app.game || app.game.gameId !== room.gameId || app.game.code !== room.code) {
    app.game?.destroy();
    const session = new OnlineSession(room.gameId);
    app.game = mountGame({ session, gameId: room.gameId, room, online: true });
    app.game.code = room.code;
  } else app.game.updateRoom(room);
}

function route() {
  const path = location.pathname;
  const roomMatch = path.match(/^\/r\/([A-Za-z0-9-]{6,7})$/);
  if (roomMatch) return enterRoom(roomMatch[1].toUpperCase().replace('-', ''));
  if (app.room) leaveRoomIfAny();
  const gameMatch = path.match(/^\/spiel\/([a-z]+)$/);
  if (gameMatch) {
    import('./ui/playLocal.js').then((m) => m.startLocal(gameMatch[1], new URLSearchParams(location.search)));
    return;
  }
  if (path === '/profil') return renderProfile({});
  if (!store.profile) return renderProfile({ next: '/', first: true });
  renderHome();
}

function boot() {
  applyTheme();
  connect();
  on('room:state', (room) => {
    const first = !app.room;
    app.room = room;
    if (location.pathname.startsWith('/r/')) {
      if (first || !app.game || room.phase === 'lobby') showRoomPhase();
      else app.game.updateRoom(room);
    }
  });
  on('chat:msg', (msg) => {
    if (store.muted.has(msg.from.id)) return;
    app.chat.push(msg);
    if (app.chat.length > 150) app.chat.shift();
    document.dispatchEvent(new CustomEvent('chat'));
  });
  on('room:kicked', () => {
    app.room = null;
    app.game?.destroy();
    app.game = null;
    store.lastRoom = null;
    showError('kicked');
    navigate('/', { replace: true });
  });
  let wasConnected = false;
  on('connect', () => {
    if (wasConnected && app.room) request('room:join', { code: app.room.code, profile: store.profile });
    wasConnected = true;
  });
  on('disconnect', () => app.room && toast(t('app.reconnecting')));
  on('notice', (n) => n?.code === 'restart' && toast(t('app.restart')));
  window.addEventListener('popstate', route);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  route();
}

boot();
