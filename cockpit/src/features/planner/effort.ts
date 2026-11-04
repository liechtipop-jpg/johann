import type { Effort } from '@/db/schemas';

export const EFFORT_OPTIONS = [
  { value: 'S' as const, label: 'S' },
  { value: 'M' as const, label: 'M' },
  { value: 'L' as const, label: 'L' },
];

export const EFFORT_LABELS: Record<Effort, string> = { S: 'klein', M: 'mittel', L: 'gross' };
