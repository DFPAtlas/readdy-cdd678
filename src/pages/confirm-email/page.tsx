import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Check, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useAuthStore } from '@/stores/authStore';

type Status = 'confirming' | 'success' | 'expired';

/**
 * Email confirmation landing page.
 *
 * Supabase redirects here (via `emailRedirectTo`) after a user clicks the
 * confirmation link in their email, carrying the session tokens in the URL
 * fragment. The shared auth bootstrap picks that session up and flips
 * `isAuthenticated`, which is our signal to drop the user into the dashboard.
 */
export default function ConfirmEmailPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  const [status, setStatus] = useState<Status>('confirming');
  const [email, setEmail] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [resendError, setResendError] = useState('');

  // Re-derive the session directly on mount. The URL-fragment token can be
  // processed slightly after the global bootstrap ran, so this guarantees we
  // don't strand a freshly-confirmed user on the "expired" screen.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const sessionUser = data.session?.user ?? null;
      if (sessionUser) setUser({ id: sessionUser.id, email: sessionUser.email ?? null });
    });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // Once authenticated, show a brief success state, then slide into the app.
  useEffect(() => {
    if (!isAuthenticated) return;
    setStatus('success');
    const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  // If nothing arrives within a grace period, the link is invalid or expired.
  useEffect(() => {
    if (status !== 'confirming') return;
    const timer = setTimeout(() => {
      setStatus((current) => (current === 'confirming' ? 'expired' : current));
    }, 10000);
    return () => clearTimeout(timer);
  }, [status]);

  const handleResend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResendNotice('');
    setResendError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setResendError('Enter your email first.');
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setResendError('Sign-up is unavailable right now. Please try again later.');
      return;
    }
    setResendBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: trimmed });
      if (error) {
        setResendError('Could not resend. Double-check your email and try again.');
        return;
      }
      setResendNotice('Sent! Check your inbox for a new confirmation link.');
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-6 w-6 text-forge-amber" />
          <h1 className="text-xl font-bold text-forge-text-primary">FORGE</h1>
        </div>

        <div className="bg-forge-panel border border-forge-border-subtle rounded-xl p-6 text-center">
          {status === 'confirming' && (
            <>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forge-amber/10 border border-forge-amber/20">
                <Mail className="h-6 w-6 text-forge-amber" />
              </div>
              <h2 className="text-lg font-semibold text-forge-text-primary mb-2">
                Confirming your email…
              </h2>
              <p className="text-sm text-forge-text-muted mb-6">
                One sec — we&apos;re verifying your account.
              </p>
              <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-forge-border">
                <div className="h-full w-1/2 animate-progress-pulse rounded-full bg-forge-amber" />
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forge-success/10 border border-forge-success/20">
                <Check className="h-6 w-6 text-forge-success" />
              </div>
              <h2 className="text-lg font-semibold text-forge-text-primary mb-2">
                You&apos;re all set!
              </h2>
              <p className="text-sm text-forge-text-muted mb-6">
                Your email is confirmed. Taking you to your dashboard…
              </p>
              <Button type="button" className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
                Go to dashboard
              </Button>
            </>
          )}

          {status === 'expired' && (
            <>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forge-error/10 border border-forge-error/20">
                <Mail className="h-6 w-6 text-forge-error" />
              </div>
              <h2 className="text-lg font-semibold text-forge-text-primary mb-2">
                This link has expired
              </h2>
              <p className="text-sm text-forge-text-muted mb-6">
                Confirmation links expire for security. Enter your email and we&apos;ll send a fresh one.
              </p>

              <form onSubmit={handleResend} className="space-y-3 text-left" noValidate>
                <Input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full"
                  disabled={resendBusy}
                />
                {resendNotice && (
                  <div
                    className="rounded-md bg-forge-success/10 border border-forge-success/20 px-3 py-2.5 text-sm text-forge-success"
                    role="status"
                  >
                    {resendNotice}
                  </div>
                )}
                {resendError && (
                  <div
                    className="rounded-md bg-forge-error/10 border border-forge-error/20 px-3 py-2.5 text-sm text-forge-error"
                    role="alert"
                  >
                    {resendError}
                  </div>
                )}
                <Button type="submit" className="w-full" loading={resendBusy} disabled={resendBusy}>
                  {resendBusy ? 'Sending…' : 'Resend confirmation email'}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-forge-text-muted text-center">
          <Link to="/login" className="text-forge-amber hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}