// Chat: Raum und Team, Schnell-Reaktionen, Stummschalten einzelner Spieler.
import { t } from '../i18n/index.js';
import { request } from '../net.js';
import { store } from '../store.js';
import { app } from '../app.js';
import { avatar, h, iconButton, showError } from './dom.js';

const REACTIONS = ['👍', '😂', '😮', '🔥', '👏'];

export function chatPanel(room) {
  const log = h('div', { class: 'chat-log', role: 'log', 'aria-live': 'polite', 'aria-label': t('chat.title') });
  const teamMode = room.mode !== 'group' && room.you.team;
  let channel = 'room';
  const input = h('input', { class: 'input', maxlength: 200, placeholder: t('chat.placeholder'), 'aria-label': t('chat.placeholder') });
  const draw = () => {
    const msgs = app.chat.filter((m) => !store.muted.has(m.from.id));
    log.replaceChildren(...(msgs.length ? msgs.map((m) => h('div', { class: `chat-msg ${m.channel === 'team' ? 'team' : ''}` }, avatar(m.from), h('div', {}, h('b', {}, m.from.name), ' ', m.reaction ? h('span', { class: 'react', role: 'img', 'aria-label': t(`reactions.${m.reaction}`) }, m.reaction) : h('span', {}, m.text)))) : [h('p', { class: 'tiny' }, t('chat.empty'))]));
    log.scrollTop = log.scrollHeight;
  };
  const send = async (payload) => {
    const res = await request('chat:send', { channel, ...payload });
    if (res.error) showError(res.error);
  };
  const form = h('form', { class: 'chat-form', onSubmit: (e) => { e.preventDefault(); if (input.value.trim()) { send({ text: input.value }); input.value = ''; } } }, input, iconButton('send', t('chat.send'), null, { type: 'submit' }));
  const onChat = () => draw();
  document.addEventListener('chat', onChat);
  draw();
  const channelSeg = teamMode ? h('div', { class: 'seg', role: 'group', 'aria-label': t('chat.title') }, ['room', 'team'].map((c) => h('button', { type: 'button', 'aria-pressed': String(c === channel), onClick: (e) => { channel = c; [...e.currentTarget.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }, c === 'room' ? t('chat.all') : t('chat.team')))) : null;
  const off = !room.chatEnabled ? h('p', { class: 'tiny' }, t('chat.off')) : null;
  const el = h('section', { class: 'panel chat', 'aria-label': t('chat.title') }, h('h3', {}, t('chat.title')), channelSeg, log, off,
    h('div', { class: 'reactions' }, REACTIONS.map((r) => h('button', { type: 'button', 'aria-label': t(`reactions.${r}`), onClick: () => send({ reaction: r }) }, r))), form);
  el.cleanup = () => document.removeEventListener('chat', onChat);
  return el;
}

/** Stummschalten-Knopf für einen Spieler (nur für mich sichtbar). */
export function muteButton(player, rerender) {
  const muted = store.muted.has(player.id);
  return iconButton(muted ? 'soundOn' : 'soundOff', muted ? t('chat.unmute') : t('chat.mute'), () => {
    store.toggleMute(player.id);
    rerender();
  });
}
