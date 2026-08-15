import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/* ──────────────────────────────────────────────────────────────
   Forge Templates — server-side moderation, community catalogue
   and admin checks. Template installation writes are gated by RLS
   (destination-project edit permission) and performed by the
   editor with a recovery checkpoint. This function only handles
   actions that must be server-authorised.
   ────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const DECISION_TO_STATUS: Record<string, string> = {
  approve: 'approved',
  changes_requested: 'changes_requested',
  reject: 'rejected',
  suspend: 'suspended',
};

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  const allowed = /^https:\/\/[^/]*readdy\.ai$/.test(origin ?? '') || /^https?:\/\/localhost(:\d+)?$/.test(origin ?? '');
  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? '') : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });
}

function error(requestId: string, errorCode: string, message: string, status = 400) {
  return json({ requestId, code: 'ERROR', errorCode, message }, status);
}

async function getUser(authHeader: string | null) {
  if (!authHeader) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function isAdmin(admin: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
  return (data?.role) === 'forge_admin';
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const cors = corsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return error(requestId, 'INVALID_REQUEST', 'Method not allowed', 405);

  const userId = await getUser(req.headers.get('authorization'));
  if (!userId) return error(requestId, 'AUTH_REQUIRED', 'Authentication required', 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return error(requestId, 'INVALID_REQUEST', 'Malformed JSON', 400); }

  const action = typeof body.action === 'string' ? body.action : 'whoami';
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  /* ── Identity / admin check ── */
  if (action === 'whoami') {
    const adminFlag = await isAdmin(admin, userId);
    return json({ requestId, code: 'OK', isAdmin: adminFlag }, 200, cors);
  }

  /* ── Community catalogue (approved only, with author + real install counts) ── */
  if (action === 'catalogue') {
    const { data: templates, error: listError } = await admin
      .from('templates')
      .select('*')
      .eq('visibility', 'community')
      .eq('moderation_status', 'approved')
      .order('updated_at', { ascending: false });
    if (listError) return error(requestId, 'LIST_FAILED', 'Could not load catalogue', 500);

    const rows = (templates ?? []) as Record<string, unknown>[];
    const ids = rows.map((t) => t.id);

    const { data: installs } = ids.length
      ? await admin.from('template_installations').select('template_id').in('template_id', ids)
      : { data: [] };
    const counts = new Map<string, number>();
    ((installs ?? []) as Record<string, unknown>[]).forEach((row) => {
      const id = String(row.template_id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });

    const ownerIds = [...new Set(rows.map((t) => String(t.owner_id)))];
    const { data: profiles } = ownerIds.length
      ? await admin.from('profiles').select('id, display_name, email').in('id', ownerIds)
      : { data: [] };
    const profileMap = new Map<string, Record<string, unknown>>();
    ((profiles ?? []) as Record<string, unknown>[]).forEach((p) => profileMap.set(String(p.id), p));

    const result = rows.map((t) => {
      const owner = profileMap.get(String(t.owner_id));
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description ?? null,
        templateType: t.template_type,
        licenceKey: t.licence_key,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        installCount: counts.get(String(t.id)) ?? 0,
        authorName: owner ? String(owner.display_name ?? owner.email ?? 'Forge creator') : 'Forge creator',
      };
    });

    return json({ requestId, code: 'OK', templates: result }, 200, cors);
  }

  /* ── Moderation (admin-only, requires reason) ── */
  if (action === 'moderate') {
    const adminFlag = await isAdmin(admin, userId);
    if (!adminFlag) return error(requestId, 'FORBIDDEN', 'Moderation requires admin access', 403);

    const templateId = typeof body.templateId === 'string' ? body.templateId : '';
    const decision = typeof body.decision === 'string' ? body.decision : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : '';
    if (!templateId || !DECISION_TO_STATUS[decision]) {
      return error(requestId, 'INVALID_INPUT', 'Valid template and decision required', 400);
    }
    if ((decision === 'reject' || decision === 'suspend') && !reason) {
      return error(requestId, 'REASON_REQUIRED', 'A reason is required for rejection or suspension', 400);
    }

    const status = DECISION_TO_STATUS[decision];
    const now = new Date().toISOString();

    const { error: updateError } = await admin
      .from('templates')
      .update({ moderation_status: status, updated_at: now })
      .eq('id', templateId);
    if (updateError) return error(requestId, 'UPDATE_FAILED', 'Could not update template', 500);

    // Close any open review as decided, and append a fresh decision record.
    const reviewStatus = decision === 'approve' ? 'approved'
      : decision === 'changes_requested' ? 'changes_requested'
      : decision === 'reject' ? 'rejected' : 'suspended';

    await admin.from('template_reviews').insert({
      template_id: templateId,
      reviewer_id: userId,
      status: reviewStatus,
      findings: { decision, reason },
      created_at: now,
      completed_at: now,
    });

    // Audit event (append-only).
    await admin.from('collaboration_events').insert({
      project_id: null,
      actor_id: userId,
      event_type: 'template.moderated',
      entity_type: 'template',
      entity_id: templateId,
      safe_metadata: { decision, reason },
    });

    return json({ requestId, code: 'OK', message: `Template ${decision === 'approve' ? 'approved' : decision.replace('_', ' ')}.` }, 200, cors);
  }

  return error(requestId, 'INVALID_ACTION', `Unknown action "${action}"`, 400);
});
