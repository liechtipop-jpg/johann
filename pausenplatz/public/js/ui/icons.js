// Eigene SVG-Icons (Linien, 24×24) und Spiel-Icons (48×48). Keine fremden Grafiken.
const SVG = 'http://www.w3.org/2000/svg';
const P = {
  plus: 'M12 5v14M5 12h14', enter: 'M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4', copy: 'M9 9h10v11H9zM5 15V4h10',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', share: 'M12 3v12M8 7l4-4 4 4M5 12v7h14v-7',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  soundOn: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12', soundOff: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  chat: 'M4 5h16v11H9l-5 4z', book: 'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM8 7h8M8 11h6', close: 'M6 6l12 12M18 6L6 18', back: 'M15 5l-7 7 7 7',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z', bot: 'M5 9h14v10H5zM12 5v4M9 14h.01M15 14h.01M3 13v3M21 13v3', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  check: 'M5 12l5 5L20 7', shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5', play: 'M7 4l13 8-13 8z', refresh: 'M20 11a8 8 0 0 0-14.9-3M4 4v5h5M4 13a8 8 0 0 0 14.9 3M20 20v-5h-5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', logout: 'M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 16l4-4-4-4M19 12H9', panel: 'M4 5h16v14H4zM14 5v14',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  send: 'M4 12l16-8-6 16-3-6z', trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6', flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  handshake: 'M2 12l4-4 4 2 4-3 4 1 4 4-6 6-3-3-2 2-3-3z', rotate: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4', dice: 'M4 4h16v16H4zM8.5 8.5h.01M15.5 15.5h.01M12 12h.01', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  eraser: 'M16 3l5 5-10 10H6l-3-3zM9 21h12', pencil: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
};

export function icon(name, size = 24) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', P[name] ?? P.grid);
  svg.append(path);
  return svg;
}

const G = {
  viergewinnt: '<rect x="5" y="8" width="38" height="32" rx="5" stroke-width="2.5"/><circle cx="14" cy="17" r="3.5" stroke-width="2.2"/><circle cx="24" cy="17" r="3.5" stroke-width="2.2"/><circle cx="34" cy="17" r="3.5" stroke-width="2.2"/><circle cx="14" cy="31" r="3.5" fill="currentColor" stroke="none"/><circle cx="24" cy="31" r="3.5" fill="currentColor" stroke="none"/><circle cx="34" cy="31" r="3.5" stroke-width="2.2"/><path d="M11 44h26" stroke-width="2.5"/>',
  ultimate: '<path d="M18 5v38M30 5v38M5 18h38M5 30h38" stroke-width="2.5"/><path d="M8 8l6 6M14 8l-6 6M34 34l6 6M40 34l-6 6" stroke-width="2"/><circle cx="24" cy="24" r="3" stroke-width="2"/>',
  slf: '<path d="M24 43s-12-11-12-21a12 12 0 0 1 24 0c0 10-12 21-12 21z" stroke-width="2.5"/><path d="M19 26l5-12 5 12M21 22h6" stroke-width="2.2"/><path d="M5 44c4-3 8 3 12 0s8 3 12 0 8 3 14 0" stroke-width="2"/>',
  zeichnen: '<path d="M33 6l9 9-22 22H11v-9z" stroke-width="2.5"/><path d="M28 11l9 9" stroke-width="2.5"/><path d="M6 43c5-4 9 2 14-1s8-5 12-2" stroke-width="2.2"/>',
  wortraten: '<ellipse cx="24" cy="18" rx="12" ry="14" stroke-width="2.5"/><path d="M22 32l2 3 2-3M24 35c-3 4 3 6 0 10" stroke-width="2.2"/><path d="M19 12a6 6 0 0 1 5-3" stroke-width="2"/>',
  ssp: '<circle cx="13" cy="36" r="5" stroke-width="2.5"/><circle cx="29" cy="36" r="5" stroke-width="2.5"/><path d="M16 32L30 9M26 32L12 9" stroke-width="2.5"/><path d="M34 14l8 4-3 9-8 1-3-7z" stroke-width="2.2"/>',
  tictactoe: '<path d="M17 6v36M31 6v36M6 17h36M6 31h36" stroke-width="3"/><path d="M8 8l6 6M14 8l-6 6" stroke-width="3"/><circle cx="24" cy="24" r="4" stroke-width="3"/><path d="M34 34l6 6M40 34l-6 6" stroke-width="3"/>',
  muehle: '<rect x="5" y="5" width="38" height="38" rx="2" stroke-width="2.5"/><rect x="13" y="13" width="22" height="22" stroke-width="2.5"/><rect x="20" y="20" width="8" height="8" stroke-width="2.5"/><path d="M24 5v15M24 28v15M5 24h15M28 24h15" stroke-width="2.5"/><circle cx="5" cy="5" r="4" fill="currentColor"/><circle cx="43" cy="24" r="4" fill="currentColor"/><circle cx="24" cy="35" r="4" fill="currentColor"/>',
  schiffe: '<path d="M6 30h36l-5 9H11z" fill="currentColor" stroke="none"/><path d="M14 30v-8h20v8M20 22v-7h8v7M24 15V8" stroke-width="2.5"/><path d="M4 43c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2" stroke-width="2"/>',
  schach: '<path d="M16 41h18l-2-6c4-3 5-8 4-13-1-6-6-11-13-12l1 4-6 5-4 7 3 3 4-3 3 1c-3 3-7 6-8 14z" fill="currentColor" stroke="none"/><path d="M13 44h22" stroke-width="3"/>',
  poker: '<rect x="8" y="10" width="20" height="28" rx="3" transform="rotate(-12 18 24)" stroke-width="2.5"/><rect x="20" y="9" width="20" height="28" rx="3" fill="currentColor" stroke="none" transform="rotate(10 30 23)"/><path d="M30 17c-4 4-7 6-7 9a3 3 0 0 0 6 1l-1 4h4l-1-4a3 3 0 0 0 6-1c0-3-3-5-7-9z" fill="var(--bg,#0e1117)" stroke="none" transform="rotate(10 30 23)"/>',
  sudoku: '<rect x="5" y="5" width="38" height="38" rx="5" stroke-width="2.5"/><path d="M17.7 5v38M30.3 5v38M5 17.7h38M5 30.3h38" stroke-width="2"/><path d="M10 9.5l2.5-1.5v8" stroke-width="2.2"/><path d="M34 21h5l-3.5 8" stroke-width="2.2"/><path d="M21.2 35a2.9 2.9 0 0 1 5.6 1c0 2-5.6 3.6-5.6 5.5h5.8" stroke-width="2.2"/>',
  wahrheit: '<path d="M20 4h8v8l4 6v24H16V18l4-6z" stroke-width="2.5"/><path d="M16 26h16" stroke-width="2.5"/><path d="M9 40l-4 4M39 40l4 4M8 30H3M40 30h5" stroke-width="2.5"/>',
};

export function gameIcon(id) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  // Statische, eigene Markup-Strings (keine Nutzerdaten)
  svg.innerHTML = G[id] ?? G.tictactoe;
  return svg;
}
