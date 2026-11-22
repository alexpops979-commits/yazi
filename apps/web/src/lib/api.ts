export const IS_SERVER = typeof window === 'undefined';

export function apiBase(): string {
  if (IS_SERVER) return process.env.API_INTERNAL_URL ?? process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:3001';
  return '/api/proxy';
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export type ApiOptions = {
  method?: string;
  body?: unknown;
  tenantId?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  retryAuth?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (IS_SERVER) return false;
  if (!refreshPromise) {
    refreshPromise = fetch(`${apiBase()}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.tenantId) headers['X-Tenant-Id'] = options.tenantId;

  const response = await fetch(`${apiBase()}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: 'no-store',
  });

  if (response.status === 401 && options.retryAuth !== false && !IS_SERVER) {
    const refreshed = await tryRefresh();
    if (refreshed) return api<T>(path, { ...options, retryAuth: false });
    window.dispatchEvent(new Event('yazi:unauthorized'));
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && String((payload as { message: unknown }).message)) ||
      `Request failed (${response.status})`;
    const code = payload && typeof payload === 'object' && 'code' in payload ? String((payload as { code: unknown }).code) : undefined;
    const details = payload && typeof payload === 'object' && 'details' in payload ? (payload as { details: unknown }).details : undefined;
    throw new ApiError(response.status, message, code, details);
  }

  return payload as T;
}

export async function apiForm<T>(path: string, formData: FormData, tenantId?: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  const response = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload?.message ?? 'Upload failed', payload?.code, payload?.details);
  }
  return payload as T;
}
