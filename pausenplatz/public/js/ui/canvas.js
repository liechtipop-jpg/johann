// Zeichenfläche: Farben, Strichstärke, Radierer, Rückgängig. Striche werden als Punktlisten (0–1000) übertragen.
import { t } from '../i18n/index.js';
import { button, h } from './dom.js';

export const PALETTE = ['#ffffff', '#ff6b6b', '#ffb46b', '#ffd95e', '#7ee081', '#5db4ff', '#c38bff', '#c9a27e', '#111111'];

export function drawStrokes(ctx, strokes, w, hgt, bg) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, hgt);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const st of strokes) {
    ctx.strokeStyle = st.color === 'erase' ? bg : st.color;
    ctx.lineWidth = (st.width / 1000) * w * 1.6;
    ctx.beginPath();
    st.points.forEach(([x, y], i) => (i ? ctx.lineTo((x / 1000) * w, (y / 1000) * hgt) : ctx.moveTo((x / 1000) * w, (y / 1000) * hgt)));
    if (st.points.length === 1) ctx.lineTo((st.points[0][0] / 1000) * w + 0.1, (st.points[0][1] / 1000) * hgt);
    ctx.stroke();
  }
}

/** Zeichenfläche; onStroke/onUndo nur, wenn man zeichnen darf. */
export function drawingPad({ strokes, editable, onStroke, onUndo }) {
  const canvas = h('canvas', { class: 'pad', width: 640, height: 480, 'aria-label': t('canvas.label'), role: 'img' });
  const ctx = canvas.getContext('2d');
  const bg = '#1b2030';
  let color = PALETTE[0];
  let width = 8;
  let current = null;
  const local = [...strokes];
  const redraw = () => drawStrokes(ctx, current ? [...local, current] : local, canvas.width, canvas.height, bg);
  redraw();
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * 1000)].map((v) => Math.min(1000, Math.max(0, v)));
  };
  if (editable) {
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      current = { points: [point(e)], color, width };
      redraw();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!current || current.points.length >= 300) return;
      current.points.push(point(e));
      redraw();
    });
    const end = () => {
      if (!current) return;
      local.push(current);
      onStroke(current);
      current = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }
  const tools = editable
    ? h('div', { class: 'row pad-tools' },
        PALETTE.map((c) => h('button', { type: 'button', class: 'swatch', style: { '--c': c }, 'aria-label': `${t('canvas.color')} ${c}`, onClick: (e) => { color = c; e.currentTarget.parentNode.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } })),
        h('select', { class: 'input small', 'aria-label': t('canvas.width'), onChange: (e) => (width = Number(e.target.value)) }, [[4, 'dünn'], [8, 'mittel'], [16, 'dick']].map(([v, l]) => h('option', { value: v, selected: v === 8 }, l))),
        button(t('canvas.eraser'), { kind: 'small', iconName: 'eraser', onClick: () => (color = 'erase') }),
        button(t('canvas.undo'), { kind: 'small', iconName: 'undo', onClick: () => { local.pop(); redraw(); onUndo(); } }))
    : null;
  return { el: h('div', { class: 'stack pad-wrap' }, canvas, tools), update(next) { if (!current) { local.splice(0, local.length, ...next); redraw(); } } };
}
