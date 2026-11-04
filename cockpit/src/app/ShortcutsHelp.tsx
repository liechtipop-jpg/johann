import { Kbd } from '@/ui/Kbd';
import { Sheet } from '@/ui/Sheet';
import { MOD_KEY, NAV_ITEMS } from './nav';
import { ui, useUI } from './uiStore';

const GENERAL: Array<[string[], string]> = [
  [[MOD_KEY, 'K'], 'Befehlspalette öffnen'],
  [['N'], 'Schnell erfassen (Note, Prüfung, Aufgabe)'],
  [['1', '2', '3'], 'Im Erfassen-Fenster: Typ wählen'],
  [['?'], 'Diese Übersicht'],
  [['Esc'], 'Fenster schliessen'],
];

export function ShortcutsHelp() {
  const { shortcuts } = useUI();
  return (
    <Sheet open={shortcuts} onClose={ui.closeShortcuts} title="Tastenkürzel" variant="wide">
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-2">Allgemein</h3>
          <dl className="space-y-2">
            {GENERAL.map(([keys, text]) => (
              <div key={text} className="flex items-center justify-between gap-4">
                <dt className="text-[15px]">{text}</dt>
                <dd className="flex shrink-0 gap-1">
                  {keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-2">Springen zu (G, dann …)</h3>
          <dl className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <div key={item.to} className="flex items-center justify-between gap-4">
                <dt className="text-[15px]">{item.label}</dt>
                <dd className="flex shrink-0 gap-1">
                  <Kbd>G</Kbd>
                  <Kbd>{item.shortcut.toUpperCase()}</Kbd>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Sheet>
  );
}
