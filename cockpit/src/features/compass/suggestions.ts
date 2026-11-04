import type { TimelineEvent } from '@/db/schemas';
import type { ISODate } from '@/lib/dates';

/**
 * Vorschlagspaket für den Studienwahl-Kompass. Termine nur mit Link zur offiziellen Quelle
 * (Stand der Recherche: November 2026). Was nicht bestätigt ist, bleibt ohne Datum.
 */
export const SOURCES = {
  ethBachelor: 'https://ethz.ch/en/studies/bachelor/application/swiss-matriculation-certificate.html',
  ethInfoDays: 'https://ethz.ch/en/studies/bachelor/prospective-students/orientation-events/information-days-at-eth-zurich.html',
  uzhDeadlines: 'https://www.uzh.ch/de/studies/application/deadlines.html',
  uzhInfoDays: 'https://www.mnf.uzh.ch/de/studium/veranstaltungen/studieninformationstage-der-uzh.html',
  hsgDeadlines: 'https://www.unisg.ch/en/studying/admission/application-deadlines/',
  stanfordMse: 'https://msande.stanford.edu/academics-admissions/graduate/admission/ms-admission',
} as const;

export type OptionKey = 'eth-mavt' | 'eth-stanford' | 'eth-cs' | 'uzh-bf' | 'hsg-bwl' | 'abroad';

export const OPTION_SUGGESTIONS: ReadonlyArray<{ key: OptionKey; name: string; links: Array<{ label: string; url: string }> }> = [
  {
    key: 'eth-mavt',
    name: 'ETH Maschineningenieurwissenschaften (BSc) → MTEC (MSc)',
    links: [{ label: 'ETH: Anmeldung mit Schweizer Maturität', url: SOURCES.ethBachelor }],
  },
  {
    key: 'eth-stanford',
    name: 'ETH-Bachelor → Stanford MS&E',
    links: [
      { label: 'ETH: Anmeldung mit Schweizer Maturität', url: SOURCES.ethBachelor },
      { label: 'Stanford MS&E: Zulassung Master', url: SOURCES.stanfordMse },
    ],
  },
  { key: 'eth-cs', name: 'ETH Informatik', links: [{ label: 'ETH: Anmeldung mit Schweizer Maturität', url: SOURCES.ethBachelor }] },
  {
    key: 'uzh-bf',
    name: 'UZH Banking & Finance (BA) → Master Banking & Finance oder Quantitative Finance',
    links: [{ label: 'UZH: Bewerbungsfristen', url: SOURCES.uzhDeadlines }],
  },
  { key: 'hsg-bwl', name: 'HSG BWL (BA) → Master Banking & Finance', links: [{ label: 'HSG: Anmeldefristen', url: SOURCES.hsgDeadlines }] },
  { key: 'abroad', name: 'Studium im englischsprachigen Ausland (bitte eintragen)', links: [] },
];

export const CRITERION_SUGGESTIONS: readonly string[] = [
  'Sehr gut bezahlt',
  'Gefragt am Arbeitsmarkt',
  'Aufstiegschancen',
  'Schwer durch KI ersetzbar',
  'Vorbereitung aufs Führen einer bestehenden Firma',
  'Wissen übers Investieren (Aktien, Krypto)',
  'Sicherheit und Planbarkeit',
  'Leben und Arbeiten in der Schweiz',
  'Interesse am Stoff',
  'Machbarkeit',
];

/** Nächster Termin «Tag/Monat» ab heute (für jährlich gleiche Fristen). */
export function nextOccurrence(month: number, day: number, today: ISODate): ISODate {
  const year = Number(today.slice(0, 4));
  const candidate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return candidate >= today ? candidate : `${year + 1}${candidate.slice(4)}`;
}

const STAND = 'Stand der Recherche: November 2026 – vor der Anmeldung auf der offiziellen Seite prüfen.';

/** Zeitstrahl-Vorschläge. `optionKey` verknüpft einen Termin mit einer vorgeschlagenen Option. */
export function timelineSuggestions(today: ISODate): Array<Omit<TimelineEvent, 'id' | 'optionId'> & { optionKey?: OptionKey }> {
  const ethInfoDay: ISODate = '2027-09-08';
  return [
    {
      title: 'ETH Zürich: Anmeldeschluss Bachelor (Schweizer Maturität)',
      kind: 'deadline',
      date: nextOccurrence(4, 30, today),
      url: SOURCES.ethBachelor,
      notes: `Anmeldung jeweils vom 1. Dezember bis 30. April für den Studienbeginn im Herbst. ${STAND}`,
    },
    {
      title: 'ETH Zürich: Studieninformationstage',
      kind: 'infoday',
      date: ethInfoDay >= today ? ethInfoDay : undefined,
      url: SOURCES.ethInfoDays,
      notes:
        ethInfoDay >= today
          ? `8. und 9. September 2027. ${STAND}`
          : 'Jeweils Anfang September – Datum auf der offiziellen Seite nachschlagen.',
    },
    {
      title: 'UZH: Bewerbungsschluss Bachelor',
      kind: 'deadline',
      date: nextOccurrence(4, 30, today),
      url: SOURCES.uzhDeadlines,
      notes: `Reguläre Frist vom 1. Januar bis 30. April für das Herbstsemester; mit Schweizer Maturität danach bis 31. Juli mit Zuschlag. ${STAND}`,
      optionKey: 'uzh-bf',
    },
    {
      title: 'UZH: Studieninformationstage',
      kind: 'infoday',
      url: SOURCES.uzhInfoDays,
      notes: 'Jeweils Anfang September, Anmeldung nötig. Das nächste Datum ist noch nicht bestätigt – bitte eintragen.',
      optionKey: 'uzh-bf',
    },
    {
      title: 'HSG: Anmeldeschluss Bachelor (Schweizer Maturität)',
      kind: 'deadline',
      date: nextOccurrence(4, 30, today),
      url: SOURCES.hsgDeadlines,
      notes: `Anmeldung vom 1. Oktober bis 30. April, Studienbeginn im Herbstsemester. ${STAND}`,
      optionKey: 'hsg-bwl',
    },
    {
      title: 'Stanford MS&E: Bewerbungsschluss Master',
      kind: 'deadline',
      url: SOURCES.stanfordMse,
      notes:
        'Für den Studienbeginn im Herbst 2027 lief die Frist bis 1. Dezember 2026 – also rund neun Monate vor Studienbeginn. Das Datum für dein Jahr bitte eintragen.',
      optionKey: 'eth-stanford',
    },
  ];
}
