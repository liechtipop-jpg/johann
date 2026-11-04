// Eigene Spielkarten als SVG (Rang + Farbe), Rückseite mit Muster.
import { s } from '../ui/dom.js';

const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_NAME = { s: 'Pik', h: 'Herz', d: 'Karo', c: 'Kreuz' };
const RANK = { T: '10', J: 'B', Q: 'D', K: 'K', A: 'A' };
const RANK_NAME = { T: 'Zehn', J: 'Bube', Q: 'Dame', K: 'König', A: 'Ass' };

export const cardLabel = (c) => `${SUIT_NAME[c[1]]} ${RANK_NAME[c[0]] ?? c[0]}`;

export function cardSvg(card, { w = 56, highlight = false, cls = '' } = {}) {
  const hgt = Math.round(w * 1.4);
  const svg = s('svg', { viewBox: '0 0 50 70', width: w, height: hgt, class: `card ${cls}`, role: 'img', 'aria-label': card ? cardLabel(card) : 'verdeckte Karte' });
  if (!card) {
    svg.append(s('rect', { x: 1, y: 1, width: 48, height: 68, rx: 6, fill: '#3b4bb5', stroke: '#e8ecff', 'stroke-width': 2 }));
    for (let i = -60; i < 60; i += 8) svg.append(s('path', { d: `M${i} 0 L${i + 70} 70`, stroke: '#5b6bd5', 'stroke-width': 3 }));
    svg.append(s('rect', { x: 1, y: 1, width: 48, height: 68, rx: 6, fill: 'none', stroke: '#e8ecff', 'stroke-width': 2 }));
    return svg;
  }
  const red = card[1] === 'h' || card[1] === 'd';
  const color = red ? '#d63a3a' : '#1b1f2a';
  svg.append(s('rect', { x: 1, y: 1, width: 48, height: 68, rx: 6, fill: '#fdfcf8', stroke: highlight ? '#ffc94a' : '#c9ccd6', 'stroke-width': highlight ? 4 : 1.5 }));
  svg.append(s('text', { x: 6, y: 17, 'font-size': 15, 'font-weight': 800, fill: color, 'font-family': 'system-ui, sans-serif' }, RANK[card[0]] ?? card[0]));
  svg.append(s('text', { x: 6, y: 31, 'font-size': 13, fill: color }, SUIT[card[1]]));
  svg.append(s('text', { x: 25, y: 52, 'font-size': 26, fill: color, 'text-anchor': 'middle' }, SUIT[card[1]]));
  return svg;
}
