import { getSandboxClient } from '@/pages/projects/sandbox/sandboxPersistence';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SiteMember, SiteMemberStatus, SiteRole, SiteProfileField, SiteAuthEvent,
  SiteAuthConfig, ProfileFieldType, ProfileFieldVisibility, ProfileFieldConfiguration,
} from './membersTypes';
import { siteAuthConfigFromSettings } from './membersTypes';

/* ──────────────────────────────────────────────────────────────
   Forge Members data layer.

   All reads/writes go through the tenant-isolated site_* tables,
   protected by RLS. This module uses the parameterised Supabase
   client only and never constructs raw SQL.
   ────────────────────────────────────────────────────────────── */

function client(): SupabaseClient | null {
  return getSandboxClient();
}

type Row = Record<string, unknown>;

function mapRole(row: Row): SiteRole {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    roleKey: String(row.role_key),
    name: String(row.name),
    description: row.description ? String(row.description) : '',
    createdAt: String(row.created_at),
  };
}

function mapProfileField(row: Row): SiteProfileField {
  const config = (row.configuration && typeof row.configuration === 'object' ? row.configuration : {}) as ProfileFieldConfiguration;
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    fieldKey: String(row.field_key),
    fieldType: String(row.field_type) as ProfileFieldType,
    label: String(row.label),
    required: Boolean(row.required),
    memberEditable: Boolean(row.member_editable),
    visibility: String(row.visibility) as ProfileFieldVisibility,
    configuration: config,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapMember(row: Row): SiteMember {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    emailNormalized: row.email_normalized ? String(row.email_normalized) : null,
    displayName: row.display_name ? String(row.display_name) : '',
    status: String(row.status) as SiteMemberStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
    roles: [],
    profileValues: {},
  };
}

function mapEvent(row: Row): SiteAuthEvent {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    siteMemberId: row.site_member_id ? String(row.site_member_id) : null,
    eventType: String(row.event_type),
    safeMetadata: (row.safe_metadata && typeof row.safe_metadata === 'object' ? row.safe_metadata : {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
  };
}

/* ── Roles ── */

export async function listRoles(projectId: string): Promise<SiteRole[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('site_roles')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(mapRole);
}

export async function createRole(projectId: string, input: { roleKey: string; name: string; description: string }): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to create roles.' };
  const { error } = await supabase.from('site_roles').insert({
    project_id: projectId,
    role_key: input.roleKey,
    name: input.name,
    description: input.description,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Role "${input.name}" created` };
}

export async function updateRole(roleId: string, patch: { name?: string; description?: string }): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to edit roles.' };
  const { error } = await supabase.from('site_roles').update(patch).eq('id', roleId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Role updated' };
}

export async function deleteRole(roleId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to delete roles.' };
  const { error } = await supabase.from('site_roles').delete().eq('id', roleId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Role deleted' };
}

/* ── Members ── */

export async function listMembers(projectId: string): Promise<SiteMember[]> {
  const supabase = client();
  if (!supabase) return [];

  const [membersRes, rolesRes, memberRolesRes, fieldsRes, valuesRes] = await Promise.all([
    supabase.from('site_members').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('site_roles').select('*').eq('project_id', projectId),
    supabase.from('site_member_roles').select('*').eq('project_id', projectId),
    supabase.from('site_profile_fields').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
    supabase.from('site_profile_values').select('*').eq('project_id', projectId),
  ]);

  if (membersRes.error || !membersRes.data) return [];

  const members = (membersRes.data as Row[]).map(mapMember);
  const roles = ((rolesRes.data ?? []) as Row[]).map(mapRole);
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const memberRoles = (memberRolesRes.data ?? []) as Row[];
  const roleIdsByMember = new Map<string, Set<string>>();
  memberRoles.forEach((mr) => {
    const mid = String(mr.site_member_id);
    const rid = String(mr.site_role_id);
    if (!roleIdsByMember.has(mid)) roleIdsByMember.set(mid, new Set());
    roleIdsByMember.get(mid)!.add(rid);
  });

  const values = (valuesRes.data ?? []) as Row[];
  const valuesByMember = new Map<string, Record<string, unknown>>();
  values.forEach((v) => {
    const mid = String(v.site_member_id);
    const fid = String(v.field_id);
    if (!valuesByMember.has(mid)) valuesByMember.set(mid, {});
    valuesByMember.get(mid)![fid] = v.value;
  });

  members.forEach((m) => {
    m.roles = Array.from(roleIdsByMember.get(m.id) ?? [])
      .map((rid) => roleById.get(rid))
      .filter((r): r is SiteRole => Boolean(r));
    m.profileValues = valuesByMember.get(m.id) ?? {};
  });

  return members;
}

export async function createMember(projectId: string, input: { email: string; displayName: string }): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to invite members.' };
  const { error } = await supabase.from('site_members').insert({
    project_id: projectId,
    email_normalized: input.email.trim().toLowerCase(),
    display_name: input.displayName.trim(),
    status: 'invited',
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Invitation sent to ${input.email}` };
}

export async function setMemberStatus(memberId: string, status: SiteMemberStatus): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to manage members.' };
  const { error } = await supabase.from('site_members').update({ status }).eq('id', memberId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Member ${status}` };
}

export async function deleteMember(memberId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to delete members.' };
  const { error } = await supabase.from('site_members').delete().eq('id', memberId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Member deleted' };
}

export async function assignRole(memberId: string, roleId: string, projectId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to assign roles.' };
  const { error } = await supabase.from('site_member_roles').insert({
    project_id: projectId,
    site_member_id: memberId,
    site_role_id: roleId,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Role assigned' };
}

export async function removeRole(memberId: string, roleId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to remove roles.' };
  const { error } = await supabase
    .from('site_member_roles')
    .delete()
    .eq('site_member_id', memberId)
    .eq('site_role_id', roleId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Role removed' };
}

/* ── Profile fields ── */

export async function listProfileFields(projectId: string): Promise<SiteProfileField[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('site_profile_fields')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(mapProfileField);
}

export async function createProfileField(projectId: string, input: {
  fieldKey: string; fieldType: ProfileFieldType; label: string; required: boolean;
  memberEditable: boolean; visibility: ProfileFieldVisibility; configuration: ProfileFieldConfiguration;
}): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to add profile fields.' };
  const { error } = await supabase.from('site_profile_fields').insert({
    project_id: projectId,
    field_key: input.fieldKey,
    field_type: input.fieldType,
    label: input.label,
    required: input.required,
    member_editable: input.memberEditable,
    visibility: input.visibility,
    configuration: input.configuration,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Field "${input.label}" added` };
}

export async function updateProfileField(fieldId: string, patch: {
  label?: string; required?: boolean; memberEditable?: boolean;
  visibility?: ProfileFieldVisibility; configuration?: ProfileFieldConfiguration;
}): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to edit profile fields.' };
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString(), ...patch };
  const { error } = await supabase.from('site_profile_fields').update(payload).eq('id', fieldId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Field updated' };
}

export async function deleteProfileField(fieldId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to delete profile fields.' };
  const { error } = await supabase.from('site_profile_fields').delete().eq('id', fieldId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Field deleted' };
}

/* ── Auth events (activity log) ── */

export async function listAuthEvents(projectId: string): Promise<SiteAuthEvent[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('site_auth_events')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return (data as Row[]).map(mapEvent);
}

/* ── Auth configuration (projects.settings.siteAuth) ── */

export async function getAuthConfig(projectId: string): Promise<SiteAuthConfig | null> {
  const supabase = client();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .maybeSingle();
  if (error || !data) return null;
  return siteAuthConfigFromSettings((data as Row).settings);
}

export async function saveAuthConfig(projectId: string, config: SiteAuthConfig): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to update authentication.' };
  const { data, error } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  const current = (data?.settings && typeof data.settings === 'object' ? data.settings : {}) as Record<string, unknown>;
  const next = { ...current, siteAuth: config };
  const { error: updateError } = await supabase.from('projects').update({ settings: next }).eq('id', projectId);
  if (updateError) return { ok: false, message: updateError.message };
  return { ok: true, message: 'Authentication settings saved' };
}

/* ── Current user role (UI gating only; server RLS is authoritative) ── */

export async function currentProjectRole(projectId: string): Promise<string | null> {
  const supabase = client();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from('project_members')
    .select('role, status')
    .eq('project_id', projectId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!data) return null;
  const row = data as Row;
  if (String(row.status) !== 'active') return null;
  return row.role ? String(row.role) : null;
}