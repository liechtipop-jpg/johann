import { Minus, Play, Plus, Square } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { patchSetting, type Settings } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useWakeLock } from '@/lib/useWakeLock';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Select } from '@/ui/Field';
import { Kbd } from '@/ui/Kbd';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Stepper } from '@/ui/Stepper';
import { Switch } from '@/ui/Switch';
import { clampBpm, MAX_BPM, MIN_BPM, signatureByLabel, tapTempo, TIME_SIGNATURES, type Subdivision } from './logic/metronome';
import { MetronomeEngine, type ClickEvent } from './metronome/engine';
import { tempoName } from './pieceStatus';

type Config = Settings['metronome'];

/** Beschriftung der Unterteilung je nach Notenwert des Schlags. */
function subdivisionOptions(unit: 4 | 8): Array<{ value: Subdivision; label: string }> {
  const names = unit === 4 ? ['Viertel', 'Achtel', 'Triolen', '16tel'] : ['Achtel', '16tel', 'Triolen', '32tel'];
  return names.map((label, i) => ({ value: (i + 1) as Subdivision, label }));
}

function isInteractive(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName))
  );
}

export function MetronomePanel() {
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const urlBpm = Number(params.get('bpm'));
  const [config, setConfig] = useState<Config>(() =>
    urlBpm
      ? { ...settings.metronome, bpm: clampBpm(urlBpm), trainer: { ...settings.metronome.trainer, enabled: false } }
      : settings.metronome,
  );
  const [running, setRunning] = useState(false);
  const [pulse, setPulse] = useState<ClickEvent | null>(null);
  const engine = useRef<MetronomeEngine | null>(null);
  const taps = useRef<number[]>([]);
  const reduced = useReducedMotion();
  const signature = signatureByLabel(config.signature);
  useWakeLock(running);

  // ?bpm=… aus der URL übernehmen und wieder entfernen
  useEffect(() => {
    if (!params.has('bpm')) return;
    setParams(
      (prev) => {
        prev.delete('bpm');
        return prev;
      },
      { replace: true },
    );
  }, [params, setParams]);

  // Einstellungen verzögert speichern (z. B. beim Halten der Pfeiltaste)
  useEffect(() => {
    engine.current?.update(config);
    const id = setTimeout(() => void patchSetting('metronome', config), 400);
    return () => clearTimeout(id);
  }, [config]);

  // Anzeige synchron zum Ton
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const loop = () => {
      const event = engine.current?.poll();
      if (event) setPulse(event);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => () => engine.current?.dispose(), []);

  const update = (patch: Partial<Config>) => setConfig((c) => ({ ...c, ...patch }));
  const setBpm = (bpm: number) => setConfig((c) => ({ ...c, bpm: clampBpm(bpm) }));

  async function toggle() {
    if (running) {
      engine.current?.stop();
      setRunning(false);
      setPulse(null);
      return;
    }
    engine.current ??= new MetronomeEngine(config);
    engine.current.update(config);
    await engine.current.start();
    setRunning(true);
  }

  function tap() {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 2000), now].slice(-6);
    const bpm = tapTempo(taps.current);
    if (bpm) setConfig((c) => ({ ...c, bpm, trainer: { ...c.trainer, enabled: false } }));
  }

  // Tastatur: Leertaste Start/Stopp, ↑/↓ Tempo (mit Shift ±10), T = Tap
  const actions = useRef({ toggle, tap, setBpm, bpm: config.bpm });
  useEffect(() => {
    actions.current = { toggle, tap, setBpm, bpm: config.bpm };
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || document.querySelector('dialog[open]')) return;
      const a = actions.current;
      if (event.key === ' ' && !isInteractive(event.target)) {
        event.preventDefault();
        void a.toggle();
      } else if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !isInteractive(event.target)) {
        event.preventDefault();
        a.setBpm(a.bpm + (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1));
      } else if (event.key.toLowerCase() === 't' && !isInteractive(event.target)) {
        event.preventDefault();
        a.tap();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const beats = signature.beats;
  const currentBeat = running && pulse ? pulse.beat : -1;
  const shownBpm = running && pulse && config.trainer.enabled ? pulse.bpm : config.trainer.enabled ? config.trainer.start : config.bpm;
  const isDownbeat = pulse?.index === 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
      <Card>
        <div className="flex flex-col items-center gap-5 py-2">
          {/* Grosser Puls */}
          <div className="relative grid size-44 place-items-center sm:size-52" aria-hidden>
            <span
              key={pulse ? `${pulse.bar}-${pulse.index}` : 'idle'}
              className={cn(
                'absolute inset-0 rounded-full transition-colors duration-150',
                !pulse && 'bg-surface-2',
                pulse && pulse.silent && 'border-2 border-dashed border-line-strong bg-transparent',
                pulse && !pulse.silent && pulse.kind === 'sub' && 'bg-surface-3',
                pulse && !pulse.silent && pulse.kind !== 'sub' && (isDownbeat && config.accent ? 'bg-accent' : 'bg-accent-soft'),
                pulse && !pulse.silent && pulse.kind !== 'sub' && !reduced && 'metronome-pulse',
              )}
            />
            <div
              className={cn('relative text-center', pulse && !pulse.silent && isDownbeat && config.accent ? 'text-on-accent' : 'text-ink')}
            >
              <p className="text-[56px] leading-none font-semibold tracking-tight tabular-nums">{shownBpm}</p>
              <p className="mt-1 text-[13px] font-medium opacity-80">
                {pulse?.silent ? 'stumm – weiterzählen' : `BPM · ${tempoName(shownBpm)}`}
              </p>
            </div>
          </div>

          {/* Schläge im Takt */}
          <ol className="flex flex-wrap justify-center gap-2" aria-label={`${beats} Schläge pro Takt`}>
            {Array.from({ length: beats }, (_, i) => (
              <li
                key={i}
                aria-current={i === currentBeat ? 'step' : undefined}
                className={cn(
                  'size-3.5 rounded-full border border-line-strong transition-colors duration-100',
                  i === currentBeat && (pulse?.silent ? 'border-ink-3 bg-ink-3' : 'border-accent bg-accent'),
                )}
              >
                <span className="sr-only">Schlag {i + 1}</span>
              </li>
            ))}
          </ol>

          <div className="flex w-full max-w-sm items-center gap-3">
            <IconButton label="Langsamer" onClick={() => setBpm(config.bpm - 1)} disabled={config.trainer.enabled}>
              <Minus size={20} aria-hidden />
            </IconButton>
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={config.bpm}
              disabled={config.trainer.enabled}
              onChange={(e) => setBpm(Number(e.target.value))}
              aria-label="Tempo in BPM"
              aria-valuetext={`${config.bpm} BPM`}
              className="h-11 min-w-0 flex-1 accent-(--accent)"
            />
            <IconButton label="Schneller" onClick={() => setBpm(config.bpm + 1)} disabled={config.trainer.enabled}>
              <Plus size={20} aria-hidden />
            </IconButton>
          </div>

          <div className="flex w-full max-w-sm gap-2">
            <Button
              variant="primary"
              size="lg"
              block
              onClick={() => void toggle()}
              icon={running ? <Square size={18} aria-hidden /> : <Play size={18} aria-hidden />}
            >
              {running ? 'Stopp' : 'Start'}
            </Button>
            <Button size="lg" onClick={tap} disabled={config.trainer.enabled} className="min-w-24">
              Tap
            </Button>
          </div>
          {running && config.trainer.enabled && pulse && (
            <p className="text-sm text-ink-2" aria-live="polite">
              Takt {pulse.bar + 1} · Ziel {config.trainer.target} BPM
            </p>
          )}
          <p className="hidden text-[13px] text-ink-3 lg:block">
            <Kbd>Leertaste</Kbd> Start/Stopp · <Kbd>↑</Kbd> <Kbd>↓</Kbd> Tempo · <Kbd>T</Kbd> Tap
          </p>
        </div>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card title="Rhythmus">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="metronome-signature" className="text-[15px]">
                Taktart
              </label>
              <Select
                id="metronome-signature"
                value={config.signature}
                onChange={(e) => update({ signature: e.target.value })}
                className="w-28"
              >
                {TIME_SIGNATURES.map((s) => (
                  <option key={s.label} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-[15px]">Unterteilung</span>
              <SegmentedControl
                label="Unterteilung"
                options={subdivisionOptions(signature.unit)}
                value={config.subdivision}
                onChange={(subdivision) => update({ subdivision })}
              />
            </div>
            <Switch checked={config.accent} onChange={(accent) => update({ accent })} label="Betonung auf 1" />
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="metronome-volume" className="text-[15px]">
                Lautstärke
              </label>
              <input
                id="metronome-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={config.volume}
                onChange={(e) => update({ volume: Number(e.target.value) })}
                aria-valuetext={`${Math.round(config.volume * 100)} Prozent`}
                className="h-11 w-40 accent-(--accent)"
              />
            </div>
          </div>
        </Card>

        <Card title="Tempo-Trainer" description="Steigert das Tempo automatisch – ideal für schwierige Stellen.">
          <div className="space-y-3">
            <Switch
              checked={config.trainer.enabled}
              onChange={(enabled) => update({ trainer: { ...config.trainer, enabled } })}
              label="Tempo-Trainer an"
            />
            {config.trainer.enabled && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Row label="Start">
                  <Stepper
                    label="Start-Tempo"
                    value={config.trainer.start}
                    min={MIN_BPM}
                    max={MAX_BPM}
                    step={2}
                    onChange={(start) => update({ trainer: { ...config.trainer, start } })}
                  />
                </Row>
                <Row label="Ziel">
                  <Stepper
                    label="Ziel-Tempo"
                    value={config.trainer.target}
                    min={MIN_BPM}
                    max={MAX_BPM}
                    step={2}
                    onChange={(target) => update({ trainer: { ...config.trainer, target } })}
                  />
                </Row>
                <Row label="Schritt">
                  <Stepper
                    label="BPM pro Schritt"
                    value={config.trainer.step}
                    min={1}
                    max={30}
                    format={(v) => `+${v}`}
                    onChange={(step) => update({ trainer: { ...config.trainer, step } })}
                  />
                </Row>
                <Row label="alle … Takte">
                  <Stepper
                    label="Takte pro Schritt"
                    value={config.trainer.everyBars}
                    min={1}
                    max={64}
                    onChange={(everyBars) => update({ trainer: { ...config.trainer, everyBars } })}
                  />
                </Row>
              </div>
            )}
          </div>
        </Card>

        <Card title="Stumme Takte" description="Das Metronom setzt aus – du zählst innerlich weiter.">
          <div className="space-y-3">
            <Switch
              checked={config.gap.enabled}
              onChange={(enabled) => update({ gap: { ...config.gap, enabled } })}
              label="Stumme Takte an"
            />
            {config.gap.enabled && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Row label="hörbar">
                  <Stepper
                    label="Hörbare Takte"
                    value={config.gap.play}
                    min={1}
                    max={16}
                    onChange={(play) => update({ gap: { ...config.gap, play } })}
                  />
                </Row>
                <Row label="stumm">
                  <Stepper
                    label="Stumme Takte"
                    value={config.gap.mute}
                    min={1}
                    max={16}
                    onChange={(mute) => update({ gap: { ...config.gap, mute } })}
                  />
                </Row>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px] text-ink-2">{label}</span>
      {children}
    </div>
  );
}
