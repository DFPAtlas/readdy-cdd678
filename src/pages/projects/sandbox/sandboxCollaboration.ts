import { getSandboxClient, resolveSandboxProject, type SandboxDocument } from './sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   Team collaboration — roles, permissions, members, invitations,
   comments, approvals, activity feed and realtime presence.

   All reads/writes respect tenant-isolated RLS. Permissions are
   enforced server-side by policies; this module mirrors the matrix
   for UI gating (hiding a button is never authorisation).
   ────────────────────────────────────────────────────────────── */

export type MemberRole =
  | 'owner' | 'admin' | 'designer' | 'developer' | 'copywriter' | 'client' | 'reviewer';

export const MEMBER_ROLES: MemberRole[] = [
  'owner', 'admin', 'designer', 'developer', 'copywriter', 'client', 'reviewer',
];

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  designer: 'Designer',
  developer: 'Developer',
  copywriter: 'Copywriter',
  client: 'Client',
  reviewer: 'Reviewer',
};

export const MEMBER_ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: 'Full project and billing control, invite members, transfer ownership, publish production.',
  admin: 'Manage members except owner, edit, build and publish, manage integrations.',
  designer: 'Edit canvas, assets and the design system. Cannot manage billing or production domains.',
  developer: 'Edit code, integrations and technical settings. Can deploy preview and staging.',
  copywriter: 'Edit text and SEO content. Cannot change layout, code or publishing settings.',
  client: 'Preview, comment and approve. Cannot edit unless separately enabled.',
  reviewer: 'View and comment only.',
};

export type Permission =
  | 'view' | 'comment' | 'approve'
  | 'edit_canvas' | 'edit_design' | 'edit_code' | 'edit_copy'
  | 'manage_members' | 'manage_integrations' | 'manage_billing'
  | 'publish_preview' | 'publish_staging' | 'publish_production' | 'manage_domains';

const PERMISSIONS_BY_ROLE: Record<MemberRole, Permission[]> = {
  owner: ['view', 'comment', 'approve', 'edit_canvas', 'edit_design', 'edit_code', 'edit_copy', 'manage_members', 'manage_integrations', 'manage_billing', 'publish_preview', 'publish_staging', 'publish_production', 'manage_domains'],
  admin: ['view', 'comment', 'approve', 'edit_canvas', 'edit_design', 'edit_code', 'edit_copy', 'manage_members', 'manage_integrations', 'publish_preview', 'publish_staging', 'publish_production'],
  designer: ['view', 'comment', 'edit_canvas', 'edit_design', 'publish_preview'],
  developer: ['view', 'comment', 'edit_code', 'manage_integrations', 'publish_preview', 'publish_staging'],
  copywriter: ['view', 'comment', 'edit_copy'],
  client: ['view', 'comment', 'approve'],
  reviewer: ['view', 'comment'],
};

export function permissionsForRole(role: MemberRole): Set<Permission> {
  return new Set(PERMISSIONS_BY_ROLE[role] ?? []);
}

export function can(role: MemberRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return permissionsForRole(role).has(permission);
}

/* ── Record types ── */

export type MemberRecord = {
  id: string;
  projectId: string;
  userId: string;
  role: MemberRole;
  status: string;
  invitedBy: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined from profiles:
  displayName?: string;
  email?: string;
  initials?: string;
  avatarUrl?: string;
};

export type InvitationRecord = {
  id: string;
  projectId: string;
  email: string;
  role: MemberRole;
  expiresAt: string | null;
  invitedBy: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  token?: string; // only present for freshly-created invitations (single-use display)
};

export type CommentStatus = 'open' | 'resolved';

export type CommentRecord = {
  id: string;
  projectId: string;
  pageId: string | null;
  elementId: string | null;
  parentCommentId: string | null;
  authorId: string;
  body: string;
  positionData: { x: number; y: number } | null;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  authorName?: string;
  authorInitials?: string;
  replies?: CommentRecord[];
};

