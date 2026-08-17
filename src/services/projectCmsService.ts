import { getSupabaseClient } from '@/services/supabaseClient';
import { listCollections, currentProjectRole } from '@/pages/projects/cms/cmsData';
import type { CmsCollection } from '@/pages/projects/cms/cmsTypes';

// ------------------------------------------------------------
// Project CMS data model (derived from real Supabase records)
// ------------------------------------------------------------

export interface ProjectCmsData {
  authenticated: boolean;
  found: boolean;
  project: { id: string; name: string; slug: string } | null;
  role: string | null;
  collections: CmsCollection[];
  totalItems: number;
  draftCount: number;
  scheduledCount: number;
  publishedCount: number;
  archivedCount: number;
}

export function createEmptyCmsData(): ProjectCmsData {
  return {
    authenticated: false,
    found: false,
    project: null,
    role: null,
    collections: [],
    totalItems: 0,
    draftCount: 0,
    scheduledCount: 0,
    publishedCount: 0,
    archivedCount: 0,
  };
}

export async function fetchProjectCms(projectId: string): Promise<ProjectCmsData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyCmsData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyCmsData();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) {
    return { ...createEmptyCmsData(), authenticated: true, found: false };
  }

  // Reuse the existing tenant-scoped data layer for collections and role.
  const role = await currentProjectRole(projectId);
  const collections = await listCollections(projectId);

  const { data: statusRows, error: statusError } = await supabase
    .from('cms_items')
    .select('status')
    .eq('project_id', projectId);

  if (statusError) throw statusError;

  let draftCount = 0;
  let scheduledCount = 0;
  let publishedCount = 0;
  let archivedCount = 0;

  const rows = (statusRows ?? []) as Array<{ status: string | null }>;
  for (const r of rows) {
    switch (r.status) {
      case 'draft':
        draftCount += 1;
        break;
      case 'scheduled':
        scheduledCount += 1;
        break;
      case 'published':
        publishedCount += 1;
        break;
      case 'archived':
        archivedCount += 1;
        break;
      default:
        break;
    }
  }

  return {
    authenticated: true,
    found: true,
    project: { id: project.id, name: project.name, slug: project.slug },
    role,
    collections,
    totalItems: rows.length,
    draftCount,
    scheduledCount,
    publishedCount,
    archivedCount,
  };
}