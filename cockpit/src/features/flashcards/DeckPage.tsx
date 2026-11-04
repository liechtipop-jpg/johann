import { useLiveQuery } from 'dexie-react-hooks';
import { FileUp, Keyboard, Layers, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { db } from '@/db/db';
import { useSubjectMap } from '@/db/hooks';
import type { Card } from '@/db/schemas';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { normalizeSearch } from '@/app/commands';
import { BackLink } from '@/ui/BackLink';
import { Button, IconButton } from '@/ui/Button';
import { Card as Panel } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Input } from '@/ui/Field';
import { PageHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/Sheet';
import { SubjectChip } from '@/ui/Subject';
import { deleteDeckWithUndo } from './actions';
import { CardForm } from './CardForm';
import { CsvImport } from './CsvImport';
import { DeckForm } from './DeckForm';
import { DIRECTION_OPTIONS, languageLabel } from './languages';
import { useDecks } from './useDecks';

type SheetKind = 'edit' | 'add' | 'import' | null;
const studyLink = 'inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-medium transition-colors';

export default function DeckPage() {
  const { deckId = '' } = useParams();
  const navigate = useNavigate();
  const deck = useLiveQuery(() => db.decks.get(deckId).then((d) => d ?? null), [deckId]);
  const cards = useLiveQuery(() => db.cards.where('deckId').equals(deckId).sortBy('createdAt'), [deckId]);
  const overview = useDecks();
  const subjects = useSubjectMap();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => [...new Set((cards ?? []).flatMap((c) => c.tags ?? []))], [cards]);
  const visible = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return (cards ?? []).filter(
      (c) => (!tag || c.tags?.includes(tag)) && (!q || normalizeSearch(`${c.front} ${c.back} ${c.example ?? ''}`).includes(q)),
    );
  }, [cards, query, tag]);

  if (deck === undefined || cards === undefined || !overview) return null;
  if (deck === null) {
    return (
      <>
        <BackLink to="/karten" label="Karteikarten" />
        <EmptyState icon={Layers} title="Deck nicht gefunden" />
      </>
    );
  }
  const counts = overview.rows.find((r) => r.deck.id === deck.id)?.counts;
  const subject = deck.subjectId ? subjects.get(deck.subjectId) : undefined;
  const today = counts ? counts.due + counts.newToday : 0;
  const direction = DIRECTION_OPTIONS.find((d) => d.value === deck.directions)?.label;

  return (
    <>
      <BackLink to="/karten" label="Karteikarten" />
      <PageHeader
        title={deck.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {subject && <SubjectChip name={subject.name} color={subject.color} />}
            <span>
              {plural(cards.length, 'Karte', 'Karten')} ·{' '}
              {[languageLabel(deck.frontLang), languageLabel(deck.backLang)].filter(Boolean).join(' → ')} · {direction}
            </span>
          </span>
        }
        actions={
          <IconButton label="Deck bearbeiten" onClick={() => setSheet('edit')} className="border border-line">
            <Pencil size={18} aria-hidden />
          </IconButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Panel className="lg:order-2" title="Heute">
          <p className="text-[15px] text-ink-2">
            {today > 0 ? (
              <>
                <strong className="text-[28px] font-semibold text-ink tabular-nums">{today}</strong> {today === 1 ? 'Karte' : 'Karten'} zum
                Lernen
                {counts && counts.newToday > 0 && ` (davon ${counts.newToday} neu)`}
              </>
            ) : cards.length ? (
              'Für heute alles gelernt.'
            ) : (
              'Füge zuerst Karten hinzu.'
            )}
          </p>
          {today > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to={`/karten/lernen/${deck.id}`} className={`${studyLink} bg-accent text-on-accent hover:bg-accent-hover`}>
                <RotateCcw size={18} aria-hidden />
                Umdrehen
              </Link>
              <Link
                to={`/karten/lernen/${deck.id}?modus=tippen`}
                className={`${studyLink} border border-line bg-surface hover:bg-surface-2`}
              >
                <Keyboard size={18} aria-hidden />
                Eintippen
              </Link>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => setSheet('add')}>
              Karte
            </Button>
            <Button size="sm" icon={<FileUp size={16} aria-hidden />} onClick={() => setSheet('import')}>
              CSV / Quizlet
            </Button>
          </div>
        </Panel>

        <Panel className="lg:order-1" title="Karten" bodyClassName="px-2 pt-2 pb-2 lg:px-3">
          {cards.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="Noch keine Karten"
              className="py-6"
              action={
                <>
                  <Button variant="primary" onClick={() => setSheet('add')}>
                    Karte hinzufügen
                  </Button>
                  <Button onClick={() => setSheet('import')}>Importieren</Button>
                </>
              }
            />
          ) : (
            <>
              <div className="space-y-2 px-2 pb-2">
                <div className="relative">
                  <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
                  <Input
                    aria-label="Karten durchsuchen"
                    placeholder="Suchen …"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {tags.length > 1 && (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Nach Thema filtern">
                    {[null, ...tags].map((t) => (
                      <button
                        key={t ?? 'alle'}
                        type="button"
                        aria-pressed={tag === t}
                        onClick={() => setTag(t)}
                        className={cn(
                          'h-9 rounded-full border px-3 text-sm pointer-coarse:h-11',
                          tag === t ? 'border-accent bg-accent-soft font-medium text-accent-ink' : 'border-line text-ink-2 hover:text-ink',
                        )}
                      >
                        {t ?? 'Alle'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ul className="divide-y divide-line">
                {visible.slice(0, 300).map((card) => (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => setEditingCard(card)}
                      className="grid w-full grid-cols-1 gap-x-4 rounded-[10px] px-2 py-2.5 text-left transition-colors hover:bg-surface-2 sm:grid-cols-2"
                    >
                      <span className="text-[15px] font-medium">{card.front}</span>
                      <span className="text-[15px] text-ink-2">{card.back}</span>
                      {card.example && <span className="col-span-full mt-0.5 truncate text-[13px] text-ink-3">{card.example}</span>}
                    </button>
                  </li>
                ))}
              </ul>
              {visible.length === 0 && <p className="px-2 py-6 text-center text-ink-2">Keine Karte gefunden.</p>}
            </>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Button
          size="sm"
          variant="ghost"
          className="text-danger"
          icon={<Trash2 size={16} aria-hidden />}
          onClick={() => {
            void deleteDeckWithUndo(deck);
            navigate('/karten');
          }}
        >
          Deck löschen
        </Button>
      </div>

      <Sheet open={sheet === 'edit'} onClose={() => setSheet(null)} title="Deck bearbeiten">
        {sheet === 'edit' && <DeckForm initial={deck} onDone={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={sheet === 'add'} onClose={() => setSheet(null)} title="Neue Karte">
        {sheet === 'add' && <CardForm deck={deck} onDone={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={sheet === 'import'} onClose={() => setSheet(null)} title="Karten importieren" variant="wide">
        {sheet === 'import' && <CsvImport deck={deck} onDone={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={editingCard !== null} onClose={() => setEditingCard(null)} title="Karte bearbeiten">
        {editingCard && <CardForm deck={deck} initial={editingCard} onDone={() => setEditingCard(null)} />}
      </Sheet>
    </>
  );
}
