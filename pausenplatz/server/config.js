// Zentrale Einstellungen. Der Name der Seite steht nur hier (oder in der Umgebungsvariable SITE_NAME).
const env = process.env;
const num = (value, fallback) => (Number.isFinite(Number(value)) && value !== undefined && value !== '' ? Number(value) : fallback);

export const config = {
  siteName: env.SITE_NAME || 'Pausenplatz',
  port: num(env.PORT, 3000),
  limits: {
    maxRooms: num(env.MAX_ROOMS, 500),
    maxSpectators: num(env.MAX_SPECTATORS, 20),
    chatMaxLength: 200,
    nameMin: 2,
    nameMax: 16,
    messageMaxBytes: 20_000,
    reconnectGraceMs: num(env.RECONNECT_GRACE_MS, 3 * 60_000),
    roomIdleMs: num(env.ROOM_IDLE_MS, 30 * 60_000),
    wrongCodesPerMinute: 10,
    chatPerSecond: 1,
    actionsPerSecond: 20,
    customCardsMax: 60,
  },
  botDelayMs: num(env.BOT_DELAY_MS, 700),
  /** Nur für Tests: Rate-Limits für Aktionen hochsetzen (simulierte Spieler sind sehr schnell). */
  rateFactor: num(env.RATE_LIMIT_FACTOR, 1),
  disconnectedTurnMs: num(env.DISCONNECTED_TURN_MS, 30_000),
};
