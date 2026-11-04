import type { Exam, StudySession, Subject } from '@/db/schemas';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/dates';
import { CheckCircle } from '@/ui/CheckCircle';
import { subjectColorValue } from '@/ui/subject';
import { setSessionDone } from './actions';
import { KIND_LABEL, sessionLabel } from './usePlanData';

interface SessionRowProps {
  session: StudySession;
  exam?: Exam;
  subject?: Subject;
  showExam?: boolean;
  showDate?: boolean;
}

/** Eine Lerneinheit zum Abhaken (Fachfarbe am Häkchen). */
export function SessionRow({ session, exam, subject, showExam = true, showDate = false }: SessionRowProps) {
  const label = sessionLabel(session, exam);
  return (
    <li className="flex items-center gap-3 py-2">
      <CheckCircle
        checked={session.done}
        onChange={(done) => void setSessionDone(session, done)}
        label={`${label} erledigt`}
        color={subject ? subjectColorValue(subject.color) : undefined}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[15px]', session.done && 'text-ink-2 line-through decoration-ink-3')}>{label}</p>
        <p className="truncate text-[13px] text-ink-2">
          {KIND_LABEL[session.kind]}
          {showExam && exam && ` · ${subject ? `${subject.name}: ` : ''}${exam.title}`}
          {showDate && ` · ${formatDate(session.date, 'weekday')}`}
        </p>
      </div>
      <span className="shrink-0 text-sm text-ink-2 tabular-nums">{session.minutes} min</span>
    </li>
  );
}
