/** Gibt alle 25 ms einen Takt – Worker werden im Hintergrund weniger gedrosselt als der Haupt-Thread. */
let timer: ReturnType<typeof setInterval> | null = null;

self.onmessage = (event: MessageEvent<'start' | 'stop'>) => {
  if (event.data === 'start' && timer === null) {
    timer = setInterval(() => self.postMessage('tick'), 25);
  } else if (event.data === 'stop' && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
};
