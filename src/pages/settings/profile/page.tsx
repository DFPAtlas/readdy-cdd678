import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { updateDisplayName, type ProfileData } from '@/services/profileService';
import { getSupabaseClient } from '@/services/supabaseClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { Lock, Copy, Check, LogOut } from 'lucide-react';

function ProfileSkeleton() {
  return (
    <div className="max-w-xl space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <Skeleton className="h-40" />
      <Skeleton className="h-32" />
    </div>
  );
}

function planLabel(planKey: string | null, verified: boolean): string {
  if (!verified) return 'Unable to verify';
  if (!planKey) return 'Unable to verify';

  return planKey.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusLabel(status: string | null): string {
  if (!status) return '—';
  return status.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ProfileContent({ data, retry }: { data: ProfileData; retry: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState(data.displayName ?? '');
  const [savedName, setSavedName] = useState(data.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const dirty = name.trim() !== savedName.trim();

  const handleSave = async () => {
    setSaving(true);
    setSaveState('idle');
    setSaveError('');
    const res = await updateDisplayName(name);
    setSaving(false);
    if (res.ok) {
      setSavedName(name.trim());
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('error');
      setSaveError(res.message);
    }
  };

  const handleCopyId = async () => {
    if (!data.userId) return;
    try {
      await navigator.clipboard.writeText(data.userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — ignore.
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-base font-semibold text-forge-text-primary">Profile</h2>
        <p className="text-sm text-forge-text-muted mt-0.5">
          Your identity and account details. Email is managed by your authentication provider.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={data.displayName ?? 'Avatar'}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-forge-amber/15 text-forge-amber flex items-center justify-center text-lg font-semibold">
              {data.initials ?? '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-forge-text-primary truncate">
              {data.displayName ?? data.email ?? 'Forge user'}
            </p>
            {data.email && <p className="text-xs text-forge-text-muted truncate">{data.email}</p>}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="display-name" className="block text-xs font-medium text-forge-text-secondary mb-1.5">
              Display name
            </label>
            <Input
              id="display-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaveState('idle');
              }}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-forge-text-secondary mb-1.5">
              Email
            </label>
            <Input id="email" value={data.email ?? ''} disabled className="w-full" />
            <p className="text-xs text-forge-text-muted mt-1.5">
              Email is read-only here — it is managed by your authentication provider.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-forge-border-subtle flex items-center gap-3">
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {saveState === 'saved' && (
            <span className="text-xs text-forge-success flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="text-xs text-forge-error">{saveError}</span>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Account information</h3>
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-forge-text-muted">User ID</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-xs text-forge-text-secondary max-w-[220px] truncate">
                {data.userId ?? '—'}
              </span>
              {data.userId && (
                <button
                  onClick={handleCopyId}
                  className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
                  aria-label="Copy user ID"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-forge-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-forge-text-muted">Account created</dt>
            <dd className="text-forge-text-primary">{formatDate(data.accountCreatedAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-forge-text-muted">Plan</dt>
            <dd className="flex items-center gap-2">
              <span className="text-forge-text-primary">{planLabel(data.planKey, data.planVerified)}</span>
              {data.planKey === null ? (
                <LinkButton to="/settings/billing" variant="ghost" size="sm" className="!h-6 !px-1.5 text-xs">
                  Billing settings
                </LinkButton>
              ) : data.paidAccess ? (
                <LinkButton to="/settings/billing" variant="ghost" size="sm" className="!h-6 !px-1.5 text-xs">
                  Manage billing
                </LinkButton>
              ) : (
                <LinkButton to="/pricing" variant="ghost" size="sm" className="!h-6 !px-1.5 text-xs">
                  View pricing
                </LinkButton>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-forge-text-muted">Status</dt>
            <dd className="text-forge-text-primary">{statusLabel(data.planStatus)}</dd>
          </div>
          {data.paidAccess && data.planPeriodEnd && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-forge-text-muted">Renews</dt>
              <dd className="text-forge-text-primary">{formatDate(data.planPeriodEnd)}</dd>
            </div>
          )}
          {data.planKey === null && (
            <div className="rounded-md border border-forge-border-subtle bg-forge-panel px-3 py-2.5">
              <p className="text-xs text-forge-text-muted">
                We couldn't verify your billing status.
              </p>
              <Button size="sm" variant="secondary" onClick={retry} className="mt-2">
                Retry
              </Button>
            </div>
          )}
          {data.billingConflict && (
            <div className="rounded-md border border-forge-amber/30 bg-forge-amber/10 px-3 py-2.5">
              <p className="text-xs font-medium text-forge-amber">Billing conflict</p>
              <p className="text-xs text-forge-text-muted mt-1">
                Multiple billable subscriptions were detected. Review billing.
              </p>
            </div>
          )}
        </dl>
      </Card>

      <div className="flex items-center justify-between rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
        <div>
          <p className="text-sm text-forge-text-primary">Sign out</p>
          <p className="text-xs text-forge-text-muted mt-0.5">End your current Forge session.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleSignOut} loading={signingOut} icon={<LogOut className="h-3.5 w-3.5" />}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export default function SettingsProfilePage() {
  const { data, loading, error, retry } = useProfile();

  if (loading) return <ProfileSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load your profile"
        message="Something went wrong while loading your account details. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view your profile"
        description="You need to be signed in to manage your Forge account details."
        action={
          <LinkButton variant="secondary" to="/login">
            Sign in
          </LinkButton>
        }
      />
    );
  }

  return <ProfileContent data={data} retry={retry} />;
}