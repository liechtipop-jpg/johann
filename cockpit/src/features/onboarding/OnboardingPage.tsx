import { Check, Plus, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { InstallHint } from '@/app/InstallHint';
import { db } from '@/db/db';
import type { SubjectColor } from '@/db/schemas';
import { patchSetting, setSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { importBackupFile } from '@/features/backup/useBackup';
import { addStarterDeck } from '@/features/flashcards/actions';
import { addSuggestedPieces } from '@/features/piano/actions';
import { PIECE_SUGGESTIONS } from '@/features/piano/suggestions';
import { PromotionRulesEditor } from '@/features/grades/PromotionRulesEditor';
import type { PromotionRules } from '@/features/grades/logic/rules';
import { SUBJECT_SUGGESTIONS } from '@/features/subjects/suggestions';
import { cn } from '@/lib/cn';
import { isISODate, suggestSemester, todayISO } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { requestPersistentStorage } from '@/lib/platform';
import { Button, IconButton } from '@/ui/Button';
import { Field, Input } from '@/ui/Field';
import { ColorSwatchPicker, SubjectDot } from '@/ui/Subject';
import { pickColor } from '@/ui/subject';
import { Switch, ToggleSwitch } from '@/ui/Switch';

interface DraftSubject {
  key: string;
  name: string;
  color: SubjectColor;
  isPromotion: boolean;
}

const STEP_COUNT = 5;

export default function OnboardingPage() {
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.profile.name);
  const [subjects, setSubjects] = useState<DraftSubject[]>([]);
  const [semester, setSemester] = useState(() => suggestSemester(todayISO()));
  const [rules, setRules] = useState<PromotionRules>(settings.promotionRules);
  const [countdown, setCountdown] = useState({ enabled: false, title: 'Montpellier', date: '' });
  const [starter, setStarter] = useState({ french: false, fce: false, piano: false });
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    // Beim Schrittwechsel den Fokus auf die Überschrift setzen (Screenreader, Tastatur).
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  if (settings.onboarding.done) return <Navigate to="/" replace />;

  const semesterValid =
    semester.name.trim() !== '' && isISODate(semester.start) && isISODate(semester.end) && semester.start <= semester.end;
  const countdownValid = !countdown.enabled || (countdown.title.trim() !== '' && isISODate(countdown.date));
  const canNext = [name.trim() !== '', subjects.length > 0, semesterValid, true, countdownValid][step];

  async function finish() {
    const persist = requestPersistentStorage(); // im Klick anfragen (manche Browser verlangen eine Nutzeraktion)
    setBusy(true);
    const now = Date.now();
    await db.transaction('rw', db.subjects, db.semesters, db.countdowns, db.kv, async () => {
      await db.subjects.bulkAdd(
        subjects.map((s, order) => ({
          id: newId(),
          name: s.name,
          color: s.color,
          isPromotion: s.isPromotion,
          order,
          archived: false,
          createdAt: now,
        })),
      );
      await db.semesters.add({ id: newId(), name: semester.name.trim(), start: semester.start, end: semester.end, createdAt: now });
      if (countdown.enabled && isISODate(countdown.date)) {
        await db.countdowns.add({ id: newId(), title: countdown.title.trim(), date: countdown.date, createdAt: now });
      }
      await setSetting('profile', { name: name.trim() });
      await setSetting('promotionRules', rules);
      await patchSetting('backup', { firstUseAt: now });
    });
    // Startdecks nach den Fächern anlegen, damit sie dem passenden Fach zugeordnet werden.
    const keys = [
      ...(starter.french ? ['fr-montpellier'] : []),
      ...(starter.fce ? ['fce-phrasal-verbs', 'fce-word-formation', 'fce-collocations'] : []),
    ];
    for (const key of keys) await addStarterDeck(key, { silent: true });
    if (starter.piano) await addSuggestedPieces();
    await setSetting('onboarding', { done: true, completedAt: now });
    await persist;
  }

  function next(event: FormEvent) {
    event.preventDefault();
    if (!canNext || busy) return;
    if (step < STEP_COUNT - 1) setStep(step + 1);
    else void finish();
  }

  const headingProps = { ref: headingRef, tabIndex: -1, className: 'font-serif text-[34px] leading-[1.1] outline-none lg:text-[40px]' };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <header className="flex items-center gap-2.5">
        <img src="/favicon.svg" alt="" className="size-7 rounded-[8px]" />
        <span className="font-serif text-[24px] leading-none">Cockpit</span>
        <span className="ml-auto text-sm text-ink-2 tabular-nums">
          Schritt {step + 1} von {STEP_COUNT}
        </span>
      </header>
      <div
        role="progressbar"
        aria-label="Fortschritt der Einrichtung"
        aria-valuemin={1}
        aria-valuemax={STEP_COUNT}
        aria-valuenow={step + 1}
        className="mt-3 h-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-250 ease-soft"
          style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
        />
      </div>

      <form id="onboarding" onSubmit={next} noValidate className="flex-1 animate-fade-in space-y-6 py-8" key={step}>
        {step === 0 && (
          <>
            <h1 {...headingProps}>Willkommen bei Cockpit</h1>
            <p className="text-[17px] text-ink-2">
              Noten, Prüfungen, Lernplan und mehr – an einem Ort. Alles bleibt auf diesem Gerät, ganz ohne Konto.
            </p>
            <Field label="Wie heisst du?">
              {(p) => <Input {...p} value={name} maxLength={40} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />}
            </Field>
            <ImportBox />
          </>
        )}

        {step === 1 && (
          <>
            <h1 {...headingProps}>Deine Fächer</h1>
            <p className="text-ink-2">Tippe an, welche Fächer du hast. Farben, Namen und Reihenfolge kannst du jederzeit ändern.</p>
            <SubjectStep subjects={subjects} onChange={setSubjects} />
          </>
        )}

        {step === 2 && (
          <>
            <h1 {...headingProps}>Aktuelles Semester</h1>
            <p className="text-ink-2">Jede Note gehört zu einem Semester. Weitere Semester legst du später in den Einstellungen an.</p>
            <Field label="Bezeichnung">
              {(p) => (
                <Input {...p} value={semester.name} maxLength={40} onChange={(e) => setSemester({ ...semester, name: e.target.value })} />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Beginn">
                {(p) => (
                  <Input {...p} type="date" value={semester.start} onChange={(e) => setSemester({ ...semester, start: e.target.value })} />
                )}
              </Field>
              <Field label="Ende" error={semester.start > semester.end ? 'Ende vor Beginn' : undefined}>
                {(p) => (
                  <Input {...p} type="date" value={semester.end} onChange={(e) => setSemester({ ...semester, end: e.target.value })} />
                )}
              </Field>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 {...headingProps}>Promotionsregeln</h1>
            <p className="text-ink-2">
              Damit Cockpit dir zeigen kann, wie sicher deine Promotion ist. Welche Fächer zählen, hast du im Schritt «Fächer» festgelegt.
            </p>
            <PromotionRulesEditor value={rules} onChange={setRules} />
          </>
        )}

        {step === 4 && (
          <>
            <h1 {...headingProps}>Fast geschafft{name.trim() ? `, ${name.trim()}` : ''}</h1>
            <Section title="Vorschläge">
              <Switch
                label={`Countdown «${countdown.title || 'Montpellier'}»`}
                description="Zählt auf «Heute» die Tage bis zu deinem Sprachaufenthalt."
                checked={countdown.enabled}
                onChange={(enabled) => setCountdown({ ...countdown, enabled })}
              />
              {countdown.enabled && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Name">
                    {(p) => (
                      <Input
                        {...p}
                        value={countdown.title}
                        maxLength={60}
                        onChange={(e) => setCountdown({ ...countdown, title: e.target.value })}
                      />
                    )}
                  </Field>
                  <Field label="Datum">
                    {(p) => (
                      <Input
                        {...p}
                        type="date"
                        min={todayISO()}
                        value={countdown.date}
                        onChange={(e) => setCountdown({ ...countdown, date: e.target.value })}
                      />
                    )}
                  </Field>
                </div>
              )}
              <div className="mt-3 space-y-1 border-t border-line pt-3">
                <Switch
                  label="Startdeck Französisch «Montpellier»"
                  description="120 Karten A2–B1: Smalltalk, Gastfamilie, Essen, Unterwegs, Einkaufen, Sprachschule, Notfall"
                  checked={starter.french}
                  onChange={(french) => setStarter({ ...starter, french })}
                />
                <Switch
                  label="Startdecks Cambridge B2 First (FCE)"
                  description="170 Karten: Phrasal Verbs, Word Formation, Collocations"
                  checked={starter.fce}
                  onChange={(fce) => setStarter({ ...starter, fce })}
                />
                <Switch
                  label="Klavierstücke fürs Repertoire"
                  description={PIECE_SUGGESTIONS.map((p) => p.title).join(', ')}
                  checked={starter.piano}
                  onChange={(piano) => setStarter({ ...starter, piano })}
                />
              </div>
              <p className="mt-3 text-[13px] text-ink-2">Studienoptionen und Kriterien schlägt dir Cockpit später im Kompass vor.</p>
            </Section>
            <Section title="Damit nichts verloren geht">
              <ul className="space-y-2 text-[15px]">
                <Bullet>Deine Daten liegen nur auf diesem Gerät. Cockpit bittet den Browser, sie dauerhaft zu speichern.</Bullet>
                <Bullet>
                  Alle 14 Tage erinnert dich Cockpit an eine Sicherung – damit überträgst du auch Daten aufs Handy oder den Laptop.
                </Bullet>
              </ul>
              <div className="mt-4">
                <InstallHint />
              </div>
            </Section>
          </>
        )}
      </form>

      <footer className="sticky bottom-0 flex items-center gap-2 bg-bg py-3">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Zurück
          </Button>
        )}
        <Button type="submit" form="onboarding" variant="primary" size="lg" disabled={!canNext || busy} className="ml-auto min-w-40">
          {step === STEP_COUNT - 1 ? 'Los geht’s' : 'Weiter'}
        </Button>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[14px] border border-line bg-surface p-4">
      <h2 className="mb-2 text-sm font-semibold text-ink-2">{title}</h2>
      {children}
    </section>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Check size={17} aria-hidden className="mt-0.5 shrink-0 text-accent-ink" />
      <span>{children}</span>
    </li>
  );
}

