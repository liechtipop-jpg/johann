/** Kurzer Gong und Vibration (z. B. wenn eine Fokusrunde endet). Ohne Audiodateien. */
let ctx: AudioContext | null = null;

/** Bei einer Nutzeraktion aufrufen, damit der Gong später abgespielt werden darf. */
export function primeAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function playChime(): void {
  try {
    primeAudio();
    if (!ctx) return;
    const start = ctx.currentTime + 0.02;
    [880, 1318.5].forEach((freq, i) => {
      const t = start + i * 0.18;
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 1.3);
    });
  } catch {
    // Kein Ton möglich – nicht schlimm.
  }
}

export function vibrate(pattern: number[] = [180, 90, 180]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // nicht unterstützt
  }
}
