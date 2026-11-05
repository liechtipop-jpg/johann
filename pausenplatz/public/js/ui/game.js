// Spielansicht: grosses Spielfeld, Status (wer ist dran, Zeit, Stand), Seitenleiste mit Spielern, Chat und Verlauf.
import { getGame } from '/shared/games/index.js';
import { t } from '../i18n/index.js';
import { request } from '../net.js';
import { buzz, play } from '../sound.js';
import { store } from '../store.js';
import { app, leaveRoom, navigate, screen } from '../app.js';
import { RENDERERS } from '../games/index.js';
import { avatar, button, fmtTime, h, iconButton, showError } from './dom.js';
import { chatPanel } from './chat.js';
import { rulesSheet } from './home.js';
import { changeGameSheet } from './lobby.js';

export function mountGame({ session, gameId, room, online, localPlayers = [], onRestart }) {
  const game = getGame(gameId);
  let current = room;
  let payload = null;
  let renderer = null;
  let offset = 0;
  let recorded = false;
  let hadTurn = false;
  const turnEl = h('span', { class: 'turn', 'aria-live': 'polite' });
  const timerEl = h('span', { class: 'timer', hidden: true, 'aria-label': 'Restzeit' });
  const scoreEl = h('span', { class: 'badge' });
  const boardEl = h('div', { class: 'board-area', style: { '--accent': game.accent } });
  const plist = h('div', { class: 'plist' });
  const logEl = h('div', { class: 'log', 'aria-label': t('game.history') });
  const side = h('aside', { class: 'side', 'data-open': 'false', 'aria-label': t('game.panel') });
  const toggle = button(t('game.panel'), { kind: 'small side-toggle', iconName: 'panel', onClick: () => (side.dataset.open = side.dataset.open === 'true' ? 'false' : 'true') });
  let overlay = null;
  let chat = null;

  const meId = () => (online ? current.you.id : payload?.me);
  const people = () => {
    if (online) return current.seats.filter((s) => s.player).map((s) => ({ ...s.player, team: s.team, seat: s.index }));
    return localPlayers;
  };
  const nameOf = (id) => people().find((p) => p.id === id)?.name ?? '…';
  const api = {
    act: (action) => session.act(action).then((res) => { if (res?.error) showError(res.error); return res; }),
    me: meId,
    nameOf,
    people,
    online,
    offset: () => offset,
    gameId,
  };

  function drawPlayers() {
    const turnIds = new Set(payload?.view?.turnIds ?? (payload?.view?.toMove ? [payload.view.toMove] : []));
    plist.replaceChildren(...people().map((p) => h('div', { class: `prow ${turnIds.has(p.id) ? 'turn-now' : ''}` }, avatar(p), h('span', { class: 'grow' }, p.name, p.id === meId() && online ? ` (${t('room.you')})` : ''),
      p.team ? h('span', { class: `team-tag ${p.team}` }, t(`teams.${p.team}`)) : null,
      p.isBot ? h('span', { class: 'tiny' }, t('room.bot')) : online && !p.connected ? h('span', { class: 'tiny state-off' }, p.gone ? t('room.gone') : t('room.disconnected')) : null)));
    if (online && current.mode !== 'group') scoreEl.textContent = `${t('game.series')}: ${t('teams.red')} ${current.series.red} : ${current.series.blue} ${t('teams.blue')}`;
    else if (online) scoreEl.textContent = `${t('game.series')}: ${Object.values(current.series.wins).reduce((a, b) => a + b, 0)} ${Object.values(current.series.wins).length ? '' : ''}`;
    scoreEl.hidden = !online;
  }

  function drawStatus() {
    const v = payload.view;
    const mine = payload.legal.length > 0;
    const custom = renderer.turnText?.(v, payload);
    if (payload.result.over) turnEl.textContent = '';
    else if (custom) turnEl.textContent = custom;
    else if (mine) turnEl.textContent = online || session.kind !== 'local' ? t('game.yourTurn') : t('game.localTurn', { name: nameOf(meId()) });
    else if (v.toMove) turnEl.textContent = session.kind === 'ai' && !online ? t('game.thinking') : t('game.theirTurn', { name: nameOf(v.toMove) });
    else turnEl.textContent = t('game.waiting');
    turnEl.classList.toggle('me', mine);
    if (mine && !hadTurn && !payload.result.over) {
      play('turn');
      buzz();
    }
    hadTurn = mine;
  }

  function tickTimer() {
    const deadline = payload?.view?.deadline;
    if (!deadline || payload.result.over) {
      timerEl.hidden = true;
      return;
    }
    const ms = Math.max(0, deadline - (Date.now() + offset));
    timerEl.hidden = false;
    timerEl.textContent = fmtTime(ms);
    timerEl.classList.toggle('low', ms < 10_000);
  }
  const timer = setInterval(tickTimer, 250);

  function showResult() {
    if (overlay || !payload.result.over) return;
    const r = payload.result;
    const me = meId();
    const won = r.winners.includes(me);
    const isPlayer = people().some((p) => p.id === me);
    if (!recorded && isPlayer && (online || session.kind !== 'local')) {
      store.record(gameId, won);
      recorded = true;
    }
    play(won ? 'win' : 'lose');
    const winnerTeam = online ? current.lastResult?.winnerTeam : null;
    // Ohne Gewinner: unentschieden – ausser das Spiel meldet ausdrücklich eine Niederlage (z. B. Sudoku allein).
    const draw = !r.winners.length && !r.lost;
    const title = draw ? t('game.draw') : r.lost && !r.winners.length ? t('game.lost') : online && winnerTeam && current.mode !== 'group' ? t('game.teamWins', { team: t(`teams.${winnerTeam}`) }) : won && (online || session.kind !== 'local') ? t('game.won') : t('game.winner', { name: r.winners.map(nameOf).join(', ') });
    const reason = t(`games.${gameId}.reasons.${r.reason}`);
    const buttons = h('div', { class: 'stack' });
    if (online) {
      if (current.you.isHost) {
        buttons.append(button(t('game.rematch'), { kind: 'primary block', iconName: 'refresh', onClick: () => request('room:rematch').then((res) => res.error && showError(res.error)) }),
          button(t('game.otherGame'), { kind: 'block', iconName: 'grid', onClick: () => changeGameSheet(current) }),
          button(t('game.toLobby'), { kind: 'ghost block', onClick: () => request('room:host', { type: 'lobby' }) }));
      } else buttons.append(h('p', { class: 'muted' }, t('game.waitHostNext')));
      buttons.append(button(t('room.leave'), { kind: 'ghost block', iconName: 'logout', onClick: leaveRoom }));
    } else {
      buttons.append(button(t('game.again'), { kind: 'primary block', iconName: 'refresh', onClick: () => { overlay?.remove(); overlay = null; recorded = false; onRestart?.(); } }),
        button(t('app.back'), { kind: 'ghost block', onClick: () => navigate('/') }));
    }
    overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'result-card' }, h('div', { class: 'big', 'aria-hidden': 'true' }, draw ? '🤝' : won ? '🏆' : '🎲'), h('h2', {}, title), reason !== `games.${gameId}.reasons.${r.reason}` ? h('p', { class: 'muted' }, reason) : null,
        renderer.resultExtra?.(payload) ?? null,
        online && current.mode !== 'group' ? h('p', { class: 'badge' }, `${t('teams.red')} ${current.series.red} : ${current.series.blue} ${t('teams.blue')}`) : null,
        buttons,
        button(t('app.close'), { kind: 'ghost small', onClick: () => { overlay.remove(); overlay = null; } })));
    document.body.append(overlay);
    overlay.querySelector('button')?.focus();
  }

  const leave = online ? leaveRoom : () => navigate('/');
  const shell = h('div', { class: 'game-shell' },
    h('div', { class: 'stack' },
      h('div', { class: 'status-bar' }, turnEl, scoreEl, timerEl, iconButton('book', t('game.rules'), () => rulesSheet(gameId)), iconButton('logout', t('game.leave'), leave)),
      boardEl),
    side);
  side.append(toggle, h('section', { class: 'panel' }, h('h3', {}, t('game.players')), plist));
  if (online) {
    chat = chatPanel(current);
    side.append(chat);
  }
  side.append(h('section', { class: 'panel' }, h('h3', {}, t('game.history')), logEl));
  screen(shell);

  RENDERERS[gameId]().then((mod) => {
    renderer = mod.create(boardEl, api);
    unsub = session.subscribe((p) => {
      offset = p.now - Date.now();
      payload = p;
      renderer.update(p);
      const log = renderer.log?.(p.view) ?? [];
      logEl.replaceChildren(...log.map((line) => h('div', {}, line)));
      logEl.scrollTop = logEl.scrollHeight;
      drawPlayers();
      drawStatus();
      tickTimer();
      if (p.result.over) setTimeout(showResult, 900);
      else if (overlay) {
        overlay.remove();
        overlay = null;
        recorded = false;
      }
    });
    const offView = unsub;
    const offLight = session.subscribeLight?.((events) => renderer.onLight?.(events)) ?? (() => {});
    unsub = () => { offView(); offLight(); };
  });
  let unsub = () => {};

  const handle = {
    gameId,
    updateRoom(room) {
      const rematch = current && room.phase === 'playing' && current.phase === 'results';
      current = room;
      if (rematch) {
        overlay?.remove();
        overlay = null;
        recorded = false;
      }
      if (payload) drawPlayers();
    },
    destroy() {
      clearInterval(timer);
      unsub();
      session.destroy();
      renderer?.destroy();
      chat?.cleanup();
      overlay?.remove();
    },
  };
  app.cleanup.push(() => {
    if (app.game === handle) return;
    handle.destroy();
  });
  return handle;
}
