import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';

function AuthCard({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mb-6 mt-1 text-slate-600 dark:text-slate-400">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete: string;
  hint?: string;
}

function Field({ label, type = 'text', value, onChange, error, autoComplete, hint }: FieldProps) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          className={`input ${isPassword ? 'pr-20' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoCapitalize={type === 'email' || isPassword ? 'none' : undefined}
          spellCheck={false}
          required
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-1 my-auto h-10 rounded-lg px-3 text-sm font-medium text-brand-700 dark:text-brand-300"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function useAuthForm() {
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const submit = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await fn();
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields);
      } else setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return { error, setError, fields, busy, submit };
}

export function LoginPage() {
  const { login, sessionExpired, user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const { error, setError, fields, busy, submit } = useAuthForm();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Please enter your email and password.');
    void submit(() => login(email.trim(), password));
  };

  return (
    <AuthCard
      title={sessionExpired ? 'Log in again' : 'Welcome back'}
      subtitle={
        sessionExpired ? (
          'Your session expired. Log in to resume syncing — your tasks on this device are kept.'
        ) : (
          <>
            New here?{' '}
            <Link to="/signup" className="font-semibold text-brand-700 underline dark:text-brand-300">
              Create an account
            </Link>
          </>
        )
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" error={fields.email} />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={fields.password}
        />
        <div className="-mt-1 text-right">
          <Link to="/forgot-password" className="text-sm font-semibold text-brand-700 underline dark:text-brand-300">
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4" label="Logging in" />}
          Log in
        </button>
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [resetPath, setResetPath] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter the email address you signed up with.');
    setBusy(true);
    setError(null);
    try {
      const { message, resetPath: path } = await api.forgotPassword(email.trim());
      setSent(message);
      setResetPath(path ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Reset your password" subtitle="Enter your email and we'll send you a link to choose a new password.">
      {sent ? (
        <div className="space-y-4">
          {resetPath ? (
            <>
              <Alert kind="info">{sent}</Alert>
              <Link to={resetPath} className="btn-primary w-full">
                Choose a new password
              </Link>
            </>
          ) : (
            <Alert kind="success">{sent} Check your inbox (and spam folder). The link expires in 60 minutes.</Alert>
          )}
          <Link to="/login" className="btn-secondary w-full">
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy && <Spinner className="h-4 w-4" label="Sending" />}
            Send reset link
          </button>
          <p className="text-center text-sm">
            <Link to="/login" className="font-semibold text-brand-700 underline dark:text-brand-300">
              Back to log in
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const token = new URLSearchParams(useLocation().search).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <AuthCard title="Link not valid" subtitle="This password reset link is incomplete or has expired.">
        <Link to="/forgot-password" className="btn-primary w-full">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFields({});
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
      return setError('Password must be at least 8 characters and include a letter and a number.');
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password);
      navigate('/', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields);
      } else setError('Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Choose a new password" subtitle="You'll be signed in, and signed out on all your other devices.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && (
          <Alert>
            {error}{' '}
            {/expired|invalid/i.test(error) && (
              <Link to="/forgot-password" className="font-semibold underline">
                Request a new link
              </Link>
            )}
          </Alert>
        )}
        <Field
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={fields.password}
          hint="At least 8 characters, including a letter and a number."
        />
        <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4" label="Saving" />}
          Save new password
        </button>
      </form>
    </AuthCard>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const { error, setError, fields, busy, submit } = useAuthForm();
  const agreeId = useId();
  const accountDeleted = (useLocation().state as { deleted?: boolean } | null)?.deleted;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return setError('Please fill in all fields.');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
      return setError('Password must be at least 8 characters and include a letter and a number.');
    if (!agreed) return setError('Please accept the Terms of Service and Privacy Policy to continue.');
    void submit(() => signup(name.trim(), email.trim(), password));
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle={
        <>
          Already have one?{' '}
          <Link to="/login" className="font-semibold text-brand-700 underline dark:text-brand-300">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {accountDeleted && <Alert kind="success">Your account and all of its tasks have been permanently deleted.</Alert>}
        {error && <Alert>{error}</Alert>}
        <Field label="Name" value={name} onChange={setName} autoComplete="name" error={fields.name} />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" error={fields.email} />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={fields.password}
          hint="At least 8 characters, including a letter and a number."
        />
        <div className="flex items-start gap-3">
          <input
            id={agreeId}
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-6 w-6 shrink-0 rounded accent-brand-600"
          />
          <label htmlFor={agreeId} className="text-sm text-slate-700 dark:text-slate-300">
            I agree to the{' '}
            <Link to="/terms" className="font-semibold underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="font-semibold underline">
              Privacy Policy
            </Link>
            .
          </label>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4" label="Creating account" />}
          Create account
        </button>
      </form>
    </AuthCard>
  );
}
