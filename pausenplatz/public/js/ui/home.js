// Startseite: zwei grosse Aktionen, Code-Kästchen, Spiele-Raster mit Filter und Spielauswahl.
import { GAMES } from '/shared/games/index.js';
import { sanitizeOptions } from '/shared/util/options.js';
import { t, tObj } from '../i18n/index.js';
import { request } from '../net.js';
import { store } from '../store.js';
import { enterRoom, navigate, screen } from '../app.js';
import { button, h, seg, sheet, showError } from './dom.js';
import { gameIcon } from './icons.js';
import { optionsForm } from './options.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
let filter = 'all';

export function codeInput(onComplete) {
  const boxes = [];
  const wrap = h('div', { class: 'code-boxes', role: 'group', 'aria-label': t('room.code') });
  const value = () => boxes.map((b) => b.value).join('');
  const fill = (text, start = 0) => {
    const chars = [...text.toUpperCase()].filter((c) => ALPHABET.includes(c));
    chars.slice(0, 6 - start).forEach((c, i) => (boxes[start + i].value = c));
    const next = Math.min(5, start + chars.length);
    boxes[next].focus();
    if (value().length === 6) onComplete(value());
  };
  for (let i = 0; i < 6; i++) {
    const box = h('input', { inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: 6, 'aria-label': t('home.codeLabel', { n: i + 1 }) });
    box.addEventListener('input', () => {
      const v = box.value;
      box.value = '';
      fill(v, i);
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        boxes[i - 1].value = '';
        boxes[i - 1].focus();
        e.preventDefault();
      }
      if (e.key === 'Enter' && value().length === 6) onComplete(value());
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      fill(e.clipboardData.getData('text'), i);
    });
    boxes.push(box);
    wrap.append(box);
    if (i === 2) wrap.append(h('span', { class: 'dash', 'aria-hidden': 'true' }, '–'));
  }
  return { el: wrap, value, focus: () => boxes[0].focus() };
}

export function modeBadges(game) {
  return game.modes.filter((m) => m !== 'local').map((m) => h('span', { class: `badge ${m === 'ai' ? 'accent' : ''}` }, t(`modes.${m}`)));
}

export function playersText(game) {
  return game.players.min === game.players.max ? t('home.playersFixed', { n: game.players.min }) : t('home.players', game.players);
}

export function renderHome() {
  const join = codeInput((code) => enterRoom(code));
  const grid = h('div', { class: 'games' });
  const filters = h('div', { class: 'filters', role: 'group', 'aria-label': t('home.games') });
  const draw = () => {
    filters.replaceChildren(...['all', 'board', 'cards', 'party', 'ai'].map((f) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(filter === f), onClick: () => { filter = f; draw(); } }, t(`filters.${f}`))));
    const list = GAMES.filter((g) => filter === 'all' || (filter === 'ai' ? g.modes.includes('ai') : g.category === filter));
    grid.replaceChildren(...(list.length ? list.map(gameCard) : [h('p', { class: 'empty' }, t('home.noGames'))]));
  };
  draw();
  screen(
    h('section', { class: 'hero' },
      h('h1', {}, 'Spielen, ohne Anmeldung.'),
      h('p', {}, t('app.tagline')),
      h('div', { class: 'hero-actions' },
        h('div', { class: 'action-card create' }, h('h2', {}, t('home.create')), h('p', { class: 'muted small' }, t('home.createHint')), button(t('home.create'), { kind: 'primary', iconName: 'plus', onClick: () => pickGameSheet() })),
        h('div', { class: 'action-card' }, h('h2', {}, t('home.join')), h('p', { class: 'muted small' }, t('home.joinHint')), join.el, button(t('home.joinBtn'), { iconName: 'enter', onClick: () => (join.value().length === 6 ? enterRoom(join.value()) : join.focus()) })),
      ),
    ),
    h('h2', { class: 'sr' }, t('home.games')),
    filters,
    grid,
  );
}

