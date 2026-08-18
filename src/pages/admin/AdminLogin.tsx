import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useAuthStore } from '@/stores/authStore';
import { adminApi } from './forgeAdmin';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);

  // Show a short confirmation if arriving here after signing out.
  useEffect(() => {
    const state = location.state as { signedOut?: boolean } | null;
    if (state?.signedOut) {
      setSignedOut(true);
      const timer = setTimeout(() => setSignedOut(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // If already signed in, confirm admin access and go straight in.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    adminApi.whoami().then((res) => {
      if (cancelled) return;
      if (res.ok) navigate('/forge-admin', { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Sign-in is unavailable right now. Please try again later.');
      return;
    }

    setBusy(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        setError('Incorrect email or password.');
        return;
      }
      const sessionUser = data.session?.user ?? null;
      if (!sessionUser) {
        setError('Your session could not be verified. Please sign in again.');
        return;
      }

      // Confirm the live session matches the account that just signed in.
      const { data: verified, error: verifyError } = await supabase.auth.getUser();
      const verifiedUser = verified?.user ?? null;
      if (verifyError || !verifiedUser || verifiedUser.id !== sessionUser.id) {
        setError('Your session could not be verified. Please sign in again.');
        return;
      }

      setUser({ id: verifiedUser.id, email: verifiedUser.email ?? null });

      // Verify this account actually holds a platform admin role.
      const whoami = await adminApi.whoami();
      if (whoami.ok) {
        navigate('/forge-admin', { replace: true });
        return;
      }
      if (whoami.code === 'FORBIDDEN') {
        setError('This account does not have admin access.');
      } else if (whoami.code === 'AUTH_REQUIRED') {
        setError('Your session could not be verified. Please sign in again.');
      } else {
        setError(whoami.message || 'Could not verify admin access.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-lg bg-forge-amber/10 flex items-center justify-center mb-4">
            <i className="ri-shield-keyhole-line text-forge-amber text-2xl" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-forge-panel border border-forge-border-subtle px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-forge-warning" />
            <span className="text-xs font-medium tracking-wide uppercase text-forge-text-muted">
              Restricted area
            </span>
          </div>
          <h1 className="mt-3 text-xl font-bold text-forge-text-primary">Admin sign in</h1>
        </div>

        <div className="bg-forge-panel border border-forge-border-subtle rounded-xl p-6">
          {signedOut && (
            <div
              className="mb-4 rounded-md bg-forge-success/10 border border-forge-success/20 px-3 py-2.5 text-sm text-forge-success"
              role="status"
            >
              <i className="ri-checkbox-circle-line mr-1.5" />
              Signed out successfully
            </div>
          )}

          {error && (
            <div
              className="mb-4 rounded-md bg-forge-error/10 border border-forge-error/20 px-3 py-2.5 text-sm text-forge-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="admin-email" className="block text-sm text-forge-text-secondary mb-1">
                Email
              </label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full"
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm text-forge-text-secondary mb-1">
                Password
              </label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
                disabled={busy}
              />
            </div>
            <div className="flex justify-end">
              <Link to="/reset-password" className="text-xs text-forge-amber hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" loading={busy} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-xs text-forge-text-muted text-center">
          <Link to="/" className="text-forge-amber hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}