import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { PageLoader } from './components/Spinner';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotFoundPage, PrivacyPage, TermsPage } from './pages/LegalPages';

const TasksPage = lazy(() => import('./pages/TasksPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const PeoplePage = lazy(() => import('./pages/PeoplePage'));
const DataPage = lazy(() => import('./pages/DataPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

/** "/" shows the task list for the current person, or "Who's using DoNext?" if nobody is selected. */
function Home() {
  const { loading, me } = useApp();
  if (loading) return <PageLoader />;
  return me ? <TasksPage /> : <WelcomePage />;
}

/** Pages that need someone to be selected first. */
function RequirePerson({ children }: { children: ReactNode }) {
  const { loading, me } = useApp();
  if (loading) return <PageLoader />;
  return me ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App({ dbName }: { dbName?: string }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider dbName={dbName}>
          <BrowserRouter basename={basename}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route
                    path="people"
                    element={
                      <RequirePerson>
                        <PeoplePage />
                      </RequirePerson>
                    }
                  />
                  <Route
                    path="data"
                    element={
                      <RequirePerson>
                        <DataPage />
                      </RequirePerson>
                    }
                  />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="privacy" element={<PrivacyPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
