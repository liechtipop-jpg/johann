import { describe, expect, it } from 'vitest';
import { barPattern, clampBpm, clickSeconds, isSilentBar, signatureByLabel, tapTempo, trainerBpm } from './metronome';

describe('Metronom', () => {
  it('baut Takte mit Betonung und Unterteilungen', () => {
    expect(barPattern(signatureByLabel('4/4'), 1, true)).toEqual(['accent', 'beat', 'beat', 'beat']);
    expect(barPattern(signatureByLabel('3/4'), 2, true)).toEqual(['accent', 'sub', 'beat', 'sub', 'beat', 'sub']);
    expect(barPattern(signatureByLabel('2/4'), 3, false)).toEqual(['beat', 'sub', 'sub', 'beat', 'sub', 'sub']);
    expect(barPattern(signatureByLabel('6/8'), 1, true)).toEqual(['accent', 'beat', 'beat', 'group', 'beat', 'beat']);
    expect(barPattern(signatureByLabel('7/8'), 1, true)).toEqual(['accent', 'beat', 'group', 'beat', 'group', 'beat', 'beat']);
    expect(barPattern(signatureByLabel('4/4'), 4, true)).toHaveLength(16);
  });

  it('begrenzt das Tempo auf 30–240 BPM', () => {
    expect(clampBpm(12)).toBe(30);
    expect(clampBpm(300)).toBe(240);
    expect(clampBpm(99.6)).toBe(100);
    expect(clickSeconds(120, 1)).toBe(0.5);
    expect(clickSeconds(120, 4)).toBe(0.125);
  });

  it('erkennt das Tempo aus Taps', () => {
    expect(tapTempo([0])).toBeNull();
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
    expect(tapTempo([0, 1000])).toBe(60);
    // Nach einer langen Pause zählen nur die neuen Taps
    expect(tapTempo([0, 1000, 10_000, 10_400, 10_800])).toBe(150);
    // Höchstens die letzten sechs Taps
    expect(tapTempo([0, 2000, 2500, 3000, 3500, 4000, 4500, 5000])).toBe(120);
    expect(tapTempo([0, 100, 200])).toBe(240);
  });

  it('steigert das Tempo mit dem Tempo-Trainer bis zum Ziel', () => {
    const t = { enabled: true, start: 80, target: 100, step: 5, everyBars: 4 };
    expect([0, 3, 4, 8, 12, 16, 40].map((bar) => trainerBpm(bar, t))).toEqual([80, 80, 85, 90, 95, 100, 100]);
    expect(trainerBpm(8, { ...t, start: 120, target: 100 })).toBe(110);
    expect(trainerBpm(100, { ...t, start: 120, target: 100 })).toBe(100);
  });

  it('schaltet Takte stumm', () => {
    const gap = { enabled: true, play: 3, mute: 1 };
    expect([0, 1, 2, 3, 4, 7, 8].map((bar) => isSilentBar(bar, gap))).toEqual([false, false, false, true, false, true, false]);
    expect(isSilentBar(3, { ...gap, enabled: false })).toBe(false);
    expect(isSilentBar(3, { ...gap, mute: 0 })).toBe(false);
  });
});
