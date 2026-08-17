import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, KeyRound, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getSupabaseClient } from '@/services/supabaseClient';

// Absolute URL Supabase should send users back to after they click the reset
// link in their email.
const basePath = __BASE_PATH__.split('/').filter(Boolean).join('/');
const pathPrefix = basePath ? `/${basePath}` : '';
const resetPasswordUrl = `${window.location.origin}${pathPrefix}/reset-password`;

/**
 * Password reset page with two modes:
 *  - "request": enter your email to receive a reset link.
 *  - "recovery": reached via the emailed link; choose a new password.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<'request' | 'recovery'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sent, setSent] = useState(false);

  // Detect the password-recovery event fired when a reset link is processed.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('recovery');
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  // Fallback: if the event already fired before this component mounted, the
  // URL hash still carries the recovery marker.
  useEffect(() => {
    if (
      window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('access_token')
    ) {
      setMode('recovery');
    }
  }, []);

  const handleRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email first.');
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Password reset is unavailable right now. Please try again later.');
      return;
    }
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: resetPasswordUrl,
      });
      if (resetError) {
        setError('Could not send a reset link. Double-check your email and try again.');
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  const handleRecovery = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Password reset is unavailable right now. Please try again later.');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('Could not update your password. The link may have expired — request a new one.');
        return;
      }
      setNotice('Password updated.');
      navigate('/dashboard', { replace: true });
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

        <div className="bg-forge-panel border border-forge-border-subtle rounded-xl p-6 text-center">
          {mode === 'request' && (
            <>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forge-amber/10 border border-forge-amber/20">
                <KeyRound className="h-6 w-6 text-forge-amber" />
              </div>
              <h2 className="text-lg font-semibold text-forge-text-primary mb-2">
                Reset your password
              </h2>
              <p className="text-sm text-forge-text-muted mb-6">
                Enter the email on your account and we&apos;ll send you a link to choose a new
                password.
              </p>

              {sent ? (
                <>
                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forge-success/10 border border-forge-success/20">
                    <Check className="h-6 w-6 text-forge-success" />
                  </div>
                  <p className="text-sm text-forge-text-muted mb-6">
                    If an account exists for <span className="text-forge-text-primary font-medium">{email.trim()}</span>,
                    we&apos;ve sent a reset link. Check your inbox (and spam).
                  </p>
                  <Link
                    to="/login"
                    className="text-sm text-forge-amber hover:underline"
                  >
                    Back to sign in
                  </Link>
                </>
              ) : (
                <form onSubmit={handleRequest} className="space-y-4 text-left" noValidate>
                  <div>
                    <label htmlFor="reset-email" className="block text-sm text-forge-text-secondary mb-1">
                      Email
                    </label>
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full"
                      disabled={busy}
                    />
                  </div>
                  {error && (
                    <div
                      className="rounded-md bg-forge-error/10 border border-forge-error/20 px-3 py-2.5 text-sm text-forge-error"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" loading={busy} disabled={busy}>
                    {busy ? 'Sending…' : 'Send reset link'}
                  </Button>
                </form>
              )}
            </>
          )}

          {mode === 'recovery' && (
            <>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forge-amber/10 border border-forge-amber/20">
                <KeyRound className="h-6 w-6 text-forge-amber" />
              </div>
              <h2 className="text-lg font-semibold text-forge-text-primary mb-2">
                Choose a new password
              </h2>
              <p className="text-sm text-forge-text-muted mb-6">
                Pick something you&apos;ll remember — at least 8 characters.
              </p>

              <form onSubmit={handleRecovery} className="space-y-4 text-left" noValidate>
                <div>
                  <label htmlFor="new-password" className="block text-sm text-forge-text-secondary mb-1">
                    New password
                  </label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label htmlFor="confirm-new-password" className="block text-sm text-forge-text-secondary mb-1">
                    Confirm password
                  </label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full"
                    disabled={busy}
                  />
                </div>
                {error && (
                  <div
                    className="rounded-md bg-forge-error/10 border border-forge-error/20 px-3 py-2.5 text-sm text-forge-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
                {notice && (
                  <div
                    className="rounded-md bg-forge-success/10 border border-forge-success/20 px-3 py-2.5 text-sm text-forge-success"
                    role="status"
                  >
                    {notice}
                  </div>
                )}
                <Button type="submit" className="w-full" loading={busy} disabled={busy}>
                  {busy ? 'Updating…' : 'Update password'}
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