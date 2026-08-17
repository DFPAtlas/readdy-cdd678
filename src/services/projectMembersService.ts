import { getSupabaseClient } from '@/services/supabaseClient';
import {
  MEMBER_ROLES,
  MEMBER_ROLE_LABELS,
  MEMBER_ROLE_DESCRIPTIONS,
  normalizeEmail,
  sha256Hex,
  can,
  type MemberRole,
} from '@/pages/projects/sandbox/sandboxCollaboration';

export { MEMBER_ROLES, MEMBER_ROLE_LABELS, MEMBER_ROLE_DESCRIPTIONS };
export type { MemberRole };

// ------------------------------------------------------------
// Project collaboration data model (project_members +
// project_invitations + collaboration_events). Roles, labels and
// descriptions are shared with the Sandbox collaboration layer so
// the permission model has a single source of truth.
// ------------------------------------------------------------

export const MEMBER_EVENT_TYPES = [
  'member_invited',
  'member_joined',
  'member_removed',
  'role_changed',
];

export interface ProjectMember {
  id: string;
  userId: string;
  role: MemberRole;
  status: string;
  joinedAt: string | null;
  createdAt: string;
  displayName: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  isCurrentUser: boolean;
}

export interface ProjectInvitation {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface MembershipEvent {
  id: string;
  eventType: string;
  createdAt: string;
  actorName: string;
}

export interface ProjectMembersData {
  authenticated: boolean;
  found: boolean;
  project: { id: string; name: string; slug: string } | null;
  currentUserId: string | null;
  currentUserRole: MemberRole | null;
  members: ProjectMember[];
  invitations: ProjectInvitation[];
  events: MembershipEvent[];
}

export function createEmptyMembersData(): ProjectMembersData {
  return {
    authenticated: false,
    found: false,
    project: null,
    currentUserId: null,
    currentUserRole: null,
    members: [],
    invitations: [],
    events: [],
  };
}

export function canManageMembers(role: MemberRole | null): boolean {
  return can(role, 'manage_members');
}

function mapMember(row: Record<string, unknown>, currentUserId: string): ProjectMember {
  const profile = (row.profiles ?? {}) as Record<string, unknown>;
  const userId = String(row.user_id);
  return {
    id: String(row.id),
    userId,
    role: (String(row.role) as MemberRole) || 'reviewer',
    status: String(row.status),
    joinedAt: row.joined_at ? String(row.joined_at) : null,
    createdAt: String(row.created_at),
    displayName: profile.display_name ? String(profile.display_name) : '',
    email: profile.email ? String(profile.email) : '',
    initials: profile.initials ? String(profile.initials) : '',
    avatarUrl: profile.avatar_url ? String(profile.avatar_url) : null,
    isCurrentUser: userId === currentUserId,
  };
}

function mapInvitation(row: Record<string, unknown>): ProjectInvitation {
  return {
    id: String(row.id),
    email: String(row.email_normalized),
    role: (String(row.role) as MemberRole) || 'reviewer',
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    createdAt: String(row.created_at),
  };
}

async function enrichEvents(rows: Record<string, unknown>[]): Promise<MembershipEvent[]> {
  const events = rows.map((row) => ({
    id: String(row.id),
    eventType: String(row.event_type),
    createdAt: String(row.created_at),
    actorId: row.actor_id ? String(row.actor_id) : null,
  }));

  const actorIds = [...new Set(events.map((e) => e.actorId).filter((x): x is string => Boolean(x)))];
  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', actorIds);
      if (!error && data) {
        for (const p of data as Record<string, unknown>[]) {
          const name = p.display_name || p.email;
          if (name) nameById.set(String(p.id), String(name));
        }
      }
    }
  }

  return events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    createdAt: e.createdAt,
    actorName: e.actorId ? (nameById.get(e.actorId) ?? 'Member') : 'System',
  }));
}

export async function fetchProjectMembers(projectId: string): Promise<ProjectMembersData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyMembersData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyMembersData();
  const currentUserId = authData.user.id;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) {
    return { ...createEmptyMembersData(), authenticated: true, found: false, currentUserId };
  }

  const [membersRes, invitesRes, eventsRes] = await Promise.all([
    supabase
      .from('project_members')
      .select('*, profiles:user_id (display_name, email, initials, avatar_url)')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    supabase
      .from('project_invitations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('collaboration_events')
      .select('*')
      .eq('project_id', projectId)
      .in('event_type', MEMBER_EVENT_TYPES)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (membersRes.error) throw membersRes.error;
  if (invitesRes.error) throw invitesRes.error;

  const members = ((membersRes.data ?? []) as Record<string, unknown>[]).map((row) =>
    mapMember(row, currentUserId),
  );
  const invitations = ((invitesRes.data ?? []) as Record<string, unknown>[]).map(mapInvitation);
  const events = await enrichEvents((eventsRes.data ?? []) as Record<string, unknown>[]);

  const currentUserRole = members.find((m) => m.userId === currentUserId)?.role ?? null;

  return {
    authenticated: true,
    found: true,
    project: { id: project.id, name: project.name, slug: project.slug },
    currentUserId,
    currentUserRole,
    members,
    invitations,
    events,
  };
}

// ------------------------------------------------------------
// Mutations (mirror the Sandbox collaboration layer, scoped to an
// explicit project id). RLS remains the authoritative gate.
// ------------------------------------------------------------

async function logMembershipEvent(
  projectId: string,
  eventType: string,
  safeMetadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { data } = await supabase.auth.getUser().catch(() => ({ data: null }));
  const actorId = data?.user?.id ?? null;
  const safe = safeMetadata
    ? Object.fromEntries(
        Object.entries(safeMetadata).filter(([key]) => !/token|secret|key|password/i.test(key)),
      )
    : null;
  await supabase
    .from('collaboration_events')
    .insert({
      project_id: projectId,
      actor_id: actorId,
      event_type: eventType,
      entity_type: 'member',
      entity_id: null,
      safe_metadata: safe,
    })
    .then(() => undefined)
    .catch(() => undefined);
}

export async function createProjectInvitation(
  projectId: string,
  input: { email: string; role: MemberRole },
): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Sign in to invite members.' };
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: 'Sign in to invite members.' };

  const email = normalizeEmail(input.email);
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('project_invitations').insert({
    project_id: projectId,
    email_normalized: email,
    role: input.role,
    token_hash: tokenHash,
    expires_at: expiresAt,
    invited_by: authData.user.id,
  });
  if (error) return { ok: false, message: error.message };

  await logMembershipEvent(projectId, 'member_invited', { email, role: input.role });
  return { ok: true, message: `Invitation created for ${email}` };
}

export async function revokeProjectInvitation(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Sign in to revoke invitations.' };
  const { error } = await supabase
    .from('project_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Invitation revoked' };
}

export async function updateProjectMemberRole(
  projectId: string,
  memberId: string,
  role: MemberRole,
): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Sign in to manage members.' };
  const { error } = await supabase
    .from('project_members')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', memberId);
  if (error) return { ok: false, message: error.message };
  await logMembershipEvent(projectId, 'role_changed', { role });
  return { ok: true, message: `Role updated to ${MEMBER_ROLE_LABELS[role]}` };
}

export async function removeProjectMember(
  projectId: string,
  memberId: string,
): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Sign in to manage members.' };
  // Soft-remove: flip status so RLS immediately blocks access while
  // preserving the audit trail.
  const { error } = await supabase
    .from('project_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', memberId);
  if (error) return { ok: false, message: error.message };
  await logMembershipEvent(projectId, 'member_removed', {});
  return { ok: true, message: 'Member removed' };
}