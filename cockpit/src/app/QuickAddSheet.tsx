import { CalendarClock, GraduationCap, ListTodo, type LucideIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { GradeForm } from '@/features/grades/GradeForm';
import { ExamForm } from '@/features/planner/ExamForm';
import { TaskForm } from '@/features/planner/TaskForm';
import { Kbd } from '@/ui/Kbd';
import { Sheet } from '@/ui/Sheet';
import { ui, useUI, type QuickAddType } from './uiStore';

const TYPES: Array<{ type: QuickAddType; key: string; label: string; text: string; icon: LucideIcon }> = [
  { type: 'grade', key: '1', label: 'Note', text: 'Note mit Gewicht eintragen', icon: GraduationCap },
  { type: 'exam', key: '2', label: 'Prüfung', text: 'Datum und Themen planen', icon: CalendarClock },
  { type: 'task', key: '3', label: 'Aufgabe', text: 'Hausaufgabe oder Abgabe', icon: ListTodo },
];

const TITLES: Record<QuickAddType, string> = { grade: 'Note erfassen', exam: 'Prüfung erfassen', task: 'Aufgabe erfassen' };

/** Schnellerfassung: Plus → Typ → Formular (zwei Taps). */
export function QuickAddSheet() {
  const { quickAdd } = useUI();
  const { open, type } = quickAdd;
  const back = () => ui.setQuickAddType(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const match = TYPES.find((t) => t.key === event.key);
    if (match) {
      event.preventDefault();
      ui.setQuickAddType(match.type);
    }
  }

  return (
    <Sheet open={open} onClose={ui.closeQuickAdd} title={type ? TITLES[type] : 'Schnell erfassen'}>
      {type === null && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Ziffern 1–3 als Abkürzung; die Knöpfe selbst sind normal bedienbar.
        <div onKeyDown={onKeyDown} className="grid gap-2 sm:grid-cols-3">
          {TYPES.map(({ type: t, key, label, text, icon: Icon }, index) => (
            <button
              key={t}
              type="button"
              data-autofocus={index === 0 ? true : undefined}
              onClick={() => ui.setQuickAddType(t)}
              className="flex items-center gap-4 rounded-[14px] border border-line bg-surface p-4 text-left transition-colors duration-150 hover:border-line-strong hover:bg-surface-2 sm:flex-col sm:items-start sm:gap-3"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent-ink">
                <Icon size={22} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{label}</span>
                <span className="block text-[13px] text-ink-2">{text}</span>
              </span>
              <span className="hidden lg:block">
                <Kbd>{key}</Kbd>
              </span>
            </button>
          ))}
        </div>
      )}
      {type === 'grade' && <GradeForm onDone={ui.closeQuickAdd} onBack={back} />}
      {type === 'exam' && <ExamForm onDone={ui.closeQuickAdd} onBack={back} />}
      {type === 'task' && <TaskForm onDone={ui.closeQuickAdd} onBack={back} />}
    </Sheet>
  );
}
