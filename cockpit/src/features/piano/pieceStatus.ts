import { BadgeCheck, BookOpen, Repeat2, type LucideIcon } from 'lucide-react';
import type { Piece } from '@/db/schemas';

export type PieceStatus = Piece['status'];

export const PIECE_STATUS: Record<PieceStatus, { label: string; icon: LucideIcon; className: string }> = {
  learning: { label: 'Lernen', icon: BookOpen, className: 'bg-accent-soft text-accent-ink' },
  consolidating: { label: 'Festigen', icon: Repeat2, className: 'bg-surface-2 text-ink-2' },
  ready: { label: 'Vorspielreif', icon: BadgeCheck, className: 'bg-success-soft text-success' },
};

export const STATUS_OPTIONS = (Object.keys(PIECE_STATUS) as PieceStatus[]).map((value) => ({ value, label: PIECE_STATUS[value].label }));

/** Tempo-Bezeichnung als Orientierung (grobe, übliche Bereiche). */
export function tempoName(bpm: number): string {
  if (bpm < 60) return 'Largo';
  if (bpm < 76) return 'Adagio';
  if (bpm < 108) return 'Andante';
  if (bpm < 120) return 'Moderato';
  if (bpm < 168) return 'Allegro';
  return 'Presto';
}
