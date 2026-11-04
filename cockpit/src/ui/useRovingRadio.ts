import { useRef, type KeyboardEvent } from 'react';

/**
 * Tastaturbedienung für Auswahlgruppen (role="radiogroup"):
 * Pfeiltasten wechseln die Auswahl, nur das gewählte Element ist per Tab erreichbar.
 */
export function useRovingRadio<T>(values: readonly T[], selected: T | undefined, onSelect: (value: T) => void) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = values.findIndex((v) => v === selected);
  const tabbable = selectedIndex >= 0 ? selectedIndex : 0;

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = values.length - 1;
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next < 0) return;
    event.preventDefault();
    onSelect(values[next]);
    refs.current[next]?.focus();
  }

  return (index: number) => ({
    ref: (el: HTMLButtonElement | null) => {
      refs.current[index] = el;
    },
    type: 'button' as const,
    role: 'radio' as const,
    'aria-checked': index === selectedIndex,
    tabIndex: index === tabbable ? 0 : -1,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => handleKey(event, index),
    onClick: () => onSelect(values[index]),
  });
}
