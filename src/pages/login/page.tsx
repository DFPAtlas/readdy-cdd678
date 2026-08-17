import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Zap } from 'lucide-react';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useAuthStore } from '@/stores/authStore';

type Mode = 'signin' | 'signup';

function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

// Absolute URL for the branded email-confirmation landing page. Supabase
// sends new users here after they click the link in their confirmation email.
const basePath = __BASE_PATH__.split('/').filter(Boolean).join('/');
const pathPrefix = basePath ? `/${basePath}` : '';
const confirmEmailUrl = `${window.location.origin}${pathPrefix}/confirm-email`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const redirectTarget = safeRedirect(searchParams.get('redirect')) ?? '/dashboard';

  // If already signed in, don't show the login form — go straight in.
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Sign-in is unavailable right now. Please try again later.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          setError('Incorrect email or password.');
          return;
        }
        const sessionUser = data.session?.user ?? null;
        if (sessionUser) setUser({ id: sessionUser.id, email: sessionUser.email ?? null });
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: confirmEmailUrl },
        });
        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('already registered')) {
            setError('An account with this email already exists. Sign in instead.');
          } else {
            setError('Unable to create your account. Please try again.');
          }
          return;
        }
        const sessionUser = data.session?.user ?? null;
        if (sessionUser) {
          setUser({ id: sessionUser.id, email: sessionUser.email ?? null });
        } else {
          // Email confirmation is enabled — no session yet. Send them to a
          // dedicated "check your inbox" screen instead of a tiny notice.
          navigate(`/check-email?email=${encodeURIComponent(trimmedEmail)}`, { replace: true });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-6 w-6 text-forge-amber" />
          <h1 className="text-xl font-bold text-forge-text-primary">FORGE</h1>
        </div>

        <div className="bg-forge-panel border border-forge-border-subtle rounded-xl p-6">
          <div className="flex p-1 rounded-full bg-forge-bg border border-forge-border-subtle mb-6">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'bg-forge-amber text-forge-text-inverse'
                  : 'text-forge-text-muted hover:text-forge-text-primary'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-forge-amber text-forge-text-inverse'
                  : 'text-forge-text-muted hover:text-forge-text-primary'
              }`}
            >
              Create account
            </button>
          </div>

          <h2 className="text-lg font-semibold text-forge-text-primary mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-forge-text-muted mb-6">
            {mode === 'signin'
              ? 'Sign in to your Forge workspace'
              : 'Start building with Forge — free to begin'}
          </p>

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
              <label htmlFor="auth-email" className="block text-sm text-forge-text-secondary mb-1">
                Email
              </label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full"
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-sm text-forge-text-secondary mb-1">
                Password
              </label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
                disabled={busy}
              />
            </div>
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-sm text-forge-text-secondary mb-1"
                >
                  Confirm password
                </label>
                <Input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full"
                  disabled={busy}
                />
              </div>
            )}
            {mode === 'signin' && (
              <div className="flex justify-end">
                <Link to="/reset-password" className="text-xs text-forge-amber hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}
            <Button type="submit" className="w-full" loading={busy} disabled={busy}>
              {busy
                ? mode === 'signin'
                  ? 'Signing in…'
                  : 'Creating account…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
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