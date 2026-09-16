import type { AuthUser } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const ACCESS_KEY = 'edutrack_access_token';
const REFRESH_KEY = 'edutrack_refresh_token';

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const response = await fetch(`${API_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) return false;

  const data = await response.json();
  localStorage.setItem(ACCESS_KEY, data.access);
  return true;
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const access = getAccessToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (access) headers.set('Authorization', `Bearer ${access}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch(path, options, false);
    }
    clearTokens();
  }

  return response;
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('E-mail ou senha inválidos.');
  }

  const data = await response.json();
  setTokens(data.access, data.refresh);
}

export function logout(): void {
  clearTokens();
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

export async function getMe(): Promise<AuthUser | null> {
  if (!getAccessToken()) return null;

  const response = await apiFetch('/me/');
  if (!response.ok) return null;

  const data = await response.json();
  return { ...data, id: String(data.id) };
}
