import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import {
  canManageMembers,
  createProjectInvitation,
  revokeProjectInvitation,
  updateProjectMemberRole,
  removeProjectMember,
  type MemberRole,
  type ProjectMember,
} from '@/services/projectMembersService';
import { ProjectSectionHeader } from '@/pages/projects/components/ProjectSectionHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { MembersOverview } from './components/MembersOverview';
import { ProjectMembersList } from './components/ProjectMembersList';
import { PendingInvitesSection } from './components/PendingInvitesSection';
import { InviteMemberModal } from './components/InviteMemberModal';
import { RolesExplanation } from './components/RolesExplanation';
import { MembersActivity } from './components/MembersActivity';
import { RefreshCw, Lock, AlertTriangle, UserPlus } from 'lucide-react';

function MembersSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-40 mb-3" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-64" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { projectId } = useParams();
  const { data, loading, error, retry, refresh, refreshing } = useProjectMembers(projectId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  if (loading) return <MembersSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load project members"
        message="Something went wrong while loading this project's collaborators. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view this project"
        description="You need to be signed in to manage your Forge project members."
        action={
          <LinkButton variant="secondary" to="/login">
            Sign in
          </LinkButton>
        }
      />
    );
  }

  if (!data.found || !data.project) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8" />}
        title="Project not found"
        description="The project you're looking for doesn't exist or has been removed."
        action={
          <LinkButton variant="secondary" to="/projects">
            Back to Projects
          </LinkButton>
        }
      />
    );
  }

  const project = data.project;
  const canManage = canManageMembers(data.currentUserRole);
  const now = Date.now();
  const pendingInviteCount = data.invitations.filter(
    (i) => !i.acceptedAt && !i.revokedAt && (!i.expiresAt || Date.parse(i.expiresAt) >= now),
  ).length;

  const handleInvite = async (email: string, role: MemberRole) => {
    const res = await createProjectInvitation(project.id, { email, role });
    if (res.ok) await refresh();
    return res;
  };

  const handleRevoke = async (id: string) => {
    const res = await revokeProjectInvitation(id);
    if (res.ok) await refresh();
    return res;
  };

  const handleRoleChange = async (memberId: string, role: MemberRole) => {
    const res = await updateProjectMemberRole(project.id, memberId, role);
    if (res.ok) await refresh();
    return res;
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoveBusy(true);
    const res = await removeProjectMember(project.id, removeTarget.id);
    setRemoveBusy(false);
    setRemoveTarget(null);
    if (res.ok) await refresh();
  };

  return (
    <>
      <ProjectSectionHeader
        eyebrow="Collaboration"
        title="Members"
        description="Manage who can access and work on this Forge project."
        projectId={project.id}
        projectName={project.name}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              loading={refreshing}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            {canManage && (
              <Button size="sm" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setInviteOpen(true)}>
                Invite member
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5">
        <MembersOverview
          memberCount={data.members.length}
          pendingInviteCount={pendingInviteCount}
          currentUserRole={data.currentUserRole}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <ProjectMembersList
            members={data.members}
            canManage={canManage}
            onRoleChange={handleRoleChange}
            onRemoveRequest={setRemoveTarget}
          />

          <PendingInvitesSection invitations={data.invitations} canManage={canManage} onRevoke={handleRevoke} />

          <MembersActivity events={data.events} />
        </div>

        <div className="space-y-5">
          <RolesExplanation />
          <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
            <p className="text-[11px] text-forge-text-muted leading-relaxed">
              Membership changes are enforced server-side. Only the owner and admins can invite collaborators, change
              roles or remove access. Email addresses are shown only to other project members.
            </p>
          </div>
        </div>
      </div>

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={handleInvite} />

      <ConfirmationModal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void handleRemove()}
        title="Remove member?"
        message={
          removeTarget
            ? `${removeTarget.displayName || removeTarget.email || 'This member'} (${removeTarget.email || 'no email'}) will lose access to this project. This does not delete their Forge account.`
            : ''
        }
        confirmLabel="Remove access"
        variant="danger"
        loading={removeBusy}
      />
    </>
  );
}