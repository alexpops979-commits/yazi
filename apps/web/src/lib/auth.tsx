'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MeResponse, TenantSummary } from '@yazi/contracts';
import { api, apiForm, type ApiOptions } from './api';

type Bootstrap = {
  mode: 'single' | 'multi';
  plansEnforced: boolean;
  tenant: { id: string; name: string; slug: string; planCode: string; role: 'OWNER' } | null;
};

type AuthContextValue = {
  me: MeResponse | null;
  loading: boolean;
  error: string | null;
  tenant: TenantSummary | null;
  tenants: TenantSummary[];
  tenantId: string | null;
  isSuperAdmin: boolean;
  mode: 'single' | 'multi';
  setTenant: (tenantId: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; workspaceName?: string }) => Promise<void>;
  guest: () => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Accounts are removed in this build: there is a single workspace and the UI
 * learns about it from a public bootstrap endpoint.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const value = await api<Bootstrap>('/workspace/bootstrap', { retryAuth: false });
      setBootstrap(value);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить рабочее пространство');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const tenant: TenantSummary | null = useMemo(() => {
    if (!bootstrap?.tenant) return null;
    return {
      id: bootstrap.tenant.id,
      name: bootstrap.tenant.name,
      slug: bootstrap.tenant.slug,
      planCode: 'business',
      role: 'OWNER',
      trialEndsAt: null,
      createdAt: new Date().toISOString(),
    };
  }, [bootstrap]);

  const me: MeResponse | null = useMemo(() => {
    if (!tenant) return null;
    return {
      user: {
        id: 'local',
        email: 'local@yazi',
        name: 'Yazi',
        avatarUrl: null,
        role: 'SUPER_ADMIN',
        emailVerifiedAt: null,
      },
      tenants: [tenant],
    };
  }, [tenant]);

  const value: AuthContextValue = {
    me,
    loading,
    error,
    tenant,
    tenants: tenant ? [tenant] : [],
    tenantId: tenant?.id ?? null,
    isSuperAdmin: true,
    mode: bootstrap?.mode ?? 'single',
    setTenant: () => undefined,
    login: async () => {
      throw new Error('Аккаунты отключены');
    },
    register: async () => {
      throw new Error('Аккаунты отключены');
    },
    guest: async () => undefined,
    logout: async () => undefined,
    reload,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/** api() bound to the current workspace. */
export function useApi() {
  const { tenantId } = useAuth();
  return useCallback(
    <T,>(path: string, options: ApiOptions = {}) => api<T>(path, { ...options, tenantId }),
    [tenantId],
  );
}

/** Multipart upload bound to the current workspace. */
export function useApiForm() {
  const { tenantId } = useAuth();
  return useCallback(<T,>(path: string, form: FormData) => apiForm<T>(path, form, tenantId), [tenantId]);
}
