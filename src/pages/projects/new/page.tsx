import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { createProject } from '@/services/projectsService';
import { Sparkles } from 'lucide-react';

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 200;

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && trimmedName.length <= MAX_NAME_LENGTH && !creating;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setCreating(true);
    setError(false);
    try {
      const project = await createProject({ name: trimmedName, description });
      navigate(`/projects/${project.id}/overview`);
    } catch {
      setError(true);
      setCreating(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Create a new project"
        description="Start with the essentials. You can refine the structure once you're inside Forge."
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'New Project' }]}
      />

      <div className="max-w-2xl rounded-lg border border-forge-border-subtle bg-forge-panel p-6">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-forge-text-primary mb-1.5">
              Project name <span className="text-forge-error">*</span>
            </label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              className="w-full h-9"
            />
            <p className="mt-1 text-xs text-forge-text-muted">Give your project a clear, memorable name.</p>
          </div>

          <div>
            <label
              htmlFor="project-description"
              className="block text-sm font-medium text-forge-text-primary mb-1.5"
            >
              Short description <span className="text-forge-text-muted">(optional)</span>
            </label>
            <TextArea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this project be about?"
              maxLength={MAX_DESCRIPTION_LENGTH}
              showCount
            />
          </div>

          <div className="flex items-start gap-2 rounded-md bg-forge-bg border border-forge-border-subtle px-3 py-2.5">
            <Sparkles className="h-4 w-4 text-forge-amber mt-0.5 shrink-0" />
            <p className="text-xs text-forge-text-secondary">
              AI providers are configured at the workspace level.{' '}
              <Link to="/settings/providers" className="text-forge-amber hover:text-forge-amber/80 transition-colors">
                Configure AI providers
              </Link>
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md bg-forge-error/10 border border-forge-error/20 px-3 py-2.5 text-sm text-forge-error"
            >
              Unable to create project. Please try again.
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" loading={creating} disabled={!canSubmit}>
              {creating ? 'Creating project...' : 'Create Project'}
            </Button>
            <Link to="/projects">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}