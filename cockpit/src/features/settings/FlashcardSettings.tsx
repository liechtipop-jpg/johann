import { patchSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { canSpeak } from '@/lib/speech';
import { Card } from '@/ui/Card';
import { Field, Select } from '@/ui/Field';
import { Stepper } from '@/ui/Stepper';
import { Switch } from '@/ui/Switch';

const RETENTION = [0.8, 0.85, 0.9, 0.95];

export function FlashcardSettings() {
  const { flashcards } = useSettings();
  return (
    <Card id="karten" title="Karteikarten" description="Planung mit FSRS: Karten kommen kurz vor dem Vergessen wieder.">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[15px]">Neue Karten pro Tag und Deck</span>
          <Stepper
            label="Neue Karten pro Tag"
            value={flashcards.newPerDay}
            min={0}
            max={100}
            step={5}
            onChange={(newPerDay) => void patchSetting('flashcards', { newPerDay })}
          />
        </div>
        <Field label="Gewünschte Trefferquote" hint="Höher heisst: öfter wiederholen, dafür besser behalten.">
          {(p) => (
            <Select
              {...p}
              value={flashcards.retention}
              onChange={(e) => void patchSetting('flashcards', { retention: Number(e.target.value) })}
            >
              {RETENTION.map((r) => (
                <option key={r} value={r}>
                  {Math.round(r * 100)} %
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Switch
          label="Antwort automatisch vorlesen"
          description={canSpeak() ? 'Nach dem Umdrehen in der Sprache der Rückseite.' : 'Dieser Browser kann nicht vorlesen.'}
          checked={flashcards.autoSpeak}
          disabled={!canSpeak()}
          onChange={(autoSpeak) => void patchSetting('flashcards', { autoSpeak })}
        />
      </div>
    </Card>
  );
}
