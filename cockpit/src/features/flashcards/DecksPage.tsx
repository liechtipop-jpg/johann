import { BarChart3, ChevronRight, Layers, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSubjectMap } from '@/db/hooks';
import { plural } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { PageHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/Sheet';
import { SubjectChip } from '@/ui/Subject';
import { addStarterDeck } from './actions';
import { DeckForm } from './DeckForm';
import { STARTER_DECKS } from './starter';
import { useDecks } from './useDecks';

const linkButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-medium transition-colors';

export default function DecksPage() {
  const overview = useDecks();
  const subjects = useSubjectMap();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  if (!overview) return null;
  const { rows, totalDue } = overview;
  const added = new Set(rows.map((r) => r.deck.source));
  const starters = STARTER_DECKS.filter((s) => !added.has(s.key));

  async function addStarter(key: string) {
    setAdding(key);
    try {
      await addStarterDeck(key);
    } finally {
      setAdding(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Karteikarten"
        subtitle={rows.length ? (totalDue ? `${plural(totalDue, 'Karte', 'Karten')} für heute` : 'Für heute alles erledigt') : undefined}
        actions={
          <>
            {rows.length > 0 && (
              <Link to="/karten/statistik" className={`${linkButton} border border-line bg-surface hover:bg-surface-2`}>
                <BarChart3 size={18} aria-hidden />
                Statistik
              </Link>
            )}
            <Button variant={totalDue ? 'secondary' : 'primary'} icon={<Plus size={18} aria-hidden />} onClick={() => setCreating(true)}>
              Deck
            </Button>
            {totalDue > 0 && (
              <Link to="/karten/lernen/alle" className={`${linkButton} bg-accent text-on-accent hover:bg-accent-hover`}>
                Alle lernen
              </Link>
            )}
          </>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="Noch keine Karteikarten"
            action={
              <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => setCreating(true)}>
                Eigenes Deck erstellen
              </Button>
            }
          >
            Starte mit einem fertigen Deck unten oder erstelle dein eigenes – auch per CSV- oder Quizlet-Import.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map(({ deck, counts, cards }) => {
            const subject = deck.subjectId ? subjects.get(deck.subjectId) : undefined;
            const today = counts.due + counts.newToday;
            return (
              <article key={deck.id} className="flex items-center gap-2 rounded-[14px] border border-line bg-surface p-2 pl-4">
                <Link to={`/karten/deck/${deck.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] py-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[16px] font-semibold">{deck.name}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
                      {subject && <SubjectChip name={subject.name} color={subject.color} />}
                      <span>{plural(cards, 'Karte', 'Karten')}</span>
                      {today > 0 && (
                        <span className="font-medium text-accent-ink">
                          {counts.due > 0 && `${counts.due} fällig`}
                          {counts.due > 0 && counts.newToday > 0 && ' · '}
                          {counts.newToday > 0 && `${counts.newToday} neu`}
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronRight size={18} aria-hidden className="shrink-0 text-ink-3" />
                </Link>
                {today > 0 && (
                  <Link
                    to={`/karten/lernen/${deck.id}`}
                    className={`${linkButton} shrink-0 bg-accent-soft px-3 text-accent-ink hover:brightness-95`}
                  >
                    Lernen
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}

      {starters.length > 0 && (
        <Card title="Startdecks" description="Selbst geschrieben, jede Karte mit Beispielsatz. Mit einem Tap übernehmen." className="mt-4">
          <ul className="-my-1 divide-y divide-line">
            {starters.map((s) => (
              <li key={s.key} className="flex items-center gap-3 py-2.5">
                <Sparkles size={18} aria-hidden className="shrink-0 text-ink-3" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-[13px] text-ink-2">
                    {s.count} Karten · {s.description}
                  </p>
                </div>
                <Button size="sm" disabled={adding !== null} onClick={() => void addStarter(s.key)}>
                  {adding === s.key ? 'Wird geladen …' : 'Hinzufügen'}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet open={creating} onClose={() => setCreating(false)} title="Neues Deck">
        {creating && (
          <DeckForm
            onDone={(deck) => {
              setCreating(false);
              navigate(`/karten/deck/${deck.id}`);
            }}
          />
        )}
      </Sheet>
    </>
  );
}
