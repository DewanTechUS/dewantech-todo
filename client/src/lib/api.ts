import type { Session, SyncRequest, SyncResponse, User } from './types';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }

  /** True when the request never reached the server (offline, DNS, CORS, server down). */
  get isNetwork() {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, { method = 'GET', body, token, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new ApiError(0, "Can't reach the server. Check your internet connection and try again.");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : res.status >= 500
          ? 'The server had a problem. Please try again shortly.'
          : `Request failed (${res.status}).`;
    throw new ApiError(res.status, message, data?.details?.fields ?? {});
  }
  return data as T;
}

export const api = {
  signup: (body: { name: string; email: string; password: string }) =>
    apiFetch<Session>('/api/auth/signup', { method: 'POST', body }),
  login: (body: { email: string; password: string }) => apiFetch<Session>('/api/auth/login', { method: 'POST', body }),
  me: (token: string) => apiFetch<{ user: User }>('/api/auth/me', { token }),
  logoutAll: (token: string) => apiFetch<void>('/api/auth/logout-all', { method: 'POST', token }),
  deleteAccount: (token: string, password: string) =>
    apiFetch<void>('/api/auth/me', { method: 'DELETE', token, body: { password } }),
  sync: (token: string, body: SyncRequest) => apiFetch<SyncResponse>('/api/tasks/sync', { method: 'POST', token, body }),
};
