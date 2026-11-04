import { CornerDownLeft, Download, Keyboard, Monitor, Moon, Plus, RefreshCw, Search, Settings, Sun, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router';
import { useSubjects } from '@/db/hooks';
import type { Subject } from '@/db/schemas';
import { patchSetting } from '@/db/settings';
import { exportBackup } from '@/features/backup/useBackup';
import { startFocus } from '@/features/focus/actions';
import { redistributeAll } from '@/features/planner/actions';
import { cn } from '@/lib/cn';
import { Sheet } from '@/ui/Sheet';
import { SubjectDot } from '@/ui/Subject';
import { rankCommands } from './commands';
import { NAV_ITEMS } from './nav';
import { ui, useUI } from './uiStore';

interface Command {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  icon?: LucideIcon;
  subject?: Subject;
  hint?: string;
  run: () => void;
}

function buildCommands(navigate: NavigateFunction, subjects: Subject[]): Command[] {
  const go = (to: string) => () => {
    void navigate(to);
  };
  return [
    ...NAV_ITEMS.map((item) => ({
      id: `nav:${item.to}`,
      label: item.label,
      group: 'Seite',
      icon: item.icon,
      hint: `G ${item.shortcut.toUpperCase()}`,
      run: go(item.to),
    })),
    { id: 'add:grade', label: 'Note erfassen', group: 'Aktion', icon: Plus, keywords: 'neu', run: () => ui.openQuickAdd('grade') },
    { id: 'add:exam', label: 'Prüfung erfassen', group: 'Aktion', icon: Plus, keywords: 'neu test', run: () => ui.openQuickAdd('exam') },
    {
      id: 'add:task',
      label: 'Aufgabe erfassen',
      group: 'Aktion',
      icon: Plus,
      keywords: 'neu hausaufgabe abgabe',
      run: () => ui.openQuickAdd('task'),
    },
    {
      id: 'go:exams',
      label: 'Prüfungen',
      group: 'Seite',
      icon: NAV_ITEMS[1].icon,
      keywords: 'planer test',
      run: go('/planer?tab=pruefungen'),
    },
    {
      id: 'go:tasks',
      label: 'Aufgaben',
      group: 'Seite',
      icon: NAV_ITEMS[1].icon,
      keywords: 'planer hausaufgaben abgaben',
      run: go('/planer?tab=aufgaben'),
    },
    {
      id: 'go:plan',
      label: 'Lernplan',
      group: 'Seite',
      icon: NAV_ITEMS[1].icon,
      keywords: 'planer lerneinheiten heute',
      run: go('/planer?tab=lernplan'),
    },
    {
      id: 'plan:redistribute',
      label: 'Verpasstes neu verteilen',
      group: 'Aktion',
      icon: RefreshCw,
      keywords: 'lernplan verpasst',
      run: () => void redistributeAll(),
    },
    {
      id: 'go:planprefs',
      label: 'Lernplan-Einstellungen',
      group: 'Einstellungen',
      icon: Settings,
      keywords: 'lernzeit gesperrt wiederholung',
      run: go('/einstellungen#lernplan'),
    },
    {
      id: 'cards:study',
      label: 'Karteikarten lernen',
      group: 'Aktion',
      icon: NAV_ITEMS[3].icon,
      keywords: 'fällig wiederholen vokabeln',
      run: go('/karten/lernen/alle'),
    },
    {
      id: 'go:cardstats',
      label: 'Karteikarten-Statistik',
      group: 'Seite',
      icon: NAV_ITEMS[3].icon,
      keywords: 'trefferquote prognose',
      run: go('/karten/statistik'),
    },
    {
      id: 'go:metronome',
      label: 'Metronom',
      group: 'Seite',
      icon: NAV_ITEMS[4].icon,
      keywords: 'klavier takt bpm tempo',
      run: go('/klavier?tab=metronom'),
    },
    {
      id: 'go:repertoire',
      label: 'Repertoire',
      group: 'Seite',
      icon: NAV_ITEMS[4].icon,
      keywords: 'klavier stücke',
      run: go('/klavier?tab=repertoire'),
    },
    {
      id: 'piano:practice',
      label: 'Klavier üben',
      group: 'Aktion',
      icon: NAV_ITEMS[4].icon,
      keywords: 'übungstimer übungslog',
      run: go('/klavier?tab=ueben'),
    },
    {
      id: 'focus:start',
      label: 'Fokus-Timer starten',
      group: 'Aktion',
      icon: NAV_ITEMS[5].icon,
      keywords: 'pomodoro konzentration lernen',
      run: () => {
        void startFocus();
        void navigate('/fokus');
      },
    },
    {
      id: 'focus:fce',
      label: 'FCE-Prüfungssimulation',
      group: 'Aktion',
      icon: NAV_ITEMS[5].icon,
      keywords: 'b2 first cambridge englisch',
      run: go('/fokus?vorlage=fce'),
    },
    {
      id: 'go:compass-rate',
      label: 'Kompass: Bewerten',
      group: 'Seite',
      icon: NAV_ITEMS[6].icon,
      keywords: 'studienwahl matrix kriterien',
      run: go('/kompass?tab=bewerten'),
    },
    {
      id: 'go:compass-timeline',
      label: 'Kompass: Zeitstrahl',
      group: 'Seite',
      icon: NAV_ITEMS[6].icon,
      keywords: 'fristen infotage anmeldung',
      run: go('/kompass?tab=zeitstrahl'),
    },
    {
      id: 'go:subjects',
      label: 'Fächer verwalten',
      group: 'Einstellungen',
      icon: Settings,
      keywords: 'farben reihenfolge',
      run: go('/einstellungen#faecher'),
    },
    { id: 'go:semesters', label: 'Semester verwalten', group: 'Einstellungen', icon: Settings, run: go('/einstellungen#semester') },
    {
      id: 'go:rules',
      label: 'Promotionsregeln',
      group: 'Einstellungen',
      icon: Settings,
      keywords: 'kompensation rundung',
      run: go('/einstellungen#promotion'),
    },
    {
      id: 'go:data',
      label: 'Daten & Backup',
      group: 'Einstellungen',
      icon: Settings,
      keywords: 'sicherung export import',
      run: go('/einstellungen#daten'),
    },
    {
      id: 'backup:download',
      label: 'Backup herunterladen',
      group: 'Aktion',
      icon: Download,
      keywords: 'sicherung export',
      run: () => void exportBackup('download'),
    },
    {
      id: 'theme:light',
      label: 'Design: Hell',
      group: 'Aktion',
      icon: Sun,
      keywords: 'theme modus farbe',
      run: () => void patchSetting('appearance', { theme: 'light' }),
    },
    {
      id: 'theme:dark',
      label: 'Design: Dunkel',
      group: 'Aktion',
      icon: Moon,
      keywords: 'theme modus farbe nacht',
      run: () => void patchSetting('appearance', { theme: 'dark' }),
    },
    {
      id: 'theme:system',
      label: 'Design: wie System',
      group: 'Aktion',
      icon: Monitor,
      keywords: 'theme modus automatisch',
      run: () => void patchSetting('appearance', { theme: 'system' }),
    },
    {
      id: 'help:keys',
      label: 'Tastenkürzel anzeigen',
      group: 'Hilfe',
      icon: Keyboard,
      keywords: 'shortcuts tasten',
      run: () => ui.openShortcuts(),
    },
    ...subjects.map((subject) => ({
      id: `subject:${subject.id}`,
      label: subject.name,
      group: 'Fach',
      subject,
      keywords: 'fach noten',
      run: go(`/noten/fach/${subject.id}`),
    })),
  ];
}

export function CommandPalette() {
  const { palette } = useUI();
  return (
    <Sheet
      open={palette}
      onClose={ui.closePalette}
      title="Befehlspalette"
      hideHeader
      variant="top"
      bodyClassName="px-0 pb-0 lg:px-0 lg:pb-0"
    >
      <PaletteBody />
    </Sheet>
  );
}

function PaletteBody() {
  const navigate = useNavigate();
  const subjects = useSubjects();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const commands = useMemo(() => buildCommands(navigate, subjects ?? []), [navigate, subjects]);
  const results = useMemo(() => rankCommands(commands, query), [commands, query]);
  const activeIndex = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listId]);

  function run(command: Command | undefined) {
    if (!command) return;
    ui.closePalette();
    command.run();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % Math.max(1, results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((activeIndex - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(results[activeIndex]);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search size={18} aria-hidden className="text-ink-3" />
        <input
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results.length ? `${listId}-${activeIndex}` : undefined}
          aria-label="Seite, Fach oder Befehl suchen"
          placeholder="Suchen oder Befehl eingeben …"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-3"
        />
      </div>
      {results.length === 0 && <p className="px-4 py-8 text-center text-ink-2">Keine Treffer für «{query}»</p>}
      <ul id={listId} role="listbox" aria-label="Ergebnisse" className="max-h-[min(60dvh,440px)] overflow-y-auto p-2">
        {results.map((command, index) => {
          const Icon = command.icon;
          const selected = index === activeIndex;
          return (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Tastatur läuft über das Suchfeld (aria-activedescendant).
            <li
              key={command.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={selected}
              onClick={() => run(command)}
              onMouseMove={() => setActive(index)}
              className={cn('flex h-11 cursor-pointer items-center gap-3 rounded-[8px] px-3', selected && 'bg-surface-2 dark:bg-surface-3')}
            >
              <span className="grid size-5 place-items-center text-ink-2">
                {command.subject ? <SubjectDot color={command.subject.color} /> : Icon ? <Icon size={18} aria-hidden /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{command.label}</span>
              <span className="text-xs text-ink-3">{command.hint ?? command.group}</span>
              {selected && <CornerDownLeft size={14} aria-hidden className="text-ink-3" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