function gameCard(game) {
  return h('button', { type: 'button', class: 'game-card', style: { '--ga': game.accent }, onClick: () => playSheet(game) },
    h('span', { class: 'gi' }, gameIcon(game.id)),
    h('h3', {}, t(`games.${game.id}.name`)),
    h('span', { class: 'meta' }, `${playersText(game)} · ${game.duration}`),
    h('span', { class: 'badges' }, modeBadges(game)),
  );
}

function pickGameSheet() {
  const list = h('div', { class: 'games' }, GAMES.filter((g) => g.modes.some((m) => ['1v1', '2v2', '3v3', 'group'].includes(m))).map((g) => {
    const card = gameCard(g);
    card.onclick = (e) => {
      e.stopImmediatePropagation();
      ref.close();
      playSheet(g, 'room');
    };
    return card;
  }));
  const ref = sheet(t('home.create'), list);
}

/** Spiel gewählt: Raum erstellen (Modus, Optionen), gegen Computer oder lokal. */
export function playSheet(game, only) {
  const roomModes = game.modes.filter((m) => ['1v1', '2v2', '3v3', 'group'].includes(m));
  const body = h('div', { class: 'stack' });
  const state = { mode: roomModes[0], options: sanitizeOptions(game, {}), level: 'mittel' };
  const ref = sheet(t('play.title', { game: t(`games.${game.id}.name`) }), body);
  body.append(h('p', { class: 'muted' }, t(`games.${game.id}.short`)));
  if (roomModes.length) {
    body.append(
      h('div', { class: 'panel' },
        h('h3', {}, t('play.room')), h('p', { class: 'tiny' }, t('play.roomHint')),
        h('div', { class: 'field' }, h('span', {}, t('play.mode')), seg(roomModes.map((m) => [m, t(`modeLong.${m}`)]), state.mode, (m) => (state.mode = m), t('play.mode'))),
        (game.optionDefs ?? []).some((d) => !d.hidden) ? optionsForm(game, state.options, (o) => (state.options = o)) : null,
        button(t('play.createRoom'), { kind: 'primary block', iconName: 'plus', onClick: async () => {
          if (!store.profile) return navigate('/profil');
          const res = await request('room:create', { gameId: game.id, mode: state.mode, options: state.options, profile: store.profile });
          if (res.error) return showError(res.error);
          ref.close();
          navigate(`/r/${res.code}`);
        } }),
      ),
    );
  }
  if (only !== 'room' && game.modes.includes('ai')) {
    body.append(h('div', { class: 'panel' }, h('h3', {}, t('play.ai')), h('p', { class: 'tiny' }, t('play.aiHint')),
      h('div', { class: 'field' }, h('span', {}, t('play.level')), seg(['leicht', 'mittel', 'schwer'].map((l) => [l, t(`play.levels.${l}`)]), state.level, (l) => (state.level = l), t('play.level'))),
      button(t('play.start'), { kind: 'block', iconName: 'bot', onClick: () => { ref.close(); navigate(`/spiel/${game.id}?modus=ai&stufe=${state.level}&opt=${encodeURIComponent(JSON.stringify(state.options))}`); } })));
  }
  if (only !== 'room' && game.modes.includes('local')) {
    body.append(h('div', { class: 'panel' }, h('h3', {}, t('play.local')), h('p', { class: 'tiny' }, t('play.localHint')),
      button(t('play.start'), { kind: 'block', iconName: 'user', onClick: () => { ref.close(); navigate(`/spiel/${game.id}?modus=local&opt=${encodeURIComponent(JSON.stringify(state.options))}`); } })));
  }
  body.append(button(t('game.rules'), { kind: 'ghost', iconName: 'book', onClick: () => rulesSheet(game.id) }));
}

export function rulesSheet(gameId) {
  const list = h('div', { class: 'rules' });
  for (const [title, text] of tObj(`games.${gameId}.rules`) ?? []) list.append(h('h3', {}, title), h('p', { class: 'muted' }, text));
  sheet(`${t('game.rules')}: ${t(`games.${gameId}.name`)}`, list);
}

