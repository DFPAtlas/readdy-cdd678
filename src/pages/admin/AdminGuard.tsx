import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminInfo } from './forgeAdmin';

const AdminContext = createContext<AdminInfo | null>(null);

export function useAdmin(): AdminInfo | null {
  return useContext(AdminContext);
}

export function hasPermission(admin: AdminInfo | null, perm: string): boolean {
  if (!admin) return false;
  return admin.permissions.includes('*') || admin.permissions.includes(perm);
}

type Status = 'loading' | 'denied' | 'error' | 'ready';

export function AdminGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    adminApi.whoami().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setAdmin(res.data.admin);
        setStatus('ready');
      } else if (res.code === 'FORBIDDEN' || res.code === 'AUTH_REQUIRED') {
        setMessage(res.message);
        setStatus('denied');
      } else {
        setMessage(res.message);
        setStatus('error');
      }
    });
    return () => { cancelled = true; };
  }, [attempt]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-forge-bg">
        <div className="h-8 w-8 rounded-full border-2 border-forge-border border-t-forge-amber animate-spin" />
        <p className="mt-4 text-sm text-forge-text-muted">Verifying admin access…</p>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-forge-bg px-6 text-center">
        <div className="h-12 w-12 rounded-lg bg-forge-error/10 flex items-center justify-center">
          <i className="ri-lock-2-line text-forge-error text-xl" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-forge-text-primary">Access denied</h1>
        <p className="mt-1 max-w-md text-sm text-forge-text-muted">
          {message || 'You do not have platform admin access.'}
        </p>
        <Link to="/dashboard" className="mt-5 text-sm text-forge-amber hover:text-forge-amber-dim transition-colors">
          Back to Forge →
        </Link>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-forge-bg px-6 text-center">
        <div className="h-12 w-12 rounded-lg bg-forge-warning/10 flex items-center justify-center">
          <i className="ri-error-warning-line text-forge-warning text-xl" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-forge-text-primary">Could not reach the admin service</h1>
        <p className="mt-1 max-w-md text-sm text-forge-text-muted">{message}</p>
        <button
          onClick={() => setAttempt((a) => a + 1)}
          className="mt-5 text-sm text-forge-amber hover:text-forge-amber-dim transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return <AdminContext.Provider value={admin}>{children}</AdminContext.Provider>;
}