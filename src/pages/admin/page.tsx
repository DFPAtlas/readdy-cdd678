import { AdminGuard } from './AdminGuard';
import { OwnerShell } from './OwnerShell';

export default function ForgeAdminPage() {
  return (
    <AdminGuard>
      <OwnerShell />
    </AdminGuard>
  );
}