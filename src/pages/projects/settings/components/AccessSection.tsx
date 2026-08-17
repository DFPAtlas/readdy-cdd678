import { useEffect, useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { Save, Users } from 'lucide-react';
import type { ProjectAccessSettings } from '@/pages/projects/sandbox/sandboxCollaboration';

interface AccessSectionProps {
  projectId: string;
  settings: ProjectAccessSettings;
  canEdit: boolean;
  onSave: (next: ProjectAccessSettings) => Promise<{ ok: boolean; message: string }>;
}

const APPROVAL_OPTIONS = [
  { value: 'none', label: 'No approval required' },
  { value: 'owner', label: 'Owner approval' },
  { value: 'client', label: 'Client approval' },
  { value: 'both', label: 'Owner & client approval' },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function AccessSection({ projectId, settings, canEdit, onSave }: AccessSectionProps) {
  const [draft, setDraft] = useState<ProjectAccessSettings>(settings);
  const [state, setState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setDraft(settings);
    setState('idle');
    setErrorMsg('');
  }, [settings]);

  const dirty =
    draft.approvalRequirement !== settings.approvalRequirement ||
    draft.clientCanEdit !== settings.clientCanEdit ||
    draft.notifyOnPublish !== settings.notifyOnPublish ||
    draft.notifyOnComments !== settings.notifyOnComments;

  const markDirty = () => {
    if (state === 'saved' || state === 'error') setState('idle');
    setErrorMsg('');
  };

  const handleSave = async () => {
    setState('saving');
    setErrorMsg('');
    const res = await onSave(draft);
    if (res.ok) {
      setState('saved');
    } else {
      setState('error');
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="approval-requirement" className="block text-xs font-medium text-forge-text-primary mb-1.5">
          Approval requirement
        </label>
        <Select
          id="approval-requirement"
          options={APPROVAL_OPTIONS}
          value={draft.approvalRequirement}
          disabled={!canEdit}
          onChange={(e) => {
            setDraft({ ...draft, approvalRequirement: e.target.value as ProjectAccessSettings['approvalRequirement'] });
            markDirty();
          }}
          className="w-full max-w-xs"
        />
        <p className="mt-1.5 text-xs text-forge-text-muted">
          Who must approve before this project can publish to production.
        </p>
      </div>

      <div className="space-y-3">
        <Switch
          id="client-can-edit"
          checked={draft.clientCanEdit}
          disabled={!canEdit}
          onChange={(e) => {
            setDraft({ ...draft, clientCanEdit: e.target.checked });
            markDirty();
          }}
          label="Allow clients to edit content"
        />
        <Switch
          id="notify-on-publish"
          checked={draft.notifyOnPublish}
          disabled={!canEdit}
          onChange={(e) => {
            setDraft({ ...draft, notifyOnPublish: e.target.checked });
            markDirty();
          }}
          label="Notify collaborators on publish"
        />
        <Switch
          id="notify-on-comments"
          checked={draft.notifyOnComments}
          disabled={!canEdit}
          onChange={(e) => {
            setDraft({ ...draft, notifyOnComments: e.target.checked });
            markDirty();
          }}
          label="Notify collaborators on new comments"
        />
      </div>

      {!canEdit && (
        <p className="text-xs text-forge-text-muted">
          Only the workspace owner can change access settings. You can view these settings but not edit them.
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!canEdit || !dirty || state === 'saving'}
          loading={state === 'saving'}
          icon={<Save className="h-3.5 w-3.5" />}
        >
          {state === 'saving' ? 'Saving…' : 'Save access settings'}
        </Button>
        <span aria-live="polite" className="text-xs">
          {state === 'saved' && <span className="text-forge-amber">Saved</span>}
          {state === 'error' && <span className="text-forge-error">{errorMsg}</span>}
        </span>
      </div>

      <div className="pt-2 border-t border-forge-border-subtle">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-8 w-8 rounded-md bg-forge-border flex items-center justify-center">
            <Users className="h-4 w-4 text-forge-text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-forge-text-primary">Project members</p>
            <p className="mt-1 text-xs text-forge-text-muted leading-relaxed">
              Invite collaborators, assign roles and manage access from the Members area.
            </p>
            <div className="mt-3">
              <LinkButton to={`/projects/${projectId}/members`} variant="secondary" size="sm">
                Manage Members
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}