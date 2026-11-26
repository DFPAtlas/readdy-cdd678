import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultTheme, scanTheme } from '../src/pages/projects/sandbox/sandboxTheme';
import { DEMO_HERO_FILE, demoFileTree } from '../src/services/mock/demoData';
import { configureMock, safeDelay } from '../src/services/mock/apiClient';

const mocks = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock('@/services/supabaseClient', () => ({ getSupabaseClient: mocks.getClient }));
import { fetchProjectOverview } from '../src/services/projectOverviewService';

afterEach(() => { vi.useRealTimers(); configureMock({ delay: 300, offlineMode: false }); });

describe('design scanner', () => {
  it('scans the default theme without reading controls from the colour scale', () => {
    expect(() => scanTheme(defaultTheme())).not.toThrow();
  });
  it('reports unreadable button and form-label contrast from their configured styles', () => {
    const theme = defaultTheme();
    theme.buttons.variants.primary.textColor = '#ffffff';
    theme.buttons.variants.primary.background = '#ffffff';
    theme.forms.labelColor = theme.colors.light.background;
    const findings = scanTheme(theme);
    expect(findings.some((f) => f.severity === 'critical' && f.message.startsWith('Button text on primary'))).toBe(true);
    expect(findings.some((f) => f.severity === 'critical' && f.message.startsWith('Field labels'))).toBe(true);
  });
});

describe('demo fixtures and timing', () => {
  it('can import demo data and resolve the hero source without an initialization crash', () => {
    const source = demoFileTree.children?.find((n) => n.name === 'src');
    const components = source?.children?.find((n) => n.name === 'components');
    expect(components?.children?.find((n) => n.name === 'Hero.tsx')?.content).toBe(DEMO_HERO_FILE);
    expect(DEMO_HERO_FILE).toContain('export default function Hero');
  });
  it('honours a caller-supplied simulation delay', async () => {
    vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0.5);
    let complete = false;
    const pending = safeDelay(800).then(() => { complete = true; });
    await vi.advanceTimersByTimeAsync(799); expect(complete).toBe(false);
    await vi.advanceTimersByTimeAsync(1); await pending; expect(complete).toBe(true);
    vi.restoreAllMocks();
  });
  it('retains offline failure behaviour', async () => {
    configureMock({ offlineMode: true });
    await expect(safeDelay(800)).rejects.toThrow('Offline mode');
  });
});

describe('project overview activity', () => {
  beforeEach(() => {
    const project = { id: 'site-a', name: 'Site A', workspace_id: 'workspace-a', created_at: '2026-11-20T10:00:00Z', blueprint: { pages: [] } };
    const fixtures: Record<string, Array<Record<string, unknown>>> = {
      projects: [project],
      builds: [{ id: 'build-a', status: 'success', started_at: '2026-11-23T10:00:00Z' }],
      project_versions: [{ id: 'version-a', version_number: 2, created_at: '2026-11-24T10:00:00Z' }],
      ai_jobs: [{ id: 'job-a', task_type: 'layout', status: 'completed', created_at: '2026-11-25T10:00:00Z' }],
      workspace_ai_keys: [],
    };
    mocks.getClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'owner-a' } } }) },
      from: (table: string) => {
        const rows = fixtures[table] ?? [];
        const result = { data: rows, count: rows.length, error: null };
        const query = {
          select: () => query,
          eq: () => query,
          order: () => query,
          limit: () => query,
          maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
          then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
        };
        return query;
      },
    });
  });
  it('includes build, version and AI events with their mapped timestamps in newest-first order', async () => {
    const overview = await fetchProjectOverview('site-a');
    expect(overview.activity.map((event) => event.id)).toEqual(['ai-job-a', 'version-version-a', 'build-build-a', 'project-created']);
    expect(overview.activity.map((event) => event.timestamp)).toEqual([
      '2026-11-25T10:00:00Z', '2026-11-24T10:00:00Z', '2026-11-23T10:00:00Z', '2026-11-20T10:00:00Z',
    ]);
  });
});
