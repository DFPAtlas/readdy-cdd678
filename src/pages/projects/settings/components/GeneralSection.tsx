import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { Save } from 'lucide-react';
import type { ProjectSettingsProject } from '@/services/projectSettingsService';

interface GeneralSectionProps {
  project: ProjectSettingsProject;
  canEdit: boolean;
  onSave: (input: { name: string; description: string }) => Promise<{ ok: boolean; message: string }>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function GeneralSection({ project, canEdit, onSave }: GeneralSectionProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [state, setState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? '');
    setState('idle');
    setErrorMsg('');
  }, [project]);

  const dirty = name.trim() !== project.name || description !== (project.description ?? '');

  const markDirty = () => {
    if (state === 'saved' || state === 'error') setState('idle');
    setErrorMsg('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setState('error');
      setErrorMsg('Project name is required.');
      return;
    }
    setState('saving');
    setErrorMsg('');
    const res = await onSave({ name, description });
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
        <label htmlFor="project-name" className="block text-xs font-medium text-forge-text-primary mb-1.5">
          Project name
        </label>
        <Input
          id="project-name"
          value={name}
          disabled={!canEdit}
          onChange={(e) => {
            setName(e.target.value);
            markDirty();
          }}
          className="w-full max-w-md"
        />
        <p className="mt-1.5 text-xs text-forge-text-muted">The display name used across this Forge project.</p>
      </div>

      <div>
        <label htmlFor="project-description" className="block text-xs font-medium text-forge-text-primary mb-1.5">
          Description
        </label>
        <TextArea
          id="project-description"
          value={description}
          disabled={!canEdit}
          onChange={(e) => {
            setDescription(e.target.value);
            markDirty();
          }}
          className="max-w-md"
        />
        <p className="mt-1.5 text-xs text-forge-text-muted">Optional. A short summary of what this project is for.</p>
      </div>

      {!canEdit && (
        <p className="text-xs text-forge-text-muted">
          Only the workspace owner can change project details. You can view these settings but not edit them.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!canEdit || !dirty || state === 'saving'}
          loading={state === 'saving'}
          icon={<Save className="h-3.5 w-3.5" />}
        >
          {state === 'saving' ? 'Saving…' : 'Save changes'}
        </Button>
        <span aria-live="polite" className="text-xs">
          {state === 'saved' && <span className="text-forge-amber">Saved</span>}
          {state === 'error' && <span className="text-forge-error">{errorMsg}</span>}
        </span>
      </div>
    </div>
  );
}