import { Monitor, Moon, Sun } from 'lucide-react';
import { useRef, useState } from 'react';
import { patchSetting, setSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { DevTools } from '@/features/dev/DevTools';
import { PromotionRulesEditor } from '@/features/grades/PromotionRulesEditor';
import { useHashScroll } from '@/lib/useHashScroll';
import { Card } from '@/ui/Card';
import { Field, Input } from '@/ui/Field';
import { PageHeader } from '@/ui/PageHeader';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { toast } from '@/ui/toast';
import { DataSettings } from './DataSettings';
import { SemestersSettings } from './SemestersSettings';
import { StudyPlanSettings } from './StudyPlanSettings';
import { SubjectsSettings } from './SubjectsSettings';

const THEME_OPTIONS = [
  {
    value: 'system' as const,
    label: (
      <>
        <Monitor size={16} aria-hidden /> System
      </>
    ),
  },
  {
    value: 'light' as const,
    label: (
      <>
        <Sun size={16} aria-hidden /> Hell
      </>
    ),
  },
  {
    value: 'dark' as const,
    label: (
      <>
        <Moon size={16} aria-hidden /> Dunkel
      </>
    ),
  },
];

export default function SettingsPage() {
  const settings = useSettings();
  useHashScroll(true);
  return (
    <>
      <PageHeader title="Einstellungen" />
      <div className="mx-auto max-w-2xl space-y-4 lg:mx-0">
        <Card id="profil" title="Profil">
          <ProfileForm key={settings.profile.name} name={settings.profile.name} />
        </Card>
        <Card id="darstellung" title="Darstellung">
          <SegmentedControl
            label="Farbschema"
            options={THEME_OPTIONS}
            value={settings.appearance.theme}
            onChange={(theme) => void patchSetting('appearance', { theme })}
          />
        </Card>
        <SubjectsSettings />
        <SemestersSettings />
        <StudyPlanSettings />
        <Card id="promotion" title="Promotionsregeln" description="Grundlage für den Promotionsrechner im Bereich Noten.">
          <PromotionRulesEditor value={settings.promotionRules} onChange={(rules) => void setSetting('promotionRules', rules)} />
        </Card>
        <DataSettings />
        <AboutCard />
      </div>
    </>
  );
}

function ProfileForm({ name }: { name: string }) {
  const [value, setValue] = useState(name);
  const save = () => {
    if (value.trim() !== name) void patchSetting('profile', { name: value.trim() });
  };
  return (
    <Field label="Dein Name" hint="Erscheint in der Begrüssung auf «Heute».">
      {(p) => (
        <Input
          {...p}
          value={value}
          maxLength={40}
          autoComplete="given-name"
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      )}
    </Field>
  );
}

function AboutCard() {
  const { dev } = useSettings();
  const taps = useRef<number[]>([]);
  const devMode = import.meta.env.DEV || dev.enabled;

  function onVersionTap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 5 && !devMode) {
      taps.current = [];
      void patchSetting('dev', { enabled: true });
      toast('Entwicklermodus aktiv');
    }
  }

  return (
    <Card id="ueber" title="Über Cockpit">
      <div className="space-y-4">
        <p className="text-[15px] text-ink-2">
          Deine persönliche Schul- und Lern-App. Alle Daten bleiben auf diesem Gerät – keine Konten, kein Server, kein Tracking.
        </p>
        <button type="button" onClick={onVersionTap} className="-mx-1 rounded-[6px] px-1 text-sm text-ink-2 tabular-nums">
          Version {__APP_VERSION__}
        </button>
        {devMode && <DevTools />}
      </div>
    </Card>
  );
}
