// Lobby: Code, Link, QR, Teams mit Plätzen, Bereit, Host-Werkzeuge, Zuschauer und Chat.
import { getGame, GAMES } from '/shared/games/index.js';
import { hasAi } from '/shared/ai/index.js';
import { t } from '../i18n/index.js';
import { request } from '../net.js';
import { app, leaveRoom, screen } from '../app.js';
import { avatar, button, copyText, h, iconButton, seg, sheet, showError, switchRow, toast } from './dom.js';
import { icon } from './icons.js';
import { chatPanel, muteButton } from './chat.js';
import { optionsForm, optionsSummary } from './options.js';
import { playersText } from './home.js';

const fmt = (code) => `${code.slice(0, 3)}-${code.slice(3)}`;
const host = (cmd) => request('room:host', cmd).then((res) => res.error && showError(res.error));

function seatButton(room, seat, rerender) {
  const p = seat.player;
  const me = room.you;
  if (!p) {
    const canTake = me.seat !== seat.index;
    return h('button', { type: 'button', class: 'seat free', onClick: canTake ? () => request('room:seat', { seat: seat.index }).then((r) => r.error && showError(r.error)) : null }, icon('plus'), h('span', { class: 'who' }, t('room.free')));
  }
  const isMe = p.id === me.id;
  const state = p.isBot ? t('room.bot') : !p.connected ? t('room.disconnected') : p.ready || p.isHost ? t('room.ready') : t('room.notReady');
  const children = [avatar(p), h('span', { class: 'who' }, h('b', {}, p.name, isMe ? ` (${t('room.you')})` : ''), h('span', { class: `state ${p.connected && (p.ready || p.isHost || p.isBot) ? 'state-ok' : !p.connected ? 'state-off' : ''}` }, state))];
  if (p.isHost) children.push(h('span', { title: t('room.host'), 'aria-label': t('room.host') }, icon('crown', 20)));
  if (me.isHost && !isMe) children.push(iconButton('gear', `${p.name}: ${t('room.hostTools')}`, () => playerMenu(room, p)));
  else if (!isMe && !p.isBot) children.push(muteButton(p, rerender));
  return h('div', { class: 'seat' }, children);
}

function playerMenu(room, p) {
  const ref = sheet(p.name, h('div', { class: 'stack' },
    h('div', { class: 'field' }, h('span', {}, t('room.moveTo')), h('div', { class: 'seg' }, room.seats.filter((s) => s.player?.id !== p.id).map((s) => h('button', { type: 'button', onClick: () => { host({ type: 'move', playerId: p.id, seat: s.index }); ref.close(); } }, `${s.team ? t(`teams.${s.team}`) : 'Platz'} ${s.index + 1}${s.player ? ` (${s.player.name})` : ''}`)))),
    !p.isBot ? button(t('room.toSpectators'), { iconName: 'eye', onClick: () => { host({ type: 'spectate', playerId: p.id }); ref.close(); } }) : null,
    button(t('room.kick'), { kind: 'danger', iconName: 'close', onClick: () => { host({ type: 'kick', playerId: p.id }); ref.close(); } }),
  ));
}

