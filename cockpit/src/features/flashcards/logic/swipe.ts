import type { Rating } from './scheduler';

export const SWIPE_THRESHOLD = 80;

/** Wischgeste → Bewertung: links Nochmal, unten Schwer, rechts Gut, oben Leicht. */
export function swipeRating(dx: number, dy: number, threshold = SWIPE_THRESHOLD): Rating | null {
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= threshold) return 3;
    if (dx <= -threshold) return 1;
  } else {
    if (dy <= -threshold) return 4;
    if (dy >= threshold) return 2;
  }
  return null;
}
