import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GuestOnly, RequireAuth } from './components/RequireAuth';
import { PageLoader } from './components/Spinner';
import { AuthProvider } from './context/AuthContext';
import { TasksProvider } from './context/TasksContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { NotFoundPage, PrivacyPage, TermsPage } from './pages/LegalPages';

const TasksPage = lazy(() => import('./pages/TasksPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TasksProvider>
          <BrowserRouter basename={basename}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route
                    index
                    element={
                      <RequireAuth>
                        <TasksPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="account"
                    element={
                      <RequireAuth>
                        <AccountPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="login"
                    element={
                      <GuestOnly>
                        <LoginPage />
                      </GuestOnly>
                    }
                  />
                  <Route
                    path="signup"
                    element={
                      <GuestOnly>
                        <SignupPage />
                      </GuestOnly>
                    }
                  />
                  <Route path="privacy" element={<PrivacyPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TasksProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
