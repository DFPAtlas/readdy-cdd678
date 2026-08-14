import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuthStore();

  const handleDemoMode = () => {
    setAuthenticated(true);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-6 w-6 text-forge-amber" />
          <h1 className="text-xl font-bold text-forge-text-primary">FORGE</h1>
        </div>
        <div className="bg-forge-panel border border-forge-border-subtle rounded-xl p-6">
          <h2 className="text-lg font-semibold text-forge-text-primary mb-1">Welcome back</h2>
          <p className="text-sm text-forge-text-muted mb-6">Sign in to your Forge workspace</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-forge-text-secondary mb-1">Email</label>
              <Input type="email" placeholder="you@example.com" className="w-full" />
            </div>
            <div>
              <label className="block text-sm text-forge-text-secondary mb-1">Password</label>
              <Input type="password" placeholder="••••••••" className="w-full" />
            </div>
            <Button className="w-full">Sign in</Button>
          </div>
          <p className="mt-4 text-xs text-forge-text-muted text-center">
            <button onClick={handleDemoMode} className="text-forge-amber hover:underline bg-transparent border-none cursor-pointer">
              Enter demo mode
            </button>
          </p>
        </div>
      </div>
      <p className="mt-8 text-xs text-forge-text-muted">Demo module — Authentication will be built in Phase 2</p>
    </div>
  );
}