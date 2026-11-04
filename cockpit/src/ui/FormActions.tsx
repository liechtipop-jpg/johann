import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';

/** Fusszeile eines Formulars: optional «Zurück», rechts der Speichern-Knopf. */
export function FormActions({ submitLabel, onBack, busy }: { submitLabel: string; onBack?: () => void; busy?: boolean }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      {onBack && (
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={18} aria-hidden />}>
          Zurück
        </Button>
      )}
      <Button type="submit" variant="primary" disabled={busy} className="ml-auto min-w-36">
        {submitLabel}
      </Button>
    </div>
  );
}
