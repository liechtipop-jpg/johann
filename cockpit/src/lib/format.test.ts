import { describe, expect, it } from 'vitest';
import { formatAverage, formatGrade, formatMinutes, parseGrade, parseWeight } from './format';

describe('Zahlen', () => {
  it('liest Noten mit Komma oder Punkt', () => {
    expect(parseGrade('4,5')).toBe(4.5);
    expect(parseGrade(' 5.25 ')).toBe(5.25);
    expect(parseGrade('6')).toBe(6);
    expect(parseGrade('1')).toBe(1);
  });

  it('lehnt ungültige Noten ab', () => {
    expect(parseGrade('6.5')).toBeNull();
    expect(parseGrade('0.5')).toBeNull();
    expect(parseGrade('abc')).toBeNull();
    expect(parseGrade('')).toBeNull();
    expect(parseGrade('4,5,1')).toBeNull();
  });

  it('liest Gewichte', () => {
    expect(parseWeight('0,5')).toBe(0.5);
    expect(parseWeight('2')).toBe(2);
    expect(parseWeight('0')).toBeNull();
  });

  it('formatiert Noten und Schnitte im Schweizer Format', () => {
    expect(formatGrade(4.5)).toBe('4.5');
    expect(formatGrade(5)).toBe('5');
    expect(formatGrade(4.75)).toBe('4.75');
    expect(formatAverage(4.8333)).toBe('4.83');
    expect(formatAverage(5)).toBe('5.00');
  });

  it('formatiert Minuten', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(90)).toBe('1 h 30 min');
  });
});
