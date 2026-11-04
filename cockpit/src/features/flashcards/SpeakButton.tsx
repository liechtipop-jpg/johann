import { Volume2 } from 'lucide-react';
import { speak, speakable } from '@/lib/speech';
import { IconButton } from '@/ui/Button';

export function SpeakButton({ text, lang, label = 'Vorlesen' }: { text: string; lang: string | undefined; label?: string }) {
  if (!speakable(lang)) return null;
  return (
    <IconButton
      label={label}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, lang);
      }}
    >
      <Volume2 size={20} aria-hidden />
    </IconButton>
  );
}