function ImportBox() {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-[14px] border border-line bg-surface p-4">
      <p className="font-medium">Cockpit schon auf einem anderen Gerät?</p>
      <p className="mt-0.5 text-sm text-ink-2">Importiere deine Sicherung – dann ist alles sofort da.</p>
      <Button size="sm" className="mt-3" icon={<Upload size={16} aria-hidden />} onClick={() => fileRef.current?.click()}>
        Sicherung importieren
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void importBackupFile(file);
        }}
      />
    </div>
  );
}

function SubjectStep({ subjects, onChange }: { subjects: DraftSubject[]; onChange: (list: DraftSubject[]) => void }) {
  const [custom, setCustom] = useState('');
  const [colorOpen, setColorOpen] = useState<string | null>(null);
  const has = (name: string) => subjects.some((s) => s.name.toLowerCase() === name.toLowerCase());

  function add(name: string, preferred?: SubjectColor) {
    const trimmed = name.trim();
    if (!trimmed || has(trimmed)) return;
    const color = pickColor(
      subjects.map((s) => s.color),
      preferred,
    );
    onChange([...subjects, { key: newId(), name: trimmed, color, isPromotion: trimmed !== 'Sport' }]);
  }

  function toggle(name: string, preferred: SubjectColor) {
    if (has(name)) onChange(subjects.filter((s) => s.name !== name));
    else add(name, preferred);
  }

  const update = (key: string, patch: Partial<DraftSubject>) => onChange(subjects.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Vorschläge" className="flex flex-wrap gap-2">
        {SUBJECT_SUGGESTIONS.map((s) => {
          const selected = has(s.name);
          return (
            <button
              key={s.name}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(s.name, s.color)}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 pointer-coarse:h-11',
                selected ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink-2 hover:text-ink',
              )}
            >
              {selected && <Check size={15} strokeWidth={2.5} aria-hidden />}
              {s.name}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          aria-label="Eigenes Fach"
          placeholder="Eigenes Fach"
          maxLength={40}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(custom);
              setCustom('');
            }
          }}
        />
        <Button
          icon={<Plus size={18} aria-hidden />}
          disabled={!custom.trim()}
          onClick={() => {
            add(custom);
            setCustom('');
          }}
        >
          Hinzufügen
        </Button>
      </div>

      {subjects.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-ink-2">
            Ausgewählt ({subjects.length}) <span className="font-normal">· Schalter = zählt für die Promotion</span>
          </h2>
          <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">
            {subjects.map((s) => (
              <li key={s.key} className="px-2">
                <div className="flex items-center">
                  <IconButton
                    label={`Farbe für ${s.name} ändern`}
                    aria-expanded={colorOpen === s.key}
                    onClick={() => setColorOpen(colorOpen === s.key ? null : s.key)}
                  >
                    <SubjectDot color={s.color} size={16} />
                  </IconButton>
                  <span className="min-w-0 flex-1 truncate text-[15px]">{s.name}</span>
                  <ToggleSwitch
                    label={`${s.name} zählt für die Promotion`}
                    checked={s.isPromotion}
                    onChange={(isPromotion) => update(s.key, { isPromotion })}
                  />
                  <IconButton label={`${s.name} entfernen`} onClick={() => onChange(subjects.filter((x) => x.key !== s.key))}>
                    <X size={18} aria-hidden />
                  </IconButton>
                </div>
                {colorOpen === s.key && (
                  <div className="pb-3 pl-2">
                    <ColorSwatchPicker
                      label={`Farbe für ${s.name}`}
                      value={s.color}
                      onChange={(color) => {
                        update(s.key, { color });
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
