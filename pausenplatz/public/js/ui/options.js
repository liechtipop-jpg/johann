// Formular für Spiel-Optionen aus den optionDefs des Spielmoduls.
import { t, tObj } from '../i18n/index.js';
import { h, seg, switchRow } from './dom.js';

export function optionLabel(gameId, key) {
  return tObj(`games.${gameId}.options.${key}`) ?? key;
}
export function valueLabel(gameId, key, value) {
  const v = tObj(`games.${gameId}.values.${key}.${value}`);
  return typeof v === 'string' ? v : String(value);
}

export function optionsForm(game, values, onChange) {
  const current = { ...values };
  const set = (key, value) => {
    current[key] = value;
    onChange({ ...current });
  };
  return h('div', { class: 'stack' }, (game.optionDefs ?? []).filter((d) => !d.hidden).map((def) => {
    const label = optionLabel(game.id, def.key);
    if (def.type === 'bool') return switchRow(label, Boolean(current[def.key]), (v) => set(def.key, v));
    if (def.type === 'select') return h('div', { class: 'field' }, h('span', {}, label), seg(def.values.map((v) => [v, valueLabel(game.id, def.key, v)]), current[def.key], (v) => set(def.key, v), label));
    if (def.type === 'multi') {
      const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': label });
      const render = () => wrap.replaceChildren(...def.values.map((v) => h('button', { type: 'button', 'aria-pressed': String(current[def.key].includes(v)), onClick: () => {
        const list = current[def.key].includes(v) ? current[def.key].filter((x) => x !== v) : [...current[def.key], v];
        if (list.length) set(def.key, list);
        render();
      } }, valueLabel(game.id, def.key, v))));
      render();
      return h('div', { class: 'field' }, h('span', {}, label), wrap);
    }
    const input = h('input', { class: 'input', type: 'number', min: def.min, max: def.max, step: def.step ?? 1, value: current[def.key], onChange: () => {
      const n = Math.round(Number(input.value));
      set(def.key, Math.min(def.max, Math.max(def.min, Number.isFinite(n) ? n : def.default)));
      input.value = current[def.key];
    } });
    return h('label', { class: 'field' }, h('span', {}, label), input);
  }));
}

export function optionsSummary(game, values) {
  return (game.optionDefs ?? []).filter((d) => !d.hidden).map((d) => `${optionLabel(game.id, d.key)}: ${d.type === 'bool' ? (values[d.key] ? 'ja' : 'nein') : d.type === 'multi' ? values[d.key].map((v) => valueLabel(game.id, d.key, v)).join(', ') : valueLabel(game.id, d.key, values[d.key])}`).join(' · ') || t('play.options');
}
