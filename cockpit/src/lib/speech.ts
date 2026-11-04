/** Aussprache über die Web Speech API (offline nur mit lokal installierten Stimmen). */

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function speakable(lang: string | undefined): lang is string {
  return Boolean(lang) && canSpeak();
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const wanted = lang.toLowerCase();
  const exact = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === wanted);
  const pool = exact.length ? exact : voices.filter((v) => v.lang.toLowerCase().startsWith(wanted.slice(0, 2)));
  return pool.find((v) => v.localService) ?? pool[0];
}

export function speak(text: string, lang: string): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[«»"]/g, '').replace(/\s*\/\s*/g, ', '));
  utterance.lang = lang;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  synth.speak(utterance);
}
