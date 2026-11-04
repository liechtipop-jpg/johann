export const LANGUAGES = [
  { value: 'de-CH', label: 'Deutsch' },
  { value: 'fr-FR', label: 'Französisch' },
  { value: 'en-GB', label: 'Englisch' },
  { value: 'it-IT', label: 'Italienisch' },
  { value: 'es-ES', label: 'Spanisch' },
  { value: '', label: 'Andere (ohne Vorlesen)' },
] as const;

export function languageLabel(lang: string | undefined): string {
  return LANGUAGES.find((l) => l.value === (lang ?? ''))?.label ?? lang ?? '';
}

export const DIRECTION_OPTIONS = [
  { value: 'fwd' as const, label: 'Vorder → Rück' },
  { value: 'rev' as const, label: 'Rück → Vorder' },
  { value: 'both' as const, label: 'Beide' },
];
