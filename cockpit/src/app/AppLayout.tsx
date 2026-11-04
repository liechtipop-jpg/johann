import { Suspense, useEffect } from 'react';
import { Navigate, Outlet, ScrollRestoration, useSearchParams } from 'react-router';
import { useSettings } from '@/db/settingsContext';
import { CommandPalette } from './CommandPalette';
import { PlusButton } from './PlusButton';
import { QuickAddSheet } from './QuickAddSheet';
import { ShortcutsHelp } from './ShortcutsHelp';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { ui } from './uiStore';
import { useGlobalShortcuts } from './useGlobalShortcuts';

/** App-Shortcuts aus dem Manifest: /?neu=note öffnet direkt die Schnellerfassung. */
const SHORTCUT_TYPES = { note: 'grade', pruefung: 'exam', aufgabe: 'task' } as const;

export default function AppLayout() {
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const neu = params.get('neu');
  useGlobalShortcuts();

  useEffect(() => {
    if (!neu) return;
    const type = SHORTCUT_TYPES[neu as keyof typeof SHORTCUT_TYPES];
    if (type) ui.openQuickAdd(type);
    setParams(
      (prev) => {
        prev.delete('neu');
        return prev;
      },
      { replace: true },
    );
  }, [neu, setParams]);

  if (!settings.onboarding.done) return <Navigate to="/willkommen" replace />;

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-[10px] focus:bg-surface focus:px-4 focus:py-2 focus:shadow-(--shadow-overlay)"
      >
        Zum Inhalt springen
      </a>
      <Sidebar />
      <div className="lg:pl-60">
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1080px] px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+112px)] outline-none sm:px-6 lg:px-10 lg:pt-10 lg:pb-16"
        >
          <Suspense fallback={<div className="h-40" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <TabBar />
      <PlusButton />
      <QuickAddSheet />
      <CommandPalette />
      <ShortcutsHelp />
      <ScrollRestoration />
    </div>
  );
}
