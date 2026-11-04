import { describe, expect, it } from 'vitest';
import { normalizeSearch, rankCommands } from './commands';

const commands = [
  { label: 'Heute' },
  { label: 'Noten' },
  { label: 'Note erfassen', keywords: 'neu' },
  { label: 'Prüfung erfassen', keywords: 'neu test' },
  { label: 'Französisch', keywords: 'fach' },
  { label: 'Design: Dunkel', keywords: 'theme modus' },
];

describe('Befehlspalette', () => {
  it('ignoriert Akzente und Gross-/Kleinschreibung', () => {
    expect(normalizeSearch('Prüfung Französisch')).toBe('prufung franzosisch');
  });

  it('zeigt ohne Suche alle Befehle in der ursprünglichen Reihenfolge', () => {
    expect(rankCommands(commands, '  ').map((c) => c.label)).toEqual(commands.map((c) => c.label));
  });

  it('sortiert Treffer am Anfang zuerst', () => {
    expect(rankCommands(commands, 'not').map((c) => c.label)).toEqual(['Noten', 'Note erfassen']);
  });

  it('findet über Stichwörter und mehrere Suchwörter', () => {
    expect(rankCommands(commands, 'neu').map((c) => c.label)).toEqual(['Note erfassen', 'Prüfung erfassen']);
    expect(rankCommands(commands, 'prufung erf').map((c) => c.label)).toEqual(['Prüfung erfassen']);
    expect(rankCommands(commands, 'dunkel').map((c) => c.label)).toEqual(['Design: Dunkel']);
    expect(rankCommands(commands, 'franz')[0].label).toBe('Französisch');
    expect(rankCommands(commands, 'xyz')).toEqual([]);
  });
});
