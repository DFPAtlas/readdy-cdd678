import { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface PermissionGateProps {
  required: string;
  fallback?: ReactNode;
  children: ReactNode;
}

const demoPermissions = ['*', 'project:read', 'project:write', 'build:execute', 'settings:read', 'settings:write'];

export function PermissionGate({ required, fallback, children }: PermissionGateProps) {
  const hasPermission = demoPermissions.includes(required) || demoPermissions.includes('*');

  if (!hasPermission) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ShieldAlert className="h-8 w-8 text-forge-text-muted mb-2" />
        <p className="text-sm text-forge-text-muted">You don't have permission to access this.</p>
      </div>
    );
  }

  return <>{children}</>;
}