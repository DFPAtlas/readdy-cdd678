import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { RadioCard } from '@/components/ui/RadioCard';
import { useState } from 'react';
import { LayoutDashboard, Store, Briefcase } from 'lucide-react';

export default function NewProjectPage() {
  const [type, setType] = useState('landing');
  const navigate = useNavigate();

  const handleCreate = () => {
    navigate('/projects/sandbox');
  };

  return (
    <>
      <PageHeader
        title="New Project"
        description="Create a new web development project"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Projects', href: '/projects' }, { label: 'New' }]}
      />
      <Card className="max-w-2xl p-6">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-forge-text-primary mb-1">Project Name</label>
            <Input placeholder="My Awesome Project" className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-forge-text-primary mb-1">Description</label>
            <TextArea placeholder="What will this project be about?" maxLength={500} showCount />
          </div>
          <div>
            <label className="block text-sm font-medium text-forge-text-primary mb-3">Project Type</label>
            <div className="grid grid-cols-3 gap-3">
              <RadioCard
                value="landing"
                selected={type === 'landing'}
                onChange={setType}
                label="Landing Page"
                description="Marketing landing page"
                icon={<LayoutDashboard className="h-5 w-5" />}
              />
              <RadioCard
                value="saas"
                selected={type === 'saas'}
                onChange={setType}
                label="SaaS"
                description="SaaS application"
                icon={<Briefcase className="h-5 w-5" />}
              />
              <RadioCard
                value="ecommerce"
                selected={type === 'ecommerce'}
                onChange={setType}
                label="E-commerce"
                description="Online store"
                icon={<Store className="h-5 w-5" />}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Link to="/projects">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button onClick={handleCreate}>Create Project</Button>
          </div>
        </div>
      </Card>
    </>
  );
}