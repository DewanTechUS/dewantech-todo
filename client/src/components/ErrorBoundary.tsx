import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AppLogo } from './Brand';

interface State {
  error: Error | null;
}

/** Shows a friendly recovery screen instead of a blank page if something crashes while rendering. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <AppLogo size={72} />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-md text-slate-600 dark:text-slate-400">
          Sorry — DoNext hit an unexpected problem. Your tasks are saved on this device. Reloading usually fixes it.
        </p>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Reload DoNext
        </button>
      </div>
    );
  }
}
