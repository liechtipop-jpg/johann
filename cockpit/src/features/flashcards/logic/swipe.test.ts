import { describe, expect, it } from 'vitest';
import { swipeRating } from './swipe';

describe('Wischgesten', () => {
  it('ordnet die vier Richtungen den Bewertungen zu', () => {
    expect(swipeRating(-120, 10)).toBe(1);
    expect(swipeRating(5, 100)).toBe(2);
    expect(swipeRating(120, -20)).toBe(3);
    expect(swipeRating(-10, -100)).toBe(4);
  });

  it('ignoriert kurze Bewegungen', () => {
    expect(swipeRating(40, 30)).toBeNull();
    expect(swipeRating(0, 0)).toBeNull();
  });
});
