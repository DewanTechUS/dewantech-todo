import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, sessionExpired } = useAuth();
  // An expired session may log in again (to resume syncing) even though local data is loaded.
  if (status === 'authenticated' && !sessionExpired) return <Navigate to="/" replace />;
  return <>{children}</>;
}