export type ApprovalStatus =
  | 'draft' | 'awaiting_review' | 'changes_requested' | 'approved' | 'superseded' | 'cancelled';

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  draft: 'Draft',
  awaiting_review: 'Awaiting review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  superseded: 'Superseded',
  cancelled: 'Cancelled',
};

export type ApprovalRecord = {
  id: string;
  projectId: string;
  versionId: string;
  versionNumber?: number;
  environment: string;
  requestedBy: string | null;
  requestedFrom: string | null;
  status: ApprovalStatus;
  decisionNote: string | null;
  requestedAt: string;
  decidedAt: string | null;
  requesterName?: string;
  reviewerName?: string;
};

export type CollaborationEventRecord = {
  id: string;
  projectId: string;
  actorId: string | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  safeMetadata: Record<string, unknown> | null;
  createdAt: string;
  actorName?: string;
  actorInitials?: string;
};

export type PresenceState = {
  userId: string;
  name: string;
  initials: string;
  email: string;
  pageId: string | null;
  elementId: string | null;
  editing: boolean;
  lastSeen: number;
};

/* ── Hashing helpers (single-use invitation tokens) ── */

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/* ── Profile resolution helpers ── */

async function fetchProfiles(userIds: string[]): Promise<Map<string, { displayName: string; email: string; initials: string; avatarUrl: string }>> {
  const map = new Map<string, { displayName: string; email: string; initials: string; avatarUrl: string }>();
  const unique = [...new Set(userIds)].filter(Boolean);
  if (!unique.length) return map;
  const supabase = getSandboxClient();
  if (!supabase) return map;
  const { data, error } = await supabase.from('profiles').select('id, email, display_name, initials, avatar_url').in('id', unique);
  if (error || !data) return map;
  (data as Record<string, unknown>[]).forEach((row) => {
    map.set(String(row.id), {
      displayName: row.display_name ? String(row.display_name) : '',
      email: row.email ? String(row.email) : '',
      initials: row.initials ? String(row.initials) : '',
      avatarUrl: row.avatar_url ? String(row.avatar_url) : '',
    });
  });
  return map;
}

/* ── Row mappers ── */

function mapMember(row: Record<string, unknown>): MemberRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    userId: String(row.user_id),
    role: (String(row.role) as MemberRole) || 'reviewer',
    status: String(row.status),
    invitedBy: row.invited_by ? String(row.invited_by) : null,
    joinedAt: row.joined_at ? String(row.joined_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    displayName: row.profiles?.display_name ? String((row.profiles as Record<string, unknown>).display_name) : undefined,
    email: row.profiles?.email ? String((row.profiles as Record<string, unknown>).email) : undefined,
    initials: row.profiles?.initials ? String((row.profiles as Record<string, unknown>).initials) : undefined,
    avatarUrl: row.profiles?.avatar_url ? String((row.profiles as Record<string, unknown>).avatar_url) : undefined,
  };
}

function mapInvitation(row: Record<string, unknown>): InvitationRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    email: String(row.email_normalized),
    role: (String(row.role) as MemberRole) || 'reviewer',
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    invitedBy: row.invited_by ? String(row.invited_by) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    createdAt: String(row.created_at),
  };
}

function mapComment(row: Record<string, unknown>): CommentRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    pageId: row.page_id ? String(row.page_id) : null,
    elementId: row.element_id ? String(row.element_id) : null,
    parentCommentId: row.parent_comment_id ? String(row.parent_comment_id) : null,
    authorId: String(row.author_id),
    body: String(row.body),
    positionData: row.position_data && typeof row.position_data === 'object' ? (row.position_data as { x: number; y: number }) : null,
    status: (String(row.status) as CommentStatus) || 'open',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    resolvedBy: row.resolved_by ? String(row.resolved_by) : null,
  };
}

function mapApproval(row: Record<string, unknown>): ApprovalRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    versionId: String(row.version_id),
    versionNumber: row.version_number != null ? Number(row.version_number) : undefined,
    environment: String(row.environment),
    requestedBy: row.requested_by ? String(row.requested_by) : null,
    requestedFrom: row.requested_from ? String(row.requested_from) : null,
    status: (String(row.status) as ApprovalStatus) || 'awaiting_review',
    decisionNote: row.decision_note ? String(row.decision_note) : null,
    requestedAt: String(row.requested_at),
    decidedAt: row.decided_at ? String(row.decided_at) : null,
  };
}

function mapEvent(row: Record<string, unknown>): CollaborationEventRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    actorId: row.actor_id ? String(row.actor_id) : null,
    eventType: String(row.event_type),
    entityType: row.entity_type ? String(row.entity_type) : null,
    entityId: row.entity_id ? String(row.entity_id) : null,
    safeMetadata: row.safe_metadata && typeof row.safe_metadata === 'object' ? (row.safe_metadata as Record<string, unknown>) : null,
    createdAt: String(row.created_at),
  };
}

/* ── Membership bootstrap ── */

export async function ensureOwnerMembership(): Promise<MemberRole | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return null;

  const { data: existing } = await supabase
    .from('project_members')
    .select('role, status')
    .eq('project_id', resolved.projectId)
    .eq('user_id', resolved.userId)
    .maybeSingle();

  if (existing) {
    const role = (String((existing as Record<string, unknown>).role) as MemberRole) || 'owner';
    const status = String((existing as Record<string, unknown>).status);
    if (status !== 'active') return null;
    return role;
  }

  // The workspace owner bootstraps their own 'owner' membership.
  const { error } = await supabase.from('project_members').insert({
    project_id: resolved.projectId,
    user_id: resolved.userId,
    role: 'owner',
    status: 'active',
    invited_by: null,
    joined_at: new Date().toISOString(),
  });
  if (error) return null;
  return 'owner';
}

export async function currentUserRole(): Promise<MemberRole | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return null;
  const { data } = await supabase
    .from('project_members')
    .select('role, status')
    .eq('project_id', resolved.projectId)
    .eq('user_id', resolved.userId)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  if (String(row.status) !== 'active') return null;
  return (String(row.role) as MemberRole) || null;
}

/* ── Members ── */

export async function listMembers(): Promise<MemberRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('project_members')
    .select('*, profiles:user_id (display_name, email, initials, avatar_url)')
    .eq('project_id', resolved.projectId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapMember);
}

export async function updateMemberRole(memberId: string, role: MemberRole): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to manage members.' };
  const { error } = await supabase
    .from('project_members')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', memberId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Role changed to ${MEMBER_ROLE_LABELS[role]}` };
}

export async function removeMember(memberId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to manage members.' };
  // Soft-remove: flip status so RLS immediately blocks access while preserving audit history.
  const { error } = await supabase
    .from('project_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', memberId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Member removed' };
}

/* ── Invitations ── */

export async function listInvitations(): Promise<InvitationRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('project_invitations')
    .select('*')
    .eq('project_id', resolved.projectId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapInvitation);
}

export async function createInvitation(input: { email: string; role: MemberRole; message?: string; expiresInDays?: number }): Promise<{ ok: boolean; message: string; token?: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to invite members.' };
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, message: 'Sign in to invite members.' };

  const email = normalizeEmail(input.email);
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const tokenHash = await sha256Hex(token);
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('project_invitations').insert({
    project_id: resolved.projectId,
    email_normalized: email,
    role: input.role,
    token_hash: tokenHash,
    expires_at: expiresAt,
    invited_by: resolved.userId,
  });
  if (error) return { ok: false, message: error.message };

  await logEvent('member_invited', 'invitation', null, { email, role: input.role });
  return { ok: true, message: `Invitation sent to ${email}`, token };
}

export async function revokeInvitation(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to revoke invitations.' };
  const { error } = await supabase
    .from('project_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Invitation revoked' };
}

export async function acceptInvitation(token: string): Promise<{ ok: boolean; message: string; role?: MemberRole }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to accept the invitation.' };
  const auth = await supabase.auth.getUser();
  if (!auth.data.user) return { ok: false, message: 'Sign in to accept the invitation.' };

  const tokenHash = await sha256Hex(token);
  const { data, error } = await supabase
    .from('project_invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (error) return { ok: false, message: 'Invitation not found.' };

  const row = data as Record<string, unknown> | null;
  if (!row) return { ok: false, message: 'Invitation not found.' };
  if (row.revoked_at) return { ok: false, message: 'This invitation has been revoked.' };
  if (row.accepted_at) return { ok: false, message: 'This invitation has already been used.' };
  if (row.expires_at && Date.parse(String(row.expires_at)) < Date.now()) {
    return { ok: false, message: 'This invitation has expired.' };
  }
  // Require the invited email to match the signed-in user.
  if (normalizeEmail(String(auth.data.user.email ?? '')) !== String(row.email_normalized)) {
    return { ok: false, message: 'This invitation is for a different email address.' };
  }

  const { error: acceptError } = await supabase
    .from('project_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', row.id);
  if (acceptError) return { ok: false, message: acceptError.message };

  const { error: memberError } = await supabase.from('project_members').upsert(
    {
      project_id: String(row.project_id),
      user_id: auth.data.user.id,
      role: String(row.role),
      status: 'active',
      invited_by: row.invited_by ? String(row.invited_by) : null,
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'project_id,user_id' },
  );
  if (memberError) return { ok: false, message: memberError.message };

  await logEvent('member_joined', 'member', null, { role: String(row.role) });
  return { ok: true, message: 'Invitation accepted — you are now a member.', role: String(row.role) as MemberRole };
}

/* ── Comments ── */

export async function listComments(): Promise<CommentRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('project_comments')
    .select('*')
    .eq('project_id', resolved.projectId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  const rows = (data as Record<string, unknown>[]).map(mapComment);
  const authorIds = rows.map((c) => c.authorId);
  const profiles = await fetchProfiles(authorIds);
  const enriched = rows.map((c) => {
    const p = profiles.get(c.authorId);
    return { ...c, authorName: p?.displayName || p?.email || 'Member', authorInitials: p?.initials || 'U' };
  });
  // Build threads: top-level + nested replies.
  const topLevel = enriched.filter((c) => !c.parentCommentId);
  const children = enriched.filter((c) => c.parentCommentId);
  return topLevel.map((c) => ({ ...c, replies: children.filter((r) => r.parentCommentId === c.id) }));
}

export async function addComment(input: { body: string; pageId?: string | null; elementId?: string | null; parentCommentId?: string | null; positionData?: { x: number; y: number } | null }): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to comment.' };
  const auth = await supabase.auth.getUser();
  if (!auth.data.user) return { ok: false, message: 'Sign in to comment.' };
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, message: 'Sign in to comment.' };

  const { error } = await supabase.from('project_comments').insert({
    project_id: resolved.projectId,
    page_id: input.pageId ?? null,
    element_id: input.elementId ?? null,
    parent_comment_id: input.parentCommentId ?? null,
    author_id: auth.data.user.id,
    body: input.body,
    position_data: input.positionData ?? null,
    status: 'open',
  });
  if (error) return { ok: false, message: error.message };

  await logEvent('comment_added', 'comment', input.elementId, { pageId: input.pageId ?? null });
  return { ok: true, message: 'Comment added' };
}

export async function setCommentStatus(id: string, status: CommentStatus): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to resolve comments.' };
  const patch = status === 'resolved'
    ? { status, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    : { status, resolved_at: null, resolved_by: null, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('project_comments').update(patch).eq('id', id);
  if (error) return { ok: false, message: error.message };
  await logEvent(status === 'resolved' ? 'comment_resolved' : 'comment_reopened', 'comment', null, {});
  return { ok: true, message: status === 'resolved' ? 'Thread resolved' : 'Thread reopened' };
}

/* ── Approvals ── */

export async function listApprovals(): Promise<ApprovalRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('project_approvals')
    .select('*, project_versions:version_id (version_number)')
    .eq('project_id', resolved.projectId)
    .order('requested_at', { ascending: false });
  if (error || !data) return [];
  const rows = (data as Record<string, unknown>[]).map((row) => {
    const mapped = mapApproval(row);
    const pv = row.project_versions as Record<string, unknown> | Record<string, unknown>[] | undefined;
    if (pv && !Array.isArray(pv) && pv.version_number != null) mapped.versionNumber = Number(pv.version_number);
    return mapped;
  });
  const userIds = rows.flatMap((a) => [a.requestedBy, a.requestedFrom]).filter((x): x is string => Boolean(x));
  const profiles = await fetchProfiles(userIds);
  return rows.map((a) => ({
    ...a,
    requesterName: a.requestedBy ? (profiles.get(a.requestedBy)?.displayName || profiles.get(a.requestedBy)?.email || 'Member') : undefined,
    reviewerName: a.requestedFrom ? (profiles.get(a.requestedFrom)?.displayName || profiles.get(a.requestedFrom)?.email || 'Member') : undefined,
  }));
}

export async function requestApproval(input: { versionId: string; requestedFrom: string | null; environment?: string }): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to request approval.' };
  const auth = await supabase.auth.getUser();
  if (!auth.data.user) return { ok: false, message: 'Sign in to request approval.' };
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, message: 'Sign in to request approval.' };

  const { error } = await supabase.from('project_approvals').insert({
    project_id: resolved.projectId,
    version_id: input.versionId,
    environment: input.environment ?? 'production',
    requested_by: auth.data.user.id,
    requested_from: input.requestedFrom,
    status: 'awaiting_review',
    requested_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: error.message };

  await logEvent('approval_requested', 'approval', null, { environment: input.environment ?? 'production' });
  return { ok: true, message: 'Approval requested' };
}

export async function decideApproval(id: string, decision: 'approved' | 'changes_requested', note?: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to review approvals.' };
  const status: ApprovalStatus = decision;
  const { error } = await supabase.from('project_approvals').update({
    status,
    decision_note: note ?? null,
    decided_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  await logEvent(decision === 'approved' ? 'approval_granted' : 'approval_changes_requested', 'approval', null, {});
  return { ok: true, message: decision === 'approved' ? 'Approved' : 'Changes requested' };
}

export async function cancelApproval(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to cancel approvals.' };
  const { error } = await supabase.from('project_approvals').update({ status: 'cancelled', decided_at: new Date().toISOString() }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Approval request cancelled' };
}

/* ── Activity feed (append-only audit) ── */

export async function listEvents(limit = 50): Promise<CollaborationEventRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('collaboration_events')
    .select('*')
    .eq('project_id', resolved.projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  const rows = (data as Record<string, unknown>[]).map(mapEvent);
  const profiles = await fetchProfiles(rows.map((e) => e.actorId).filter((x): x is string => Boolean(x)));
  return rows.map((e) => ({
    ...e,
    actorName: e.actorId ? (profiles.get(e.actorId)?.displayName || profiles.get(e.actorId)?.email || 'Member') : 'System',
    actorInitials: e.actorId ? (profiles.get(e.actorId)?.initials || 'U') : 'S',
  }));
}

export async function logEvent(eventType: string, entityType?: string, entityId?: string, safeMetadata?: Record<string, unknown>): Promise<void> {
  const supabase = getSandboxClient();
  if (!supabase) return;
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return;
  const auth = await supabase.auth.getUser();
  // Only log non-sensitive metadata. Never tokens, submissions, or raw asset URLs.
  const safe = safeMetadata
    ? Object.fromEntries(Object.entries(safeMetadata).filter(([key]) => !/token|secret|key|password|submission|url/i.test(key)))
    : null;
  await supabase.from('collaboration_events').insert({
    project_id: resolved.projectId,
    actor_id: auth.data.user?.id ?? null,
    event_type: eventType,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    safe_metadata: safe,
  }).then(() => undefined).catch(() => undefined);
}

/* ── Realtime presence ── */

export type PresenceSubscription = { unsubscribe: () => void };

export function subscribePresence(
  projectId: string,
  self: { userId: string; name: string; initials: string; email: string },
  onPresence: (presences: PresenceState[]) => void,
): PresenceSubscription | null {
  const supabase = getSandboxClient();
  if (!supabase || !projectId) return null;

  const channel = supabase.channel(`forge-presence:${projectId}`, {
    config: { presence: { key: self.userId } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceState>();
      const now = Date.now();
      const list: PresenceState[] = [];
      Object.values(state).forEach((entries) => {
        entries.forEach((entry) => {
          list.push({ ...entry, lastSeen: now });
        });
      });
      onPresence(list);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: self.userId,
          name: self.name,
          initials: self.initials,
          email: self.email,
          pageId: null,
          elementId: null,
          editing: false,
        });
      }
    });

  return {
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}

/* ── Conflict detection ── */

export type ConflictInfo = {
  baseUpdatedAt: string;
  remoteUpdatedAt: string;
  hasConflict: boolean;
};

export function detectSaveConflict(baseUpdatedAt: string | null, remoteUpdatedAt: string | null): ConflictInfo {
  if (!baseUpdatedAt || !remoteUpdatedAt) return { baseUpdatedAt: baseUpdatedAt ?? '', remoteUpdatedAt: remoteUpdatedAt ?? '', hasConflict: false };
  const hasConflict = Date.parse(remoteUpdatedAt) > Date.parse(baseUpdatedAt) + 1000;
  return { baseUpdatedAt, remoteUpdatedAt, hasConflict };
}

/* ── Shared helper: resolve the current project + document baseline ── */

export async function fetchRemoteBlueprintUpdatedAt(): Promise<string | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return null;
  const { data } = await supabase
    .from('projects')
    .select('updated_at')
    .eq('id', resolved.projectId)
    .maybeSingle();
  return data?.updated_at ? String((data as Record<string, unknown>).updated_at) : null;
}

export type ApprovalRequirement = 'none' | 'owner' | 'client' | 'both';

export type ProjectAccessSettings = {
  approvalRequirement: ApprovalRequirement;
  clientCanEdit: boolean;
  notifyOnPublish: boolean;
  notifyOnComments: boolean;
};

export const DEFAULT_ACCESS_SETTINGS: ProjectAccessSettings = {
  approvalRequirement: 'none',
  clientCanEdit: false,
  notifyOnPublish: true,
  notifyOnComments: true,
};

export async function getAccessSettings(): Promise<ProjectAccessSettings> {
  const supabase = getSandboxClient();
  if (!supabase) return { ...DEFAULT_ACCESS_SETTINGS };
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ...DEFAULT_ACCESS_SETTINGS };
  const { data } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', resolved.projectId)
    .maybeSingle();
  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  const collab = (settings.collaboration ?? {}) as Partial<ProjectAccessSettings>;
  return { ...DEFAULT_ACCESS_SETTINGS, ...collab };
}

export async function setAccessSettings(next: ProjectAccessSettings): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to change access settings.' };
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, message: 'Sign in to change access settings.' };
  const { data } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', resolved.projectId)
    .maybeSingle();
  const existing = (data?.settings ?? {}) as Record<string, unknown>;
  const { error } = await supabase
    .from('projects')
    .update({ settings: { ...existing, collaboration: next }, updated_at: new Date().toISOString() })
    .eq('id', resolved.projectId);
  if (error) return { ok: false, message: error.message };
  await logEvent('access_settings_changed', 'project', null, { approvalRequirement: next.approvalRequirement });
  return { ok: true, message: 'Access settings saved' };
}

/* ── Editing locks (element-level, abandoned locks expire via presence heartbeat) ── */

export type ElementLock = {
  elementId: string;
  userId: string;
  name: string;
  initials: string;
  acquiredAt: number;
};

export function isLockActive(lock: ElementLock | null, now = Date.now()): boolean {
  if (!lock) return false;
  return now - lock.acquiredAt < 60_000; // 60s soft expiry for abandoned locks
}

export function roleLabelForDocument(_doc: SandboxDocument): string {
  return 'collaborator';
}