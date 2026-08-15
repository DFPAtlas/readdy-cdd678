import { useState } from 'react';
import { Github, Mail, RotateCcw, Send, Zap } from 'lucide-react';

type AuthProvider = 'google' | 'github';

export default function AiSignInPrompt({
  busy,
  error,
  sentTo,
  onEmailSignIn,
  onProviderSignIn,
}: {
  busy: boolean;
  error: string | null;
  sentTo: string | null;
  onEmailSignIn: (email: string) => void;
  onProviderSignIn: (provider: AuthProvider) => void;
}) {
  const [email, setEmail] = useState('');

  const submit = () => {
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return;
    onEmailSignIn(trimmed);
  };

  return (
    <div className="ai-signin-prompt">
      <div className="ai-signin-head">
        <span className="ai-signin-icon"><Zap size={15} /></span>
        <div>
          <strong>Unlock live AI</strong>
          <span>Sign in to use Forge&apos;s secure AI gateway</span>
        </div>
      </div>

      {sentTo ? (
        <div className="ai-signin-sent">
          <Mail size={14} />
          <span>Check your inbox at <b>{sentTo}</b> — click the link to finish signing in. Live AI activates automatically.</span>
        </div>
      ) : (
        <>
          <div className="ai-signin-email">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
            />
            <button onClick={submit} disabled={busy}>
              {busy ? <RotateCcw className="spin" size={14} /> : <Send size={14} />}
              Send link
            </button>
          </div>
          <div className="ai-signin-divider"><span>or continue with</span></div>
          <div className="ai-signin-providers">
            <button onClick={() => onProviderSignIn('google')} disabled={busy}>
              <span className="ai-provider-g">G</span>Google
            </button>
            <button onClick={() => onProviderSignIn('github')} disabled={busy}>
              <Github size={15} />GitHub
            </button>
          </div>
        </>
      )}

      {error && <div className="ai-signin-error">{error}</div>}
      <p className="ai-signin-note">Smart local mode stays available for free in the meantime.</p>
    </div>
  );
}