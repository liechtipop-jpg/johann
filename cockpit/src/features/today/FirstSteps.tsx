import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Circle, CircleCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ui } from '@/app/uiStore';
import { db } from '@/db/db';
import { useSettings } from '@/db/settingsContext';
import { Card } from '@/ui/Card';

/** Kleine Checkliste für den Start – verschwindet, sobald alles erledigt ist. */
export function FirstSteps() {
  const navigate = useNavigate();
  const { backup } = useSettings();
  const counts = useLiveQuery(async () => ({ grades: await db.grades.count(), exams: await db.exams.count() }), []);
  if (!counts) return null;

  const steps = [
    { label: 'Fächer eingerichtet', done: true, run: () => navigate('/einstellungen#faecher') },
    { label: 'Erste Note erfassen', done: counts.grades > 0, run: () => ui.openQuickAdd('grade') },
    { label: 'Nächste Prüfung eintragen', done: counts.exams > 0, run: () => ui.openQuickAdd('exam') },
    { label: 'Erste Sicherung machen', done: backup.lastExportAt !== null, run: () => navigate('/einstellungen#daten') },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <Card title="Erste Schritte" description={`${doneCount} von ${steps.length} erledigt`} bodyClassName="px-2 pb-2 pt-2 lg:px-2 lg:pb-2">
      <ul>
        {steps.map((step) => (
          <li key={step.label}>
            <button
              type="button"
              onClick={step.run}
              className="flex h-12 w-full items-center gap-3 rounded-[10px] px-2 text-left transition-colors hover:bg-surface-2"
            >
              {step.done ? (
                <CircleCheck size={20} aria-label="erledigt" className="shrink-0 text-success" />
              ) : (
                <Circle size={20} aria-label="offen" className="shrink-0 text-ink-3" />
              )}
              <span className={step.done ? 'flex-1 text-ink-2 line-through decoration-ink-3' : 'flex-1 font-medium'}>{step.label}</span>
              {!step.done && <ChevronRight size={18} aria-hidden className="text-ink-3" />}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
