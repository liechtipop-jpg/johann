import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Fängt unerwartete Fehler ab, statt eine leere Seite zu zeigen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const storage = /IndexedDB|Database|OpenFailed|MissingAPI|QuotaExceeded/i.test(`${error.name} ${error.message}`);
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="font-serif text-[34px] leading-tight">Etwas ist schiefgelaufen</h1>
        <p className="text-ink-2">
          {storage
            ? 'Cockpit kann gerade keine Daten speichern. In privaten Fenstern mancher Browser ist der lokale Speicher gesperrt – öffne Cockpit bitte in einem normalen Fenster.'
            : 'Lade die Seite neu. Deine Daten bleiben auf diesem Gerät gespeichert.'}
        </p>
        <pre className="overflow-x-auto rounded-[10px] bg-surface-2 p-3 text-xs text-ink-2">{error.message}</pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-11 rounded-[10px] bg-accent px-4 font-medium text-on-accent"
        >
          Neu laden
        </button>
      </div>
    );
  }
}
