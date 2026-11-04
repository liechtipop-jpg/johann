import { ChevronRight, Music, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { diffDays, relativeDays } from '@/lib/dates';
import { formatMinutes } from '@/lib/format';
import { useToday } from '@/lib/useNow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { toast } from '@/ui/toast';
import { addSuggestedPieces } from './actions';
import { minutesPerPiece } from './logic/practice';
import { PieceStatusBadge } from './PieceStatusBadge';
import { PIECE_SUGGESTIONS } from './suggestions';
import type { PianoData } from './usePianoData';

export function RepertoireList({ data, onAdd }: { data: PianoData; onAdd: () => void }) {
  const today = useToday();
  if (data.pieces.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Music}
          title="Noch keine Stücke"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="primary"
                icon={<Sparkles size={18} aria-hidden />}
                onClick={async () => {
                  const n = await addSuggestedPieces();
                  toast(n === 1 ? '1 Stück hinzugefügt' : `${n} Stücke hinzugefügt`);
                }}
              >
                Vorschläge übernehmen
              </Button>
              <Button icon={<Plus size={18} aria-hidden />} onClick={onAdd}>
                Eigenes Stück
              </Button>
            </div>
          }
        >
          Vorschläge: {PIECE_SUGGESTIONS.map((s) => s.title).join(', ')}. Abschnitte, Tempi und Lektionsnotizen ergänzt du danach selbst.
        </EmptyState>
      </Card>
    );
  }
  const minutes = minutesPerPiece(data.logs);
  const lastPractice = new Map<string, string>();
  for (const log of data.logs) if (log.pieceId && !lastPractice.has(log.pieceId)) lastPractice.set(log.pieceId, log.date);

  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {data.pieces.map((piece) => {
        const ready = piece.sections.filter((s) => s.status === 'ready').length;
        const last = lastPractice.get(piece.id);
        return (
          <li key={piece.id}>
            <Link
              to={`/klavier/stueck/${piece.id}`}
              className="flex h-full items-center gap-3 rounded-[14px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate font-semibold">{piece.title}</p>
                  <PieceStatusBadge status={piece.status} />
                </div>
                {piece.composer && <p className="truncate text-[13px] text-ink-2">{piece.composer}</p>}
                <p className="mt-1.5 text-[13px] text-ink-2">
                  {piece.sections.length > 0 ? `${ready} von ${piece.sections.length} Abschnitten vorspielreif` : 'Noch keine Abschnitte'}
                  {' · '}
                  {formatMinutes(minutes.get(piece.id) ?? 0)} geübt
                  {last ? ` · zuletzt ${relativeDays(diffDays(today, last)).toLowerCase()}` : ''}
                </p>
                {piece.sections.length > 0 && (
                  <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                    {piece.sections.map((s) => (
                      <span
                        key={s.id}
                        className={
                          s.status === 'ready'
                            ? 'flex-1 bg-success'
                            : s.status === 'consolidating'
                              ? 'flex-1 bg-accent'
                              : 'flex-1 bg-surface-3'
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight size={18} aria-hidden className="shrink-0 text-ink-3" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
