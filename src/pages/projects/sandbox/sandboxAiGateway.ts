import { getSandboxClient, resolveSandboxProject, type ResolvedSandboxProject } from './sandboxPersistence';
import type { SandboxAiProposal, SandboxAiOperation, SandboxComponentOperation, SandboxPageOperation } from './sandboxAi';

export type AiTaskClass = 'fast_edit' | 'standard' | 'complex' | 'copywriting' | 'seo' | 'accessibility' | 'image_alt' | 'local';

export type AiMode = 'live' | 'local' | 'offline' | 'fallback';

export type AiUsage = {
  mode: AiMode;
  provider?: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
  durationMs: number;
  planCode?: string;
  monthlyRequestsRemaining?: number;
  monthlyCreditsRemaining?: number;
  dailyPageRemaining?: number;
  resetDate?: string;
};

export type AiGatewayRequest = {
  prompt: string;
  pageId: string;
  viewport: 'desktop' | 'tablet' | 'mobile';
  selectedElementIds: string[];
  pageStructure: unknown;
  componentDefinitions: unknown[];
  assetMetadata: unknown[];
  taskClass: AiTaskClass;
  schemaVersion: number;
  scope?: string;
  preferredModel?: string;
  localOnly?: boolean;
};

export type AiGatewayOutcome = {
  mode: AiMode;
  proposal: SandboxAiProposal | null;
  usage: AiUsage;
  errorCode?: string;
  message?: string;
  localFallbackAvailable: boolean;
};

let cachedProject: ResolvedSandboxProject | null | undefined;

function baseUsage(mode: AiMode, durationMs = 0): AiUsage {
  return { mode, inputTokens: 0, outputTokens: 0, estimatedCostMicros: 0, durationMs };
}

async function resolveProjectId(): Promise<string | null> {
  if (cachedProject !== undefined && cachedProject !== null) return cachedProject.projectId;
  try {
    cachedProject = await resolveSandboxProject();
    return cachedProject?.projectId ?? null;
  } catch {
    cachedProject = null;
    return null;
  }
}

function parseOutcome(data: unknown, durationMs: number): AiGatewayOutcome {
  const record = (data ?? {}) as Record<string, unknown>;

  if (record.code === 'ERROR') {
    const errorCode = typeof record.errorCode === 'string' ? record.errorCode : 'UNKNOWN';
    const message = typeof record.message === 'string' ? record.message : 'Live AI request failed';
    const localFallbackAvailable = record.localFallbackAvailable === true;
    return {
      mode: 'offline',
      proposal: null,
      usage: baseUsage('offline', durationMs),
      errorCode,
      message,
      localFallbackAvailable,
    };
  }

  const providerMode = typeof record.providerMode === 'string' ? record.providerMode : 'local';
  const usageRaw = (record.usage ?? {}) as Record<string, unknown>;
  const entitlement = (record.entitlement ?? {}) as Record<string, unknown>;
  const usage: AiUsage = {
    mode: providerMode === 'live' ? 'live' : providerMode === 'fallback' ? 'fallback' : 'local',
    provider: typeof usageRaw.provider === 'string' ? usageRaw.provider : undefined,
    model: typeof usageRaw.model === 'string' ? usageRaw.model : undefined,
    inputTokens: Number(usageRaw.inputTokens) || 0,
    outputTokens: Number(usageRaw.outputTokens) || 0,
    estimatedCostMicros: Number(usageRaw.estimatedCostMicros) || 0,
    durationMs: Number(usageRaw.durationMs) || durationMs,
    planCode: typeof entitlement.planCode === 'string' ? entitlement.planCode : undefined,
    monthlyRequestsRemaining: typeof entitlement.monthlyRequestsRemaining === 'number' ? entitlement.monthlyRequestsRemaining : undefined,
    monthlyCreditsRemaining: typeof entitlement.monthlyCreditsRemaining === 'number' ? entitlement.monthlyCreditsRemaining : undefined,
    dailyPageRemaining: typeof entitlement.dailyPageRemaining === 'number' ? entitlement.dailyPageRemaining : undefined,
    resetDate: typeof entitlement.resetDate === 'string' ? entitlement.resetDate : undefined,
  };

  if (providerMode === 'live' && record.proposal) {
    const proposal = record.proposal as Record<string, unknown>;
    const proposalObj: SandboxAiProposal = {
      id: typeof proposal.proposalId === 'string' ? proposal.proposalId : crypto.randomUUID(),
      title: typeof proposal.title === 'string' ? proposal.title : 'Proposed changes',
      summary: typeof proposal.summary === 'string' ? proposal.summary : 'Review these changes before applying.',
      changes: Array.isArray(proposal.changes) ? proposal.changes.map((change) => String(change)) : [],
      operations: (Array.isArray(proposal.operations) ? proposal.operations : []) as SandboxAiOperation[],
      pageOperations: (Array.isArray(proposal.pageOperations) ? proposal.pageOperations : []) as SandboxPageOperation[],
      componentOperations: (Array.isArray(proposal.componentOperations) ? proposal.componentOperations : []) as SandboxComponentOperation[],
      warnings: Array.isArray(proposal.warnings) ? proposal.warnings.map((warning) => String(warning)) : [],
      source: 'forge-ai',
    };
    return { mode: 'live', proposal: proposalObj, usage, localFallbackAvailable: false };
  }

  const fallbackReason = typeof record.fallbackReason === 'string' ? record.fallbackReason : undefined;
  return {
    mode: providerMode === 'fallback' ? 'fallback' : 'local',
    proposal: null,
    usage,
    errorCode: fallbackReason,
    message: fallbackReason === 'PROVIDER_UNAVAILABLE' ? 'Live AI unavailable — using smart local mode' : undefined,
    localFallbackAvailable: true,
  };
}

export async function invokeForgeAi(request: AiGatewayRequest, signal: AbortSignal): Promise<AiGatewayOutcome> {
  const supabase = getSandboxClient();
  if (!supabase) {
    return { mode: 'offline', proposal: null, usage: baseUsage('offline'), errorCode: 'NOT_CONFIGURED', message: 'Supabase not configured', localFallbackAvailable: true };
  }

  let projectId: string | null;
  try {
    projectId = await resolveProjectId();
  } catch {
    projectId = null;
  }
  if (!projectId) {
    return { mode: 'offline', proposal: null, usage: baseUsage('offline'), errorCode: 'AUTH_REQUIRED', message: 'Sign in to use live AI', localFallbackAvailable: true };
  }

  const requestId = crypto.randomUUID();
  const body = {
    requestId,
    projectId,
    pageId: request.pageId,
    prompt: request.prompt,
    selectedElementIds: request.selectedElementIds,
    viewport: request.viewport,
    pageStructure: request.pageStructure,
    componentDefinitions: request.componentDefinitions,
    assetMetadata: request.assetMetadata,
    schemaVersion: request.schemaVersion,
    taskClass: request.taskClass,
    scope: request.scope ?? 'page',
    preferredModel: request.preferredModel ?? '',
    localOnly: request.localOnly === true,
  };

  const started = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke('forge-ai', { body, signal });
    const durationMs = Date.now() - started;
    if (error) {
      return { mode: 'offline', proposal: null, usage: baseUsage('offline', durationMs), errorCode: 'FUNCTION_ERROR', message: 'Live AI unavailable', localFallbackAvailable: true };
    }
    return parseOutcome(data, durationMs);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return {
      mode: 'offline',
      proposal: null,
      usage: baseUsage('offline', Date.now() - started),
      errorCode: 'FUNCTION_ERROR',
      message: 'Live AI unavailable',
      localFallbackAvailable: true,
    };
  }
}