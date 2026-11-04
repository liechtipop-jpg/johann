import { Check, ExternalLink } from 'lucide-react';
import { useId } from 'react';
import { formatGrade } from '@/lib/format';
import { Field, Input, Select } from '@/ui/Field';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { StatusPill } from '@/ui/StatusPill';
import { Stepper } from '@/ui/Stepper';
import { Switch } from '@/ui/Switch';
import {
  COMPENSATION_OPTIONS,
  PROMOTION_SOURCE,
  ROUNDING_OPTIONS,
  ZH_GYM_RULES,
  describeRules,
  rulesEqual,
  type PromotionRules,
} from './logic/rules';

const PRESET_OPTIONS = [
  { value: 'zh-gym' as const, label: 'Zürcher Gymnasien' },
  { value: 'custom' as const, label: 'Eigene Regeln' },
];

/** Promotionsregeln anzeigen und anpassen (Onboarding und Einstellungen). */
export function PromotionRulesEditor({ value, onChange }: { value: PromotionRules; onChange: (rules: PromotionRules) => void }) {
  const detailsId = useId();

  function update(patch: Partial<PromotionRules>) {
    const next = { ...value, ...patch };
    onChange({ ...next, presetId: rulesEqual(next, ZH_GYM_RULES) ? 'zh-gym' : 'custom' });
  }

  return (
    <div className="space-y-5">
      <SegmentedControl
        label="Regelwerk"
        options={PRESET_OPTIONS}
        value={value.presetId}
        onChange={(id) => (id === 'zh-gym' ? onChange({ ...ZH_GYM_RULES }) : onChange({ ...value, presetId: 'custom' }))}
      />

      <ul className="space-y-2 text-[15px]">
        {describeRules(value).map((line) => (
          <li key={line} className="flex gap-2.5">
            <Check size={17} aria-hidden className="mt-0.5 shrink-0 text-accent-ink" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {value.presetId === 'zh-gym' && !PROMOTION_SOURCE.verified && (
        <div className="space-y-2 rounded-[12px] bg-warning-soft p-3.5">
          <StatusPill tone="warning" className="bg-transparent px-0 py-0">
            Bitte mit dem Reglement deiner Schule prüfen
          </StatusPill>
          <p className="text-sm text-ink-2">
            Die Werte entsprechen dem Promotionsreglement der Zürcher Gymnasien nach bestem Wissen. Der Originaltext konnte nicht abgerufen
            und bestätigt werden; an deiner Schule können zusätzliche Regeln gelten (z. B. in der Probezeit).
          </p>
          <a
            href={PROMOTION_SOURCE.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink underline underline-offset-2"
          >
            {PROMOTION_SOURCE.label}
            <ExternalLink size={14} aria-hidden />
          </a>
        </div>
      )}

      <details className="group rounded-[12px] border border-line">
        <summary
          aria-controls={detailsId}
          className="flex h-12 cursor-pointer list-none items-center px-4 text-[15px] font-medium marker:hidden [&::-webkit-details-marker]:hidden"
        >
          Regeln anpassen
          <span aria-hidden className="ml-auto text-ink-3 transition-transform duration-200 group-open:rotate-90">
            ›
          </span>
        </summary>
        <div id={detailsId} className="space-y-5 border-t border-line p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[15px]">Höchstens ungenügende Noten</span>
            <Stepper
              label="Ungenügende Noten"
              value={value.maxInsufficient}
              min={0}
              max={10}
              onChange={(n) => update({ maxInsufficient: n })}
            />
          </div>
          <div className="space-y-2">
            <span id={`${detailsId}-comp`} className="block text-[15px]">
              Kompensation der Punkte unter {formatGrade(value.passMark)}
            </span>
            <SegmentedControl
              label="Kompensation"
              options={COMPENSATION_OPTIONS}
              value={value.compensationFactor}
              onChange={(n) => update({ compensationFactor: n })}
            />
          </div>
          <Field label="Rundung der Zeugnisnote">
            {(p) => (
              <Select {...p} value={value.roundingStep} onChange={(e) => update({ roundingStep: Number(e.target.value) })}>
                {ROUNDING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div>
            <Switch
              label="Mindestschnitt verlangen"
              description="Zusätzliche Regel mancher Schulen"
              checked={value.minAverage !== null}
              onChange={(on) => update({ minAverage: on ? 4 : null })}
            />
            {value.minAverage !== null && (
              <Field label="Mindestschnitt" className="mt-2">
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min={1}
                    max={6}
                    step={0.1}
                    value={value.minAverage ?? 4}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (n >= 1 && n <= 6) update({ minAverage: n });
                    }}
                    className="w-28"
                  />
                )}
              </Field>
            )}
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[15px]">
              Ampel gelb bei Reserve unter
              <span className="block text-[13px] text-ink-2">Punkte über der Kompensationsgrenze</span>
            </span>
            <Stepper
              label="Warnschwelle"
              value={value.warnReserve}
              min={0}
              max={5}
              step={0.5}
              format={(n) => formatGrade(n)}
              onChange={(n) => update({ warnReserve: n })}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
