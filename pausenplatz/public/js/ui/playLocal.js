// Spiele ohne Raum: gegen den Computer (KI im Web Worker) oder zu zweit an einem Gerät – auch offline.
import { getGame } from '/shared/games/index.js';
import { sanitizeOptions } from '/shared/util/options.js';
import { t } from '../i18n/index.js';
import { store } from '../store.js';
import { navigate } from '../app.js';
import { LocalSession } from '../session.js';
import { mountGame } from './game.js';

export function startLocal(gameId, params) {
  const game = getGame(gameId);
  const mode = params.get('modus') === 'local' ? 'local' : 'ai';
  if (!game || !game.modes.includes(mode)) return navigate('/', { replace: true });
  let options = {};
  try {
    options = JSON.parse(params.get('opt') ?? '{}');
  } catch {
    options = {};
  }
  options = { ...sanitizeOptions(game, options), mode: mode === 'ai' ? 'ai' : 'local', firstTeam: Math.random() < 0.5 ? 'red' : 'blue' };
  const level = ['leicht', 'mittel', 'schwer'].includes(params.get('stufe')) ? params.get('stufe') : 'mittel';
  const me = store.profile ?? { name: 'Du', avatar: '🙂', color: '#8b9bff' };
  let players;
  let aiPlayers = {};
  let humans;
  if (mode === 'local') {
    players = [{ id: 'p1', name: `${me.name}`, avatar: me.avatar, color: me.color, team: 'red' }, { id: 'p2', name: 'Gast', avatar: '🙂', color: '#ffb46b', team: 'blue' }];
    humans = ['p1', 'p2'];
  } else {
    const bots = Math.max(1, Math.min((game.players.max ?? 2) - 1, Number(params.get('bots')) || game.aiOpponents || 1));
    players = [{ id: 'me', name: me.name, avatar: me.avatar, color: me.color, team: 'red' }];
    for (let i = 0; i < bots; i++) players.push({ id: `cpu${i + 1}`, name: bots > 1 ? `${t('game.computer')} ${i + 1}` : t('game.computer'), avatar: '🤖', color: '#8a93a8', team: 'blue', isBot: true });
    aiPlayers = Object.fromEntries(players.filter((p) => p.isBot).map((p) => [p.id, level]));
    humans = ['me'];
  }
  const session = new LocalSession(gameId, { players, options, aiPlayers, humans });
  mountGame({ session, gameId, online: false, localPlayers: players, onRestart: () => session.restart(true) });
}
