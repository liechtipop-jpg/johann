// DOM-Helfer: Nutzertexte immer per textContent – nie ungefiltert per innerHTML.
import { t } from '../i18n/index.js';
import { icon } from './icons.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === false || value == null) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style') for (const [p, v] of Object.entries(value)) el.style.setProperty(p, v);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === false || value == null) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) if (child != null && child !== false) el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return el;
}

export const clear = (el) => (el.replaceChildren(), el);

export function button(label, { kind = '', iconName, onClick, ...rest } = {}) {
  return h('button', { type: 'button', class: `btn ${kind}`.trim(), onClick, ...rest }, iconName ? icon(iconName) : null, label);
}

export function iconButton(name, label, onClick, extra = {}) {
  return h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, onClick, ...extra }, icon(name));
}

export function toast(message, kind = '') {
  const box = document.getElementById('toasts');
  const el = h('div', { class: `toast ${kind}` }, message);
  box.append(el);
  setTimeout(() => el.remove(), kind === 'error' ? 4200 : 2600);
}

export const errorText = (code) => t(`errors.${code}`) === `errors.${code}` ? t('errors.default') : t(`errors.${code}`);
export const showError = (code) => toast(errorText(code), 'error');

/** Dialog als Bottom-Sheet (Handy) bzw. zentriert (Desktop). Schliesst mit Esc. */
export function sheet(title, body, { onClose } = {}) {
  const dialog = h('dialog', { class: 'sheet', 'aria-label': title });
  const close = () => dialog.close();
  dialog.append(h('div', { class: 'sheet-panel' }, h('div', { class: 'sheet-head' }, h('h2', {}, title), iconButton('close', t('app.close'), close)), h('div', { class: 'sheet-body' }, body)));
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose?.();
  });
  dialog.addEventListener('click', (e) => e.target === dialog && close());
  document.body.append(dialog);
  dialog.showModal();
  return { close, dialog };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = h('textarea', { class: 'sr' });
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  toast(t('room.copied'));
}

export function seg(options, value, onChange, label) {
  const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': label });
  const render = (current) => {
    wrap.replaceChildren(...options.map(([v, text]) => h('button', { type: 'button', 'aria-pressed': String(v === current), onClick: () => { render(v); onChange(v); } }, text)));
  };
  render(value);
  return wrap;
}

export function switchRow(label, checked, onChange) {
  const input = h('input', { type: 'checkbox', role: 'switch', onChange: () => onChange(input.checked) });
  input.checked = checked;
  return h('label', { class: 'switch' }, h('span', {}, label), input);
}

export function avatar(p, size = '') {
  return h('span', { class: `avatar ${size}`.trim(), style: { '--c': p?.color ?? '#8b9bff' }, 'aria-hidden': 'true' }, p?.avatar ?? '🙂');
}

/** Countdown-Anzeige aus einer Server-Deadline (mit Uhrabgleich). */
export function remaining(deadline, offset = 0) {
  return Math.max(0, deadline - (Date.now() + offset));
}
export function fmtTime(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  return `${m}:${String(total % 60).padStart(2, '0')}`;
}
