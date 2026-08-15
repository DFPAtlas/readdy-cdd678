import JSZip from 'jszip';
import { getSandboxClient, resolveSandboxProject, type SandboxDocument } from './sandboxPersistence';
import { checksumDocument } from './sandboxVersions';
import { generateStaticSite, type StaticSite } from './sandboxRenderer';

/* ──────────────────────────────────────────────────────────────
   Build / export client (honest local-export mode)
   ────────────────────────────────────────────────────────────── */

export type BuildStatus = 'queued' | 'validating' | 'generating' | 'packaging' | 'completed' | 'failed' | 'cancelled';

export type BuildRecord = {
  id: string;
  projectId: string;
  buildNumber: number | null;
  status: BuildStatus;
  sourceVersionId: string | null;
  environment: string | null;
  blueprintChecksum: string | null;
  warningCount: number;
  errorCount: number;
  manifest: Record<string, unknown> | null;
  failureCode: string | null;
  failureMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type ExportRecord = {
  id: string;
  projectId: string;
  format: string;
  status: string;
  fileSize: number | null;
  checksum: string | null;
  buildId: string | null;
  manifest: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
};

export type ExportOptions = {
  siteUrl?: string;
  basePath?: string;
  includeAssets?: boolean;
  sitemap?: boolean;
  robots?: boolean;
  custom404?: boolean;
};

export type ExportProgress = {
  stage: 'generating' | 'packaging';
  pagesProcessed: number;
  totalPages: number;
  assetsProcessed: number;
  totalAssets: number;
};

export type ExportResult = {
  blob: Blob;
  filename: string;
  checksum: string;
  sizeBytes: number;
  manifest: Record<string, unknown>;
  warnings: string[];
};

/* ──────────────────────────────────────────────────────────────
   Checksums
   ────────────────────────────────────────────────────────────── */

export async function computeChecksum(bytes: Uint8Array): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // fall through to FNV
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i];
    hash = (hash * 0x01000193) >>> 0;
  }
  return `fnv-${`00000000${hash.toString(16)}`.slice(-8)}`;
}

/* ──────────────────────────────────────────────────────────────
   Static ZIP export (client-side)
   ────────────────────────────────────────────────────────────── */

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'application/pdf': 'pdf', 'text/plain': 'txt',
};

function extensionFor(url: string, mimeType: string): string {
  if (MIME_EXT[mimeType]) return MIME_EXT[mimeType];
  const clean = url.split('?')[0].split('#')[0];
  const match = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match ? match[1].toLowerCase() : 'bin';
}

function slugifyName(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'asset';
}

async function fetchAsset(url: string): Promise<{ blob: Blob; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return { blob, mimeType: blob.type || '' };
  } catch {
    return null;
  }
}

function relativePrefix(slug: string): string {
  const depth = slug.split('/').filter(Boolean).length;
  return depth === 0 ? '' : '../'.repeat(depth);
}

export async function exportStaticSiteZip(
  document: SandboxDocument,
  options: ExportOptions = {},
  onProgress?: (progress: ExportProgress) => void,
): Promise<ExportResult> {
  const site = generateStaticSite(document, { siteUrl: options.siteUrl, basePath: options.basePath });
  const warnings: string[] = [];
  const zip = new JSZip();

  onProgress?.({ stage: 'generating', pagesProcessed: 0, totalPages: site.pages.length, assetsProcessed: 0, totalAssets: 0 });

  /* Resolve assets into the archive (best-effort, relative rewrite). */
  const assetMap = new Map<string, string>();
  const totalAssets = options.includeAssets === false ? 0 : site.assetUrls.length;
  let assetsProcessed = 0;
  let assetIndex = 0;

  if (options.includeAssets !== false) {
    for (const url of site.assetUrls) {
      const fetched = await fetchAsset(url);
      if (fetched) {
        const ext = extensionFor(url, fetched.mimeType);
        const filename = `assets/asset-${assetIndex}-${slugifyName(url.split('/').pop() ?? 'file')}.${ext}`;
        zip.file(filename, fetched.blob);
        assetMap.set(url, filename);
      } else {
        warnings.push(`Could not bundle asset “${url}” — it will be left as an external reference.`);
      }
      assetIndex += 1;
      assetsProcessed += 1;
      onProgress?.({ stage: 'generating', pagesProcessed: site.pages.length, totalPages: site.pages.length, assetsProcessed, totalAssets });
    }
  }

  /* Write pages, rewriting asset URLs to relative paths. */
  site.pages.forEach((page, index) => {
    let html = page.html;
    if (assetMap.size) {
      const prefix = relativePrefix(page.slug);
      assetMap.forEach((assetPath, url) => {
        html = html.split(url).join(`${prefix}${assetPath}`);
      });
    }
    zip.file(page.filename, html);
    onProgress?.({ stage: 'packaging', pagesProcessed: index + 1, totalPages: site.pages.length, assetsProcessed, totalAssets });
  });

  zip.file('css/style.css', site.css);
  zip.file('404.html', site.notFoundHtml);

  if (options.sitemap !== false) zip.file('sitemap.xml', site.sitemap);
  if (options.robots !== false) zip.file('robots.txt', site.robots);

  const manifest = {
    ...site.manifest,
    blueprintChecksum: checksumDocument(document),
    outputFormat: 'zip',
    includeAssets: options.includeAssets !== false,
    warnings: warnings,
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('README.md', site.readme);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const buffer = await blob.arrayBuffer();
  const checksum = await computeChecksum(new Uint8Array(buffer));

  const safeName = slugifyName(document.projectName);
  const filename = `${safeName}-static-export.zip`;

  return { blob, filename, checksum, sizeBytes: blob.size, manifest, warnings };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ──────────────────────────────────────────────────────────────
   Cloud records (read-only listing + local export record)
   ────────────────────────────────────────────────────────────── */

function mapBuildRow(row: Record<string, unknown>): BuildRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    buildNumber: row.build_number == null ? null : Number(row.build_number),
    status: (String(row.status) as BuildStatus) || 'queued',
    sourceVersionId: row.source_version_id ? String(row.source_version_id) : null,
    environment: row.environment ? String(row.environment) : null,
    blueprintChecksum: row.blueprint_checksum ? String(row.blueprint_checksum) : null,
    warningCount: Number(row.warning_count ?? 0),
    errorCount: Number(row.error_count ?? 0),
    manifest: row.manifest && typeof row.manifest === 'object' ? (row.manifest as Record<string, unknown>) : null,
    failureCode: row.failure_code ? String(row.failure_code) : null,
    failureMessage: row.failure_message ? String(row.failure_message) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
  };
}

export async function listBuilds(): Promise<BuildRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('builds')
    .select('*')
    .eq('project_id', resolved.projectId)
    .order('started_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapBuildRow);
}

export async function recordLocalExport(document: SandboxDocument, result: ExportResult): Promise<ExportRecord | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return null;
  const { data, error } = await supabase
    .from('exports')
    .insert({
      project_id: resolved.projectId,
      format: 'zip',
      status: 'completed',
      file_size: result.sizeBytes,
      checksum: result.checksum,
      manifest: result.manifest,
      completed_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return data as unknown as ExportRecord;
}

export function buildWorkerAvailable(): boolean {
  // No dedicated server build worker is configured in this phase.
  return false;
}

export type { StaticSite };