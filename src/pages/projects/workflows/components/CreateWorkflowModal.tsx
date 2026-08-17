import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';

interface CreateWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<boolean>;
}

export function CreateWorkflowModal({ open, onClose, onSubmit }: CreateWorkflowModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    const ok = await onSubmit(name.trim(), description.trim());
    setSaving(false);
    if (ok) onClose();
    else setError('Unable to create workflow. Please try again.');
  };

  return (
    <Modal open={open} onClose={onClose} title="New workflow">
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-forge-text-secondary mb-1" htmlFor="wf-name">Name</label>
          <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Contact form notification" autoFocus />
        </div>
        <div>
          <label className="block text-xs text-forge-text-secondary mb-1" htmlFor="wf-desc">Description</label>
          <TextArea id="wf-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this workflow do?" />
        </div>
        {error && <p className="text-xs text-forge-error">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!name.trim()}>Create workflow</Button>
        </div>
      </div>
    </Modal>
  );
}