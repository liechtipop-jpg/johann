import { Compass } from 'lucide-react';
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
const ExamDetailPage = lazy(() => import('./features/planner/ExamDetailPage'));
const GradesPage = lazy(() => import('./features/grades/GradesPage'));
const SubjectGradesPage = lazy(() => import('./features/grades/SubjectGradesPage'));
const PromotionPage = lazy(() => import('./features/grades/PromotionPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const DecksPage = lazy(() => import('./features/flashcards/DecksPage'));
const DeckPage = lazy(() => import('./features/flashcards/DeckPage'));
const StudyPage = lazy(() => import('./features/flashcards/StudyPage'));
const CardStatsPage = lazy(() => import('./features/flashcards/StatsPage'));
const OnboardingPage = lazy(() => import('./features/onboarding/OnboardingPage'));
const KlavierPage = lazy(() => import('./features/piano/KlavierPage'));
const PieceDetailPage = lazy(() => import('./features/piano/PieceDetailPage'));
const FocusPage = lazy(() => import('./features/focus/FocusPage'));
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
    path: '/karten/lernen/:deckId',
    element: (
      <Suspense fallback={null}>
        <StudyPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'planer', element: <PlannerPage /> },
      { path: 'planer/pruefung/:examId', element: <ExamDetailPage /> },
      { path: 'noten', element: <GradesPage /> },
      { path: 'noten/fach/:subjectId', element: <SubjectGradesPage /> },
      { path: 'noten/promotion', element: <PromotionPage /> },
      { path: 'karten', element: <DecksPage /> },
      { path: 'karten/deck/:deckId', element: <DeckPage /> },
      { path: 'karten/statistik', element: <CardStatsPage /> },
      { path: 'klavier', element: <KlavierPage /> },
      { path: 'klavier/stueck/:pieceId', element: <PieceDetailPage /> },
      { path: 'fokus', element: <FocusPage /> },
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
