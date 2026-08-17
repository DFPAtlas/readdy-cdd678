import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Zap, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getSupabaseClient } from '@/services/supabaseClient';

/**
 * "Check your inbox" screen shown right after signup when email confirmation
 * is enabled (no session yet). Gives users a clear next step and a way to
 * resend the confirmation link if it never lands.
 */
export default function CheckEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [resendBusy, setResendBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const handleResend = async () => {
    setNotice('');
    setError('');
    if (!email) {
      setError('No email on file. Go back and sign up again.');
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Sign-up is unavailable right now. Please try again later.');
      return;
    }
    setResendBusy(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
      if (resendError) {
        setError('Could not resend. Double-check your email and try again.');
        return;
      }
      setNotice('Sent! Check your inbox for a new confirmation link.');
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
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forge-amber/10 border border-forge-amber/20">
            <Mail className="h-6 w-6 text-forge-amber" />
          </div>
          <h2 className="text-lg font-semibold text-forge-text-primary mb-2">
            Check your inbox
          </h2>
          <p className="text-sm text-forge-text-muted mb-6">
            {email ? (
              <>
                We sent a confirmation link to{' '}
                <span className="text-forge-text-primary font-medium">{email}</span>. Click it to
                finish setting up your account.
              </>
            ) : (
              'We sent a confirmation link to your email. Click it to finish setting up your account.'
            )}
          </p>

          {notice && (
            <div
              className="mb-4 rounded-md bg-forge-success/10 border border-forge-success/20 px-3 py-2.5 text-sm text-forge-success"
              role="status"
            >
              {notice}
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

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            loading={resendBusy}
            disabled={resendBusy}
            onClick={handleResend}
          >
            {resendBusy ? 'Sending…' : 'Resend confirmation email'}
          </Button>

          <p className="mt-4 text-xs text-forge-text-muted">
            Didn&apos;t get it? Check your spam folder, or try a different address.
          </p>
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