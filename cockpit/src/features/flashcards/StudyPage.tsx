import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Undo2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { db } from '@/db/db';
import { useSettings } from '@/db/settingsContext';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { speak, speakable } from '@/lib/speech';
import { useNow } from '@/lib/useNow';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, IconButton } from '@/ui/Button';
import { Input } from '@/ui/Field';
import { Kbd } from '@/ui/Kbd';
import { StatusPill } from '@/ui/StatusPill';
import { buildSession, recordReview, undoReview, type SessionItem } from './actions';
import { checkAnswer, suggestedRating, type AnswerVerdict } from './logic/answer';
import { createScheduler, formatInterval, previewIntervals, RATING_LABELS, RATINGS, type Rating } from './logic/scheduler';
import { swipeRating } from './logic/swipe';
import { SpeakButton } from './SpeakButton';

const LEARN_AHEAD_MS = 20 * 60_000;
const SWIPE_ICONS = { 1: ArrowLeft, 2: ArrowDown, 3: ArrowRight, 4: ArrowUp } as const;

function sides({ card, deck, state }: SessionItem) {
  const forward = state.dir === 'fwd';
  return {
    prompt: forward ? card.front : card.back,
    answer: forward ? card.back : card.front,
    promptLang: forward ? deck.frontLang : deck.backLang,
    answerLang: forward ? deck.backLang : deck.frontLang,
    example: card.example,
    exampleLang: deck.backLang && deck.backLang !== 'de-CH' ? deck.backLang : deck.frontLang,
    tag: card.tags?.[0],
  };
}

/** Lernen im Vollbild: Umdrehen oder Eintippen, Bewertung mit 1–4, Leertaste oder Wischen. */
export default function StudyPage() {
  const { deckId = 'alle' } = useParams();
  const [params] = useSearchParams();
  const mode: 'flip' | 'type' = params.get('modus') === 'tippen' ? 'type' : 'flip';
  const navigate = useNavigate();
  const { flashcards } = useSettings();
  const now = useNow();
  const deckName = useLiveQuery(async () => (deckId === 'alle' ? 'Alle Decks' : ((await db.decks.get(deckId))?.name ?? 'Deck')), [deckId]);
  const scheduler = useMemo(() => createScheduler({ retention: flashcards.retention }), [flashcards.retention]);
  const [queue, setQueue] = useState<SessionItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typed, setTyped] = useState('');
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const [history, setHistory] = useState<Array<{ item: SessionItem; logId: string; rating: Rating }>>([]);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backTo = deckId === 'alle' ? '/karten' : `/karten/deck/${deckId}`;

  useEffect(() => {
    let alive = true;
    void buildSession(deckId, flashcards.newPerDay).then((items) => {
      if (!alive) return;
      setQueue(items);
      setTotal(items.length);
    });
    return () => {
      alive = false;
    };
  }, [deckId, flashcards.newPerDay]);

  const current = queue?.[0];
  const view = current ? sides(current) : null;
  const intervals = useMemo(() => (current ? previewIntervals(current.state, now, scheduler) : null), [current, now, scheduler]);
  const suggestion = verdict ? suggestedRating(verdict) : null;
  const reviewed = history.length;
  const known = history.filter((h) => h.rating > 1).length;

  function reset() {
    setFlipped(false);
    setTyped('');
    setVerdict(null);
    setDrag(null);
  }

  function reveal() {
    if (!view || flipped) return;
    if (mode === 'type') {
      setVerdict(checkAnswer(typed, view.answer));
      inputRef.current?.blur();
    }
    setFlipped(true);
    if (flashcards.autoSpeak && speakable(view.answerLang)) speak(view.answer, view.answerLang);
  }

  async function rate(rating: Rating) {
    if (!current || !flipped) return;
    const at = Date.now();
    const { state, log } = await recordReview(current, rating, mode, scheduler, at);
    setHistory((h) => [...h.slice(-50), { item: current, logId: log.id, rating }]);
    setQueue((q) => {
      if (!q) return q;
      const rest = q.slice(1);
      const soon = (state.state === 1 || state.state === 3) && state.due - at < LEARN_AHEAD_MS;
      return soon ? [...rest, { ...current, state }] : rest;
    });
    reset();
  }

  async function undo() {
    const last = history.at(-1);
    if (!last) return;
    await undoReview(last.item.state, last.logId);
    setHistory((h) => h.slice(0, -1));
    setQueue((q) => [last.item, ...(q ?? []).filter((i) => i.state.id !== last.item.state.id)]);
    reset();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (document.querySelector('dialog[open]')) return;
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key === 'Escape') {
        navigate(backTo);
        return;
      }
      if (!current || typing) return;
      if (!flipped) {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          reveal();
        }
        return;
      }
      if (['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        void rate(Number(event.key) as Rating);
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        void rate(suggestion ?? 3);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!flipped) return;
    start.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    setDrag({ x: event.clientX - start.current.x, y: event.clientY - start.current.y });
  }
  function onPointerUp() {
    const d = drag;
    start.current = null;
    setDrag(null);
    if (!d) return;
    const rating = swipeRating(d.x, d.y);
    if (rating) void rate(rating);
  }

  const pending = drag ? swipeRating(drag.x, drag.y) : null;
  const PendingIcon = pending ? SWIPE_ICONS[pending] : null;
  const done = queue !== null && queue.length === 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <header className="flex items-center gap-2 py-2">
        <Link
          to={backTo}
          aria-label="Lernen beenden"
          title="Lernen beenden (Esc)"
          className="grid size-11 place-items-center rounded-[10px] text-ink-2 hover:bg-surface-2"
        >
          <X size={22} aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[15px] font-semibold">{deckName ?? ''}</p>
          {queue && !done && <p className="text-[13px] text-ink-2 tabular-nums">noch {queue.length}</p>}
        </div>
        <IconButton label="Letzte Bewertung zurücknehmen" disabled={history.length === 0} onClick={() => void undo()}>
          <Undo2 size={20} aria-hidden />
        </IconButton>
      </header>
      <div
        role="progressbar"
        aria-label="Fortschritt der Lernsitzung"
        aria-valuemin={0}
        aria-valuemax={Math.max(total, reviewed)}
        aria-valuenow={reviewed}
        className="h-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-250"
          style={{ width: `${total ? Math.min(100, (reviewed / Math.max(total, reviewed + (queue?.length ?? 0))) * 100) : 0}%` }}
        />
      </div>

      {queue === null && <div className="flex-1" />}

      {done && (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <h1 className="font-serif text-[40px] leading-tight">{reviewed ? 'Geschafft!' : 'Alles erledigt'}</h1>
          <p className="mt-2 max-w-sm text-[17px] text-ink-2">
            {reviewed
              ? `Du hast ${plural(reviewed, 'Karte', 'Karten')} wiederholt und ${Math.round((known / reviewed) * 100)} % gewusst.`
              : 'Für heute ist hier nichts mehr fällig. Morgen geht es weiter.'}
          </p>
          <div className="mt-6 flex gap-2">
            <Link
              to={backTo}
              className="inline-flex h-11 items-center rounded-[10px] bg-accent px-5 font-medium text-on-accent hover:bg-accent-hover"
            >
              Fertig
            </Link>
            <Link
              to="/karten/statistik"
              className="inline-flex h-11 items-center rounded-[10px] border border-line bg-surface px-5 font-medium hover:bg-surface-2"
            >
              Statistik
            </Link>
          </div>
        </div>
      )}

      {current && view && (
        <>
          <div className="flex flex-1 flex-col justify-center py-6">
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- Tippen/Wischen ergänzt die Tasten Leertaste und 1–4 sowie die Knöpfe darunter. */}
            <div
              className="flip-scene relative touch-pan-y select-none"
              onClick={() => mode === 'flip' && reveal()}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                start.current = null;
                setDrag(null);
              }}
              style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`, touchAction: 'none' } : undefined}
            >
              <div className="flip-card" data-flipped={flipped}>
                <section
                  className="flip-face flip-front flex min-h-72 flex-col rounded-[20px] border border-line bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
                  aria-hidden={flipped}
                  inert={flipped}
                >
                  {view.tag && <p className="text-[13px] font-medium text-ink-3">{view.tag}</p>}
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                    <p className="text-[26px] leading-snug font-semibold text-balance">{view.prompt}</p>
                    <SpeakButton text={view.prompt} lang={view.promptLang} />
                  </div>
                </section>
                <section
                  className="flip-face flip-back flex min-h-72 flex-col rounded-[20px] border border-line bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
                  aria-hidden={!flipped}
                  inert={!flipped}
                  aria-live="polite"
                >
                  <p className="text-center text-[15px] text-ink-2">{view.prompt}</p>
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-3 text-center">
                    <div className="flex items-center gap-1">
                      <p className="text-[26px] leading-snug font-semibold text-balance">{view.answer}</p>
                      <SpeakButton text={view.answer} lang={view.answerLang} label="Antwort vorlesen" />
                    </div>
                    {view.example && (
                      <div className="flex items-start gap-1">
                        <p className="max-w-md text-[15px] text-ink-2">{view.example}</p>
                        <SpeakButton text={view.example} lang={view.exampleLang} label="Beispielsatz vorlesen" />
                      </div>
                    )}
                  </div>
                  {verdict && (
                    <div className="border-t border-line pt-3 text-center">
                      {verdict.result === 'correct' && <StatusPill tone="success">Richtig</StatusPill>}
                      {verdict.result === 'almost' && (
                        <>
                          <StatusPill tone="warning">Fast richtig</StatusPill>
                          <p className="mt-1.5 text-sm text-ink-2">{verdict.hint}</p>
                        </>
                      )}
                      {verdict.result === 'wrong' && (
                        <>
                          <StatusPill tone="danger">Nicht ganz</StatusPill>
                          <p className="mt-1.5 text-sm text-ink-2">Deine Antwort: «{typed.trim() || '–'}»</p>
                        </>
                      )}
                    </div>
                  )}
                </section>
              </div>
              {pending && PendingIcon && (
                <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-bg">
                    <PendingIcon size={16} aria-hidden />
                    {RATING_LABELS[pending]}
                  </span>
                </div>
              )}
            </div>
            {flipped && (
              <p className="mt-3 text-center text-[13px] text-ink-3 pointer-fine:hidden">
                Wischen: ← Nochmal · ↓ Schwer · → Gut · ↑ Leicht
              </p>
            )}
          </div>

          {!flipped && mode === 'flip' && (
            <Button variant="primary" size="lg" block onClick={reveal} className="h-14">
              Antwort zeigen
              <span className="hidden lg:inline">
                <Kbd>Leertaste</Kbd>
              </span>
            </Button>
          )}

          {!flipped && mode === 'type' && (
            <form
              className="flex gap-2"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                reveal();
              }}
            >
              <Input
                ref={inputRef}
                autoFocus
                aria-label="Deine Antwort"
                placeholder="Antwort eintippen …"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                lang={view.answerLang || undefined}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="h-14 text-lg"
              />
              <Button type="submit" variant="primary" size="lg" className="h-14">
                Prüfen
              </Button>
            </form>
          )}

          {flipped && intervals && (
            <div role="group" aria-label="Wie gut wusstest du es?" className="grid grid-cols-4 gap-2">
              {RATINGS.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => void rate(rating)}
                  aria-label={`${RATING_LABELS[rating]} – wieder in ${formatInterval(intervals[rating])} (Taste ${rating})`}
                  className={cn(
                    'flex h-16 flex-col items-center justify-center rounded-[12px] border bg-surface transition-colors hover:bg-surface-2',
                    suggestion === rating ? 'border-accent ring-2 ring-accent/30' : 'border-line',
                  )}
                >
                  <span className="text-[15px] font-semibold">{RATING_LABELS[rating]}</span>
                  <span className="text-[12px] text-ink-2 tabular-nums">
                    {formatInterval(intervals[rating])}
                    <span className="hidden lg:inline"> · {rating}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
