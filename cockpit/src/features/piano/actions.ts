import { db } from '@/db/db';
import type { Piece, PracticeLog } from '@/db/schemas';
import { getSetting, setSetting, type Settings } from '@/db/settings';
import { toISODate, type ISODate } from '@/lib/dates';
import { formatMinutes } from '@/lib/format';
import { newId } from '@/lib/ids';
import { elapsedMs, pauseWatch, resetWatch, resumeWatch, startWatch } from '@/lib/stopwatch';
import { toast, toastUndo } from '@/ui/toast';
import { PIECE_SUGGESTIONS } from './suggestions';

/** Kürzere Übungszeiten werden nicht gespeichert. */
export const MIN_PRACTICE_MS = 60_000;
const MAX_SECONDS = 24 * 3600;

export function newPiece(title: string, composer?: string, order = Date.now()): Piece {
  return {
    id: newId(),
    title: title.trim(),
    composer: composer?.trim() || undefined,
    status: 'learning',
    sections: [],
    lessonNotes: [],
    order,
    createdAt: Date.now(),
  };
}

async function nextOrder(): Promise<number> {
  const last = await db.pieces.orderBy('order').last();
  return (last?.order ?? 0) + 1;
}

export async function createPiece(title: string, composer?: string): Promise<Piece> {
  const piece = newPiece(title, composer, await nextOrder());
  await db.pieces.add(piece);
  return piece;
}

/** Legt die vorgeschlagenen Stücke an (ohne Doppelte). Gibt die Anzahl neuer Stücke zurück. */
export async function addSuggestedPieces(): Promise<number> {
  return db.transaction('rw', db.pieces, async () => {
    const existing = new Set((await db.pieces.toArray()).map((p) => p.title.toLowerCase()));
    let order = await nextOrder();
    const fresh = PIECE_SUGGESTIONS.filter((s) => !existing.has(s.title.toLowerCase())).map((s) => newPiece(s.title, s.composer, order++));
    await db.pieces.bulkAdd(fresh);
    return fresh.length;
  });
}

export async function savePiece(next: Piece, previous?: Piece, message?: string): Promise<void> {
  await db.pieces.put(next);
  if (previous && message) toastUndo(message, () => db.pieces.put(previous));
}

export async function deletePiece(piece: Piece): Promise<void> {
  await db.pieces.delete(piece.id);
  toastUndo(`«${piece.title}» gelöscht`, () => db.pieces.put(piece));
}

/* Übungstimer ---------------------------------------------------------------- */

export async function startPractice(pieceId?: string): Promise<void> {
  const stopped = await db.transaction('rw', db.kv, db.practiceLogs, async () => {
    const timer = await getSetting('practiceTimer');
    let log: PracticeLog | undefined;
    if (timer.status !== 'idle') {
      if (timer.pieceId === pieceId) {
        await setSetting('practiceTimer', resumeWatch(timer, Date.now()));
        return undefined;
      }
      // Anderes Stück: bisherige Zeit speichern und neu beginnen
      log = await writeLog(timer, Date.now());
    }
    await setSetting('practiceTimer', { ...startWatch(resetWatch(timer), Date.now()), pieceId });
    return log;
  });
  if (stopped) toast(`${formatMinutes(stopped.seconds / 60)} gespeichert – neuer Timer läuft`);
}

export async function pausePractice(): Promise<void> {
  const timer = await getSetting('practiceTimer');
  await setSetting('practiceTimer', pauseWatch(timer, Date.now()));
}

export async function resumePractice(): Promise<void> {
  const timer = await getSetting('practiceTimer');
  await setSetting('practiceTimer', resumeWatch(timer, Date.now()));
}

export async function setPracticePiece(pieceId: string | undefined): Promise<void> {
  const timer = await getSetting('practiceTimer');
  await setSetting('practiceTimer', { ...timer, pieceId });
}

async function writeLog(timer: Settings['practiceTimer'], now: number): Promise<PracticeLog | undefined> {
  const ms = elapsedMs(timer, now);
  if (timer.startedAt === null || ms < MIN_PRACTICE_MS) return undefined;
  const log: PracticeLog = {
    id: newId(),
    pieceId: timer.pieceId,
    date: toISODate(new Date(timer.startedAt)),
    startedAt: timer.startedAt,
    seconds: Math.min(MAX_SECONDS, Math.round(ms / 1000)),
  };
  await db.practiceLogs.add(log);
  return log;
}

/** Timer beenden und die Zeit ins Übungslog schreiben. */
export async function stopPractice(): Promise<void> {
  const log = await db.transaction('rw', db.kv, db.practiceLogs, async () => {
    const timer = await getSetting('practiceTimer');
    const written = await writeLog(timer, Date.now());
    await setSetting('practiceTimer', { ...resetWatch(timer), pieceId: timer.pieceId });
    return written;
  });
  if (log) toastUndo(`${formatMinutes(log.seconds / 60)} geübt – gespeichert`, () => db.practiceLogs.delete(log.id));
  else toast('Weniger als eine Minute – nicht gespeichert');
}

export async function discardPractice(): Promise<void> {
  const timer = await getSetting('practiceTimer');
  await setSetting('practiceTimer', { ...resetWatch(timer), pieceId: timer.pieceId });
  toastUndo('Timer verworfen', () => setSetting('practiceTimer', timer));
}

/** Übungszeit nachtragen. */
export async function addPracticeLog(input: { date: ISODate; minutes: number; pieceId?: string; note?: string }): Promise<void> {
  const log: PracticeLog = {
    id: newId(),
    pieceId: input.pieceId,
    date: input.date,
    startedAt: new Date(`${input.date}T12:00:00`).getTime(),
    seconds: Math.min(MAX_SECONDS, Math.round(input.minutes * 60)),
    note: input.note?.trim() || undefined,
  };
  await db.practiceLogs.add(log);
  toastUndo(`${formatMinutes(input.minutes)} eingetragen`, () => db.practiceLogs.delete(log.id));
}