export function renderLobby(room) {
  const game = getGame(room.gameId);
  const me = room.you;
  const rerender = () => renderLobby(app.room);
  const link = `${location.origin}/r/${room.code}`;
  const teams = room.mode === 'group'
    ? h('div', { class: 'teams' }, h('section', { class: 'team' }, h('h3', {}, t('room.players')), room.seats.map((s) => seatButton(room, s, rerender))))
    : h('div', { class: 'teams two' }, ['red', 'blue'].map((team) => h('section', { class: `team ${team}`, 'aria-label': t(team === 'red' ? 'room.teamRed' : 'room.teamBlue') }, h('h3', {}, h('span', { class: `team-tag ${team}` }, t(`teams.${team}`)), t(team === 'red' ? 'room.teamRed' : 'room.teamBlue')), room.seats.filter((s) => s.team === team).map((s) => seatButton(room, s, rerender)))));
  const missing = room.missing.map((m) => (m.type === 'seats' ? t('room.missingSeats', { n: m.count }) : m.type === 'players' ? t('room.missingPlayers', { n: m.count }) : t('room.missingReady', { name: m.name })));
  const mySeat = room.seats[me.seat];
  const ready = mySeat?.player?.ready;
  const actions = h('div', { class: 'row' });
  if (me.isHost) {
    actions.append(button(t('room.start'), { kind: 'primary', iconName: 'play', disabled: !room.canStart, onClick: async () => { const res = await request('room:start'); if (res.error) showError(res.error); } }));
  } else if (me.seat >= 0) {
    actions.append(button(ready ? t('room.unready') : t('room.readyBtn'), { kind: ready ? '' : 'primary', iconName: 'check', onClick: () => request('room:ready', { ready: !ready }) }));
  }
  actions.append(button(t('room.leave'), { kind: 'ghost', iconName: 'logout', onClick: leaveRoom }));
  const hostTools = me.isHost ? h('section', { class: 'panel' }, h('h3', {}, t('room.hostTools')),
    h('div', { class: 'row' },
      room.mode !== 'group' ? button(t('room.shuffle'), { kind: 'small', iconName: 'shuffle', onClick: () => host({ type: 'shuffle' }) }) : null,
      hasAi(room.gameId) && (game.botModes ?? []).includes(room.mode) ? button(t('room.fillBots'), { kind: 'small', iconName: 'bot', onClick: () => botSheet() }) : null,
      (game.optionDefs ?? []).some((d) => !d.hidden) ? button(t('room.options'), { kind: 'small', iconName: 'gear', onClick: () => optionsSheet(room, game) }) : null,
      button(t('room.changeGame'), { kind: 'small', iconName: 'grid', onClick: () => changeGameSheet(room) }),
      room.gameId === 'wahrheit' && room.phase === 'lobby' ? button(t('room.customCards'), { kind: 'small', iconName: 'plus', onClick: () => cardSheet() }) : null),
    switchRow(t('room.lock'), room.locked, (v) => host({ type: 'lock', enabled: v })),
    switchRow(t('room.chatOn'), room.chatEnabled, (v) => host({ type: 'chat', enabled: v })),
    room.mode !== 'group' ? switchRow(t('room.teamChatOn'), room.teamChatEnabled, (v) => host({ type: 'teamChat', enabled: v })) : null) : null;
  const chat = chatPanel(room);
  screen(
    h('section', { class: 'room-head' },
      h('div', { class: 'row' }, h('h1', {}, t(`games.${room.gameId}.name`)), h('span', { class: 'badge accent' }, t(`modeLong.${room.mode}`)), h('span', { class: 'badge' }, playersText(game))),
      h('div', { class: 'share' },
        h('div', { class: 'stack' }, h('span', { class: 'tiny' }, t('room.code')), h('div', { class: 'code-big', 'aria-label': `${t('room.code')} ${[...room.code].join(' ')}` }, fmt(room.code)),
          h('div', { class: 'row' }, button(t('room.copy'), { kind: 'small', iconName: 'copy', onClick: () => copyText(fmt(room.code)) }), button(t('room.link'), { kind: 'small', iconName: 'link', onClick: () => copyText(link) }),
            navigator.share ? button(t('room.share'), { kind: 'small', iconName: 'share', onClick: () => navigator.share({ title: t(`games.${room.gameId}.name`), url: link }).catch(() => {}) }) : null),
          h('p', { class: 'tiny' }, optionsSummary(game, room.options), room.customCards ? ` · ${t('room.cards', { n: room.customCards })}` : '')),
        h('img', { class: 'qr', src: `/qr/${room.code}.svg`, alt: t('room.qrAlt', { code: fmt(room.code) }), width: 160, height: 160 })),
    ),
    h('div', { class: 'lobby-grid' },
      h('div', { class: 'stack' }, teams,
        room.spectators.length ? h('section', { class: 'panel' }, h('h3', {}, `${t('room.spectators')} (${room.spectators.length})`), h('div', { class: 'row' }, room.spectators.map((p) => h('span', { class: 'badge' }, p.avatar, ' ', p.name)))) : null,
        me.seat < 0 ? h('p', { class: 'muted' }, t('room.spectating')) : null,
        h('section', { class: 'panel', 'aria-live': 'polite' }, room.canStart ? h('p', { class: 'state-ok' }, t('room.allSet')) : h('ul', { class: 'muted small' }, missing.map((m) => h('li', {}, m))), me.isHost ? null : h('p', { class: 'tiny' }, t('room.waitHost')), actions),
        hostTools),
      chat),
  );
  app.cleanup.push(() => chat.cleanup());
}

function botSheet() {
  let level = 'mittel';
  const ref = sheet(t('room.fillBots'), h('div', { class: 'stack' }, seg(['leicht', 'mittel', 'schwer'].map((l) => [l, t(`play.levels.${l}`)]), level, (l) => (level = l), t('play.level')),
    button(t('room.fillBots'), { kind: 'primary', iconName: 'bot', onClick: () => { host({ type: 'fillBots', level }); ref.close(); } })));
}

function optionsSheet(room, game) {
  let options = { ...room.options };
  const ref = sheet(t('room.options'), h('div', { class: 'stack' }, optionsForm(game, options, (o) => (options = o)), button(t('profile.save'), { kind: 'primary', iconName: 'check', onClick: () => { host({ type: 'options', options }); ref.close(); } })));
}

export function changeGameSheet(room) {
  const list = h('div', { class: 'stack' });
  const ref = sheet(t('room.changeGame'), list);
  for (const g of GAMES) {
    const modes = g.modes.filter((m) => ['1v1', '2v2', '3v3', 'group'].includes(m));
    if (!modes.length) continue;
    list.append(h('div', { class: 'panel' }, h('h3', {}, t(`games.${g.id}.name`)), h('div', { class: 'seg' }, modes.map((m) => h('button', { type: 'button', 'aria-pressed': String(g.id === room.gameId && m === room.mode), onClick: () => { host({ type: 'game', gameId: g.id, mode: m }); ref.close(); } }, t(`modeLong.${m}`))))));
  }
}

function cardSheet() {
  let type = 'truth';
  const text = h('textarea', { class: 'input', rows: 3, maxlength: 160, placeholder: 'z. B. Was war dein schönstes Ferienerlebnis?' });
  const ref = sheet(t('room.addCard'), h('div', { class: 'stack' }, seg([['truth', 'Wahrheit'], ['dare', 'Tat']], type, (v) => (type = v), t('room.addCard')), text,
    button(t('room.addCard'), { kind: 'primary', iconName: 'plus', onClick: async () => {
      const res = await request('room:card', { type, text: text.value });
      if (res.error) return showError(res.error);
      toast(t('room.cardAdded'));
      ref.close();
    } })));
}
