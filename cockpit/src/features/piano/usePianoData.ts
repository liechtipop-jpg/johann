import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db/db';
import type { Piece, PracticeLog } from '@/db/schemas';

export interface PianoData {
  pieces: Piece[];
  pieceMap: Map<string, Piece>;
  logs: PracticeLog[];
}

/** Stücke (in Reihenfolge) und das Übungslog (neueste zuerst). */
export function usePianoData(): PianoData | undefined {
  const pieces = useLiveQuery(() => db.pieces.orderBy('order').toArray(), []);
  const logs = useLiveQuery(
    async () => (await db.practiceLogs.orderBy('date').reverse().toArray()).sort((a, b) => b.startedAt - a.startedAt),
    [],
  );
  return useMemo(() => {
    if (!pieces || !logs) return undefined;
    return { pieces, pieceMap: new Map(pieces.map((p) => [p.id, p])), logs };
  }, [pieces, logs]);
}
