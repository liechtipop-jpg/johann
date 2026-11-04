// Lokale Daten: Profil, Einstellungen, Statistik und das geheime Sitzungs-Token (nur localStorage).
const KEY = 'pausenplatz.v1';
const AVATARS = ['🦊', '🐼', '🐸', '🐯', '🦁', '🐨', '🐙', '🦄', '🐵', '🐧', '🦉', '🐳', '🐝', '🦖', '🐢', '🐲', '👾', '🤖', '🚀', '⚡', '🌈', '🍕', '⚽', '🎸'];
const COLORS = ['#ff7a7a', '#ffb46b', '#ffd95e', '#7ee081', '#4fd1c5', '#5db4ff', '#8b9bff', '#c38bff', '#ff8bd1', '#c9a27e'];

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}
const data = load();
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* Privatmodus: dann eben nur für diese Sitzung */
  }
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const store = {
  AVATARS,
  COLORS,
  get token() {
    if (!data.token) {
      data.token = randomToken();
      save();
    }
    return data.token;
  },
  get profile() {
    return data.profile ?? null;
  },
  setProfile(profile) {
    data.profile = profile;
    save();
  },
  get settings() {
    return { theme: 'dark', sound: false, vibrate: false, ...(data.settings ?? {}) };
  },
  setSetting(key, value) {
    data.settings = { ...this.settings, [key]: value };
    save();
  },
  get stats() {
    return data.stats ?? {};
  },
  record(gameId, won) {
    const s = (data.stats ??= {});
    const entry = (s[gameId] ??= { played: 0, won: 0 });
    entry.played++;
    if (won) entry.won++;
    save();
  },
  resetStats() {
    data.stats = {};
    save();
  },
  get lastRoom() {
    return data.lastRoom ?? null;
  },
  set lastRoom(code) {
    data.lastRoom = code;
    save();
  },
  get muted() {
    return new Set(data.muted ?? []);
  },
  toggleMute(id) {
    const set = this.muted;
    set.has(id) ? set.delete(id) : set.add(id);
    data.muted = [...set].slice(-100);
    save();
  },
};
