import { useCallback, useEffect, useState } from 'react';
import {
  Users, MailPlus, ShieldCheck, Activity, Settings2, RefreshCw, Trash2,
  ChevronDown, Clock, UserPlus, CheckCircle2, XCircle, X, Copy, Send,
} from 'lucide-react';
import type { VersionEntry } from './sandboxVersions';
import {
  listMembers, listInvitations, createInvitation, revokeInvitation,
  updateMemberRole, removeMember, listEvents, listApprovals, requestApproval,
  decideApproval, cancelApproval, getAccessSettings, setAccessSettings,
  ensureOwnerMembership, can,
  MEMBER_ROLES, MEMBER_ROLE_LABELS, MEMBER_ROLE_DESCRIPTIONS,
  APPROVAL_STATUS_LABELS,
  DEFAULT_ACCESS_SETTINGS,
  type MemberRecord, type InvitationRecord, type ApprovalRecord,
  type CollaborationEventRecord, type MemberRole, type ProjectAccessSettings,
  type ApprovalStatus,
} from './sandboxCollaboration';

type TeamPanelProps = {
  role: MemberRole | null;
  versions: VersionEntry[];
  onNotify: (message: string) => void;
  onOpenReview?: (versionNumber: number) => void;
};

type Tab = 'members' | 'invites' | 'approvals' | 'activity' | 'access';

const EVENT_LABELS: Record<string, string> = {
  member_invited: 'invited a member',
  member_joined: 'joined the project',
  member_removed: 'removed a member',
  role_changed: 'changed a role',
  comment_added: 'added a comment',
  comment_resolved: 'resolved a comment',
  comment_reopened: 'reopened a comment',
  approval_requested: 'requested approval',
  approval_granted: 'approved a version',
  approval_changes_requested: 'requested changes',
  version_restored: 'restored a version',
  theme_changed: 'updated the theme',
  ai_applied: 'applied AI changes',
  preview_deployed: 'deployed a preview',
  production_deployed: 'deployed to production',
  domain_changed: 'changed the domain',
  access_settings_changed: 'updated access settings',
};

export default function TeamPanel({ role, versions, onNotify, onOpenReview }: TeamPanelProps) {
  const [tab, setTab] = useState<Tab>('members');
  const [loading, setLoading] = useState(false);

  const canManageMembers = can(role, 'manage_members');
  const canApprove = can(role, 'approve') || can(role, 'manage_members');

  return (
    <div className="team-panel">
      {role && (
        <div className="team-role-banner">
          <ShieldCheck size={13} />
          <span>Signed in as <b>{MEMBER_ROLE_LABELS[role]}</b></span>
        </div>
      )}

      <div className="forms-tabs">
        <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}><Users size={14} /> Members</button>
        <button className={tab === 'invites' ? 'active' : ''} onClick={() => setTab('invites')}><MailPlus size={14} /> Invites</button>
        <button className={tab === 'approvals' ? 'active' : ''} onClick={() => setTab('approvals')}><ShieldCheck size={14} /> Approvals</button>
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}><Activity size={14} /> Activity</button>
        <button className={tab === 'access' ? 'active' : ''} onClick={() => setTab('access')}><Settings2 size={14} /> Access</button>
      </div>

      {tab === 'members' && <MembersTab role={role} canManage={canManageMembers} onNotify={onNotify} />}
      {tab === 'invites' && <InvitesTab canManage={canManageMembers} onNotify={onNotify} />}
      {tab === 'approvals' && <ApprovalsTab role={role} versions={versions} canApprove={canApprove} onNotify={onNotify} onOpenReview={onOpenReview} />}
      {tab === 'activity' && <ActivityTab />}
      {tab === 'access' && <AccessTab role={role} onNotify={onNotify} />}

      {loading && <div className="team-loading"><RefreshCw className="spin" size={16} /> Loading…</div>}
    </div>
  );
}

/* ── Members ── */

function MembersTab({ role, canManage, onNotify }: { role: MemberRole | null; canManage: boolean; onNotify: (m: string) => void }) {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await listMembers();
    setMembers(rows);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (loading) return <EmptyState icon={<RefreshCw className="spin" size={18} />} text="Loading members…" />;
  if (!members.length) return <EmptyState icon={<Users size={20} />} text="No members yet." />;

  return (
    <div className="team-list">
      {members.map((member) => (
        <div key={member.id} className="team-row">
          <span className="team-avatar">{member.initials || 'U'}</span>
          <div className="team-row-main">
            <b>{member.displayName || member.email || 'Member'}</b>
            <span>{member.email || ''}</span>
          </div>
          {canManage && member.role !== 'owner' ? (
            <select
              className="team-role-select"
              value={member.role}
              onChange={(event) => {
                void updateMemberRole(member.id, event.target.value as MemberRole).then((r) => { onNotify(r.message); void refresh(); });
              }}
            >
              {MEMBER_ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{MEMBER_ROLE_LABELS[r]}</option>)}
            </select>
          ) : (
            <span className="team-role-badge">{MEMBER_ROLE_LABELS[member.role]}</span>
          )}
          {canManage && member.role !== 'owner' && (
            <button className="team-row-action danger" title="Remove member" onClick={() => { void removeMember(member.id).then((r) => { onNotify(r.message); void refresh(); }); }}><Trash2 size={13} /></button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Invitations ── */

function InvitesTab({ canManage, onNotify }: { canManage: boolean; onNotify: (m: string) => void }) {
  const [invites, setInvites] = useState<InvitationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('reviewer');
  const [expiry, setExpiry] = useState(7);
  const [message, setMessage] = useState('');
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setInvites(await listInvitations());
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const send = async () => {
    if (!email.trim()) return onNotify('Enter an email address');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return onNotify('Enter a valid email address');
    setBusy(true);
    const result = await createInvitation({ email: email.trim(), role, message, expiresInDays: expiry });
    setBusy(false);
    onNotify(result.message);
    if (result.token) setLastToken(result.token);
    setEmail('');
    setMessage('');
    void refresh();
  };

  return (
    <div className="team-invites">
      {canManage && (
        <div className="team-invite-form">
          <label className="fb-label">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" /></label>
          <div className="fb-row">
            <label className="fb-label">Role
              <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
                {MEMBER_ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{MEMBER_ROLE_LABELS[r]}</option>)}
              </select>
            </label>
            <label className="fb-label">Expires
              <select value={expiry} onChange={(e) => setExpiry(Number(e.target.value))}>
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
              </select>
            </label>
          </div>
          <label className="fb-label">Message (optional)<textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="A short note to the invitee…" /></label>
          <p className="team-role-hint">{MEMBER_ROLE_DESCRIPTIONS[role]}</p>
          <button className="team-invite-send" onClick={() => void send()} disabled={busy}><Send size={13} /> {busy ? 'Sending…' : 'Send invitation'}</button>

          {lastToken && (
            <div className="team-invite-token">
              <span>Invitation link (single-use, share securely)</span>
              <code>{lastToken}</code>
              <button onClick={() => { void navigator.clipboard.writeText(lastToken); onNotify('Invitation link copied'); }}><Copy size={12} /> Copy</button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <EmptyState icon={<RefreshCw className="spin" size={18} />} text="Loading invitations…" />
      ) : invites.length === 0 ? (
        <EmptyState icon={<MailPlus size={20} />} text="No pending invitations." />
      ) : (
        <div className="team-list">
          {invites.map((invite) => {
            const expired = invite.expiresAt && Date.parse(invite.expiresAt) < Date.now();
            const revoked = Boolean(invite.revokedAt);
            const accepted = Boolean(invite.acceptedAt);
            return (
              <div key={invite.id} className="team-row">
                <span className="team-avatar muted"><MailPlus size={13} /></span>
                <div className="team-row-main">
                  <b>{invite.email}</b>
                  <span>{MEMBER_ROLE_LABELS[invite.role]}{accepted ? ' · accepted' : revoked ? ' · revoked' : expired ? ' · expired' : ' · pending'}</span>
                </div>
                {canManage && !accepted && !revoked && (
                  <button className="team-row-action danger" title="Revoke" onClick={() => { void revokeInvitation(invite.id).then((r) => { onNotify(r.message); void refresh(); }); }}><XCircle size={13} /></button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Approvals ── */

function ApprovalsTab({ role, versions, canApprove, onNotify, onOpenReview }: {
  role: MemberRole | null;
  versions: VersionEntry[];
  canApprove: boolean;
  onNotify: (m: string) => void;
  onOpenReview?: (versionNumber: number) => void;
}) {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [versionId, setVersionId] = useState('');
  const [reviewer, setReviewer] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setApprovals(await listApprovals());
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const request = async () => {
    if (!versionId) return onNotify('Select a version');
    setBusy(true);
    const result = await requestApproval({ versionId, requestedFrom: reviewer.trim() || null });
    setBusy(false);
    onNotify(result.message);
    setRequestOpen(false);
    setVersionId('');
    setReviewer('');
    void refresh();
  };

  return (
    <div className="team-approvals">
      {can(role, 'edit_canvas') && !requestOpen && (
        <button className="team-approval-request" onClick={() => setRequestOpen(true)}><UserPlus size={13} /> Request approval</button>
      )}

      {requestOpen && (
        <div className="team-invite-form">
          <label className="fb-label">Version
            <select value={versionId} onChange={(e) => setVersionId(e.target.value)}>
              <option value="">Choose a version…</option>
              {versions.filter((v) => !v.local).map((v) => <option key={v.id} value={v.id}>v{v.versionNumber}{v.label ? ` — ${v.label}` : ''}</option>)}
            </select>
          </label>
          <label className="fb-label">Request from (user ID or email, optional)<input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="reviewer@company.com" /></label>
          <div className="team-actions">
            <button className="team-approval-request" onClick={() => void request()} disabled={busy}>{busy ? 'Requesting…' : 'Send request'}</button>
            <button className="team-cancel" onClick={() => setRequestOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <EmptyState icon={<RefreshCw className="spin" size={18} />} text="Loading approvals…" />
      ) : approvals.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={20} />} text="No approval requests yet." />
      ) : (
        <div className="team-list">
          {approvals.map((approval) => (
            <div key={approval.id} className="team-row approval">
              <span className={`team-status-dot ${approval.status}`} />
              <div className="team-row-main">
                <b>v{approval.versionNumber ?? '—'} · {approval.environment}</b>
                <span>{approval.requesterName ? `Requested by ${approval.requesterName}` : 'Approval request'} · <em>{APPROVAL_STATUS_LABELS[approval.status]}</em></span>
                {approval.decisionNote && <span className="team-decision-note">“{approval.decisionNote}”</span>}
              </div>
              <span className="team-role-badge">{APPROVAL_STATUS_LABELS[approval.status]}</span>
              {onOpenReview && approval.versionNumber != null && (
                <button className="team-row-action" title="Review" onClick={() => onOpenReview(approval.versionNumber)}><ChevronDown size={13} /></button>
              )}
              {canApprove && approval.status === 'awaiting_review' && (
                <>
                  <button className="team-approve" onClick={() => { void decideApproval(approval.id, 'approved').then((r) => { onNotify(r.message); void refresh(); }); }}><CheckCircle2 size={13} /> Approve</button>
                  <button className="team-changes" onClick={() => { void decideApproval(approval.id, 'changes_requested').then((r) => { onNotify(r.message); void refresh(); }); }}><XCircle size={13} /> Changes</button>
                </>
              )}
              {canApprove && (approval.status === 'awaiting_review' || approval.status === 'draft') && (
                <button className="team-row-action danger" title="Cancel" onClick={() => { void cancelApproval(approval.id).then((r) => { onNotify(r.message); void refresh(); }); }}><X size={13} /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Activity ── */

function ActivityTab() {
  const [events, setEvents] = useState<CollaborationEventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listEvents().then((rows) => { setEvents(rows); setLoading(false); });
  }, []);

  if (loading) return <EmptyState icon={<RefreshCw className="spin" size={18} />} text="Loading activity…" />;
  if (!events.length) return <EmptyState icon={<Activity size={20} />} text="No activity recorded yet." />;

  return (
    <div className="team-activity">
      {events.map((event) => (
        <div key={event.id} className="team-activity-row">
          <span className="team-avatar small">{event.actorInitials || 'S'}</span>
          <div className="team-activity-main">
            <p><b>{event.actorName}</b> {EVENT_LABELS[event.eventType] || event.eventType}</p>
            <span><Clock size={10} /> {new Date(event.createdAt).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Access settings ── */

function AccessTab({ role, onNotify }: { role: MemberRole | null; onNotify: (m: string) => void }) {
  const [settings, setSettings] = useState<ProjectAccessSettings>(DEFAULT_ACCESS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const canManage = can(role, 'manage_members');

  useEffect(() => {
    void getAccessSettings().then((s) => { setSettings(s); setLoading(false); });
  }, []);

  const save = async () => {
    const result = await setAccessSettings(settings);
    onNotify(result.message);
  };

  if (loading) return <EmptyState icon={<RefreshCw className="spin" size={18} />} text="Loading settings…" />;

  return (
    <div className="team-access">
      <label className="fb-label">Production publishing requires
        <select value={settings.approvalRequirement} onChange={(e) => setSettings({ ...settings, approvalRequirement: e.target.value as ProjectAccessSettings['approvalRequirement'] })} disabled={!canManage}>
          <option value="none">No approval</option>
          <option value="owner">Owner approval</option>
          <option value="client">Client approval</option>
          <option value="both">Owner + client approval</option>
        </select>
      </label>
      <p className="team-role-hint">When approval is required, production publishing is blocked until the selected immutable version is approved.</p>

      <label className="fb-check team-check"><input type="checkbox" checked={settings.clientCanEdit} onChange={(e) => setSettings({ ...settings, clientCanEdit: e.target.checked })} disabled={!canManage} /> Allow clients to edit</label>
      <label className="fb-check team-check"><input type="checkbox" checked={settings.notifyOnPublish} onChange={(e) => setSettings({ ...settings, notifyOnPublish: e.target.checked })} disabled={!canManage} /> Notify on production publish</label>
      <label className="fb-check team-check"><input type="checkbox" checked={settings.notifyOnComments} onChange={(e) => setSettings({ ...settings, notifyOnComments: e.target.checked })} disabled={!canManage} /> Notify on new comments</label>

      {canManage && <button className="team-invite-send" onClick={() => void save()}>Save access settings</button>}
    </div>
  );
}

/* ── Shared ── */

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="team-empty">{icon}<p>{text}</p></div>;
}