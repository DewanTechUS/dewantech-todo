import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Alert } from './Alert';
import { Footer } from './Footer';
import { Header } from './Header';

export function Layout() {
  const { status, sessionExpired } = useAuth();
  const online = useOnlineStatus();

  return (
    <div className="safe-x flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:shadow dark:focus:bg-slate-800"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="safe-pb-6 mx-auto w-full max-w-5xl flex-1 px-4 pt-6">
        {!online && status === 'authenticated' && (
          <Alert kind="warning" className="mb-4">
            You're offline. You can keep adding and editing tasks — they'll sync automatically when you reconnect.
          </Alert>
        )}
        {sessionExpired && (
          <Alert kind="warning" className="mb-4">
            Your session has expired, so syncing is paused. Your tasks on this device are safe.{' '}
            <Link to="/login" className="font-semibold underline">
              Log in again
            </Link>{' '}
            to resume syncing.
          </Alert>
        )}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
