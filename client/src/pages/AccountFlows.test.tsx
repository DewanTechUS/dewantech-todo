import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { TasksProvider } from '../context/TasksContext';
import { ThemeProvider } from '../context/ThemeContext';
import { api } from '../lib/api';
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from './AuthPages';
import LandingPage from './LandingPage';
import SupportPage from './SupportPage';

function renderAt(path: string, element: ReactNode, route = '*') {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <TasksProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={route} element={element} />
              <Route path="/" element={<p>Home page</p>} />
            </Routes>
          </MemoryRouter>
        </TasksProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('password reset pages', () => {
  it('links to "Forgot password?" from the login screen', () => {
    renderAt('/login', <LoginPage />);
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
  });

  it('requests a reset link and shows a confirmation', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(api, 'forgotPassword').mockResolvedValue({ message: "If an account exists, we've sent a link." });
    renderAt('/forgot-password', <ForgotPasswordPage />);

    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/enter the email/i);
    expect(spy).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Email'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(spy).toHaveBeenCalledWith('me@example.com');
    expect(await screen.findByText(/we've sent a link/i)).toBeInTheDocument();
  });

  it('explains when a reset link is malformed', () => {
    renderAt('/reset-password?token=nope', <ResetPasswordPage />);
    expect(screen.getByRole('heading', { name: 'Link not valid' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeInTheDocument();
  });

  it('checks the new passwords match, then resets and signs in', async () => {
    const user = userEvent.setup();
    const token = 'a'.repeat(64);
    const spy = vi.spyOn(api, 'resetPassword').mockResolvedValue({
      token: 'jwt',
      user: { id: 'u1', name: 'Rocky', email: 'me@example.com', createdAt: new Date().toISOString() },
    });
    vi.spyOn(api, 'me').mockResolvedValue({ user: { id: 'u1', name: 'Rocky', email: 'me@example.com', createdAt: new Date().toISOString() } });
    renderAt(`/reset-password?token=${token}`, <ResetPasswordPage />, '/reset-password');

    await user.type(screen.getByLabelText('New password'), 'newpass123');
    await user.type(screen.getByLabelText('Confirm new password'), 'different1');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/don't match/);
    expect(spy).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Confirm new password'));
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass123');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(spy).toHaveBeenCalledWith(token, 'newpass123');
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });
});

describe('public pages', () => {
  it('landing page invites visitors to sign up or log in', () => {
    renderAt('/welcome', <LandingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/do next/i);
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('support page answers common questions and shows how to reach us', () => {
    renderAt('/support', <SupportPage />);
    expect(screen.getByRole('heading', { name: 'Help & Support' })).toBeInTheDocument();
    expect(screen.getByText('The microphone isn’t working.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Still need help?' })).toBeInTheDocument();
  });
});
