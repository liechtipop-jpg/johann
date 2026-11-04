/** Verbindet CSS-Klassen und lässt leere Werte weg. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
