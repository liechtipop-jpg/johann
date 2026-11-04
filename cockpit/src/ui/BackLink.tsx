import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

/** Zurück-Link für Unterseiten (in der installierten App gibt es keinen Browser-Zurück-Knopf). */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="-ml-2 mb-3 inline-flex h-11 items-center gap-0.5 rounded-[10px] pr-3 pl-1 text-[15px] font-medium text-accent-ink hover:bg-surface-2"
    >
      <ChevronLeft size={20} aria-hidden />
      {label}
    </Link>
  );
}
