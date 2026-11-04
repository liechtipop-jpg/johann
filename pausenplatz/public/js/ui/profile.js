// Profil: Spitzname, Emoji-Avatar, Farbe, Einstellungen und lokale Statistik.
import { GAMES } from '/shared/games/index.js';
import site from '../site-config.js';
import { t } from '../i18n/index.js';
import { store } from '../store.js';
import { applyTheme, navigate, screen } from '../app.js';
import { avatar, button, h, switchRow, toast } from './dom.js';

export function renderProfile({ next, first } = {}) {
  const p = store.profile ?? { name: '', avatar: store.AVATARS[Math.floor(Math.random() * store.AVATARS.length)], color: store.COLORS[6] };
  const draft = { ...p };
  const preview = h('div', { class: 'row' });
  const drawPreview = () => preview.replaceChildren(avatar(draft, 'lg'), h('b', {}, draft.name || '…'));
  const error = h('p', { class: 'tiny', role: 'alert' });
  const name = h('input', { class: 'input', id: 'nick', maxlength: site.limits.nameMax, autocomplete: 'nickname', value: draft.name, placeholder: 'z. B. Mia' });
  name.addEventListener('input', () => { draft.name = name.value; drawPreview(); });
  const emojis = h('div', { class: 'emoji-grid', role: 'group', 'aria-label': t('profile.avatar') });
  const drawEmojis = () => emojis.replaceChildren(...store.AVATARS.map((e) => h('button', { type: 'button', 'aria-pressed': String(draft.avatar === e), 'aria-label': e, onClick: () => { draft.avatar = e; drawEmojis(); drawPreview(); } }, e)));
  const colors = h('div', { class: 'colors', role: 'group', 'aria-label': t('profile.color') });
  const drawColors = () => colors.replaceChildren(...store.COLORS.map((c) => h('button', { type: 'button', style: { '--c': c }, 'aria-pressed': String(draft.color === c), 'aria-label': `${t('profile.color')} ${c}`, onClick: () => { draft.color = c; drawColors(); drawPreview(); } })));
  drawPreview();
  drawEmojis();
  drawColors();
  const save = () => {
    const clean = draft.name.trim().replace(/\s+/g, ' ');
    if (clean.length < site.limits.nameMin || clean.length > site.limits.nameMax) {
      error.textContent = t('errors.name_length');
      name.focus();
      return;
    }
    store.setProfile({ ...draft, name: clean });
    toast(t('profile.saved'));
    navigate(next ?? '/', { replace: Boolean(next) });
  };
  name.addEventListener('keydown', (e) => e.key === 'Enter' && save());
  const stats = store.stats;
  const statList = GAMES.filter((g) => stats[g.id]).map((g) => h('div', { class: 'stat' }, h('span', { class: 'tiny' }, t(`games.${g.id}.name`)), h('b', {}, `${stats[g.id].won} / ${stats[g.id].played}`), h('span', { class: 'tiny' }, `${t('profile.won')} / ${t('profile.played')}`)));
  screen(
    h('section', { class: 'stack', style: { 'padding-top': '18px' } },
      h('h1', {}, t('profile.title')),
      first ? h('p', { class: 'muted' }, t('profile.first')) : null,
      h('div', { class: 'panel' }, preview,
        h('label', { class: 'field', for: 'nick' }, h('span', {}, t('profile.name')), name, h('span', { class: 'tiny' }, t('profile.nameHint'))), error,
        h('div', { class: 'field' }, h('span', {}, t('profile.avatar')), emojis),
        h('div', { class: 'field' }, h('span', {}, t('profile.color')), colors),
        button(t('profile.save'), { kind: 'primary', iconName: 'check', onClick: save })),
      h('div', { class: 'panel' }, h('h2', {}, t('profile.settings')),
        switchRow(t('profile.theme'), store.settings.theme === 'light', (v) => { store.setSetting('theme', v ? 'light' : 'dark'); applyTheme(); }),
        switchRow(t('profile.sound'), store.settings.sound, (v) => store.setSetting('sound', v)),
        switchRow(t('profile.vibrate'), store.settings.vibrate, (v) => store.setSetting('vibrate', v))),
      h('div', { class: 'panel' }, h('h2', {}, t('profile.stats')), statList.length ? h('div', { class: 'stats' }, statList) : h('p', { class: 'muted' }, t('profile.noStats')),
        statList.length ? button(t('profile.resetStats'), { kind: 'ghost small', onClick: () => { store.resetStats(); toast(t('profile.resetDone')); renderProfile({ next, first }); } }) : null),
    ),
  );
  if (!store.profile) name.focus();
}
