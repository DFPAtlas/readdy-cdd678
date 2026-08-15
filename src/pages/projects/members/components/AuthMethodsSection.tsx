import { Mail, Lock, KeyRound, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { SiteAuthConfig, AuthMethodKey, SignupMode } from '../membersTypes';
import { SIGNUP_MODES, AUTH_METHODS } from '../membersTypes';

type Props = {
  config: SiteAuthConfig;
  canManage: boolean;
  saving: boolean;
  onConfigChange: (patch: Partial<SiteAuthConfig>) => void;
  onSave: () => void;
};

export function AuthMethodsSection({ config, canManage, saving, onConfigChange, onSave }: Props) {
  const toggleMethod = (key: AuthMethodKey, checked: boolean) => {
    onConfigChange({ methods: { ...config.methods, [key]: checked } });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5">
        <h3 className="text-sm font-medium text-forge-text-primary">Registration</h3>
        <p className="mt-1 text-xs text-forge-text-muted">Control who can create a member account on your published site.</p>
        <div className="mt-3 max-w-sm">
          <Select
            options={SIGNUP_MODES.map((m) => ({ value: m.value, label: `${m.label} — ${m.description}` }))}
            value={config.signupMode}
            disabled={!canManage}
            onChange={(e) => onConfigChange({ signupMode: e.target.value as SignupMode })}
            className="w-full"
          />
        </div>
      </div>

      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5">
        <h3 className="text-sm font-medium text-forge-text-primary">Authentication methods</h3>
        <p className="mt-1 text-xs text-forge-text-muted">Only methods with valid credentials are shown to site visitors. OAuth providers require callback URLs to pass validation.</p>
        <div className="mt-3 divide-y divide-forge-border-subtle">
          {AUTH_METHODS.map((method) => {
            const enabled = config.methods[method.value];
            return (
              <div key={method.value} className="flex items-center gap-3 py-3">
                <div className="h-8 w-8 rounded-md bg-forge-bg border border-forge-border-subtle flex items-center justify-center flex-shrink-0 text-forge-text-secondary">
                  {method.oauth ? <ExternalLink className="h-4 w-4" /> : method.value === 'magic_link' ? <Mail className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-forge-text-primary">{method.label}</span>
                    {method.oauth && enabled && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-forge-warning">
                        <AlertTriangle className="h-3 w-3" /> Credentials required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-forge-text-muted">{method.description}</p>
                </div>
                <Switch
                  checked={enabled}
                  disabled={!canManage}
                  onChange={(e) => toggleMethod(method.value, e.target.checked)}
                  aria-label={`Enable ${method.label}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5">
        <h3 className="text-sm font-medium text-forge-text-primary">Sign-up behaviour</h3>
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-forge-text-secondary mb-1">Post sign-up destination</label>
            <Input
              value={config.postSignupDestination}
              disabled={!canManage}
              onChange={(e) => onConfigChange({ postSignupDestination: e.target.value })}
              placeholder="/account"
            />
            <p className="mt-1 text-[10px] text-forge-text-muted">Where members land after signing up or logging in. Leave empty to return to the page they requested.</p>
          </div>
          <div className="flex items-end">
            <Switch
              checked={config.requireEmailVerification}
              disabled={!canManage}
              onChange={(e) => onConfigChange({ requireEmailVerification: e.target.checked })}
              label="Require email verification"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-forge-text-secondary mb-1">Terms of service URL</label>
            <Input value={config.termsUrl} disabled={!canManage} onChange={(e) => onConfigChange({ termsUrl: e.target.value })} placeholder="https://…/terms" />
          </div>
          <div>
            <label className="block text-xs font-medium text-forge-text-secondary mb-1">Privacy policy URL</label>
            <Input value={config.privacyUrl} disabled={!canManage} onChange={(e) => onConfigChange({ privacyUrl: e.target.value })} placeholder="https://…/privacy" />
          </div>
          <div className="flex items-end">
            <Switch
              checked={config.marketingConsent}
              disabled={!canManage}
              onChange={(e) => onConfigChange({ marketingConsent: e.target.checked })}
              label="Collect marketing consent"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" disabled={!canManage || saving} loading={saving} icon={<KeyRound className="h-3.5 w-3.5" />} onClick={onSave}>Save authentication settings</Button>
      </div>
    </div>
  );
}