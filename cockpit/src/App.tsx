import { Compass, Layers, Piano, Timer } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import AppLayout from './app/AppLayout';
import { ComingSoon } from './app/ComingSoon';
import { ErrorBoundary } from './app/ErrorBoundary';
import { useThemeSync } from './app/theme';
import { UpdatePrompt } from './app/UpdatePrompt';
import { SettingsProvider } from './db/SettingsProvider';
import { useSettings } from './db/settingsContext';
import { Toaster } from './ui/Toaster';

const TodayPage = lazy(() => import('./features/today/TodayPage'));
const PlannerPage = lazy(() => import('./features/planner/PlannerPage'));
const GradesPage = lazy(() => import('./features/grades/GradesPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const OnboardingPage = lazy(() => import('./features/onboarding/OnboardingPage'));
const MorePage = lazy(() => import('./app/MorePage'));
const NotFound = lazy(() => import('./app/NotFound'));

const router = createBrowserRouter([
  {
    path: '/willkommen',
    element: (
      <Suspense fallback={null}>
        <OnboardingPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'planer', element: <PlannerPage /> },
      { path: 'noten', element: <GradesPage /> },
      { path: 'karten', element: <ComingSoon title="Karteikarten" phase={4} icon={Layers} /> },
      { path: 'klavier', element: <ComingSoon title="Klavier" phase={6} icon={Piano} /> },
      { path: 'fokus', element: <ComingSoon title="Fokus-Timer" phase={6} icon={Timer} /> },
      { path: 'kompass', element: <ComingSoon title="Studienwahl-Kompass" phase={7} icon={Compass} /> },
      { path: 'mehr', element: <MorePage /> },
      { path: 'einstellungen', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

function ThemeSync() {
  const { appearance } = useSettings();
  useThemeSync(appearance.theme);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ThemeSync />
        <RouterProvider router={router} />
        <Toaster />
        <UpdatePrompt />
      </SettingsProvider>
    </ErrorBoundary>
  );
}
