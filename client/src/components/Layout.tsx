import { Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Alert } from './Alert';
import { Footer } from './Footer';
import { Header } from './Header';

export function Layout() {
  const { error } = useApp();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:shadow dark:focus:bg-slate-800"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {error && <Alert className="mb-4">{error}</Alert>}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
