// ============================================================
// Forge — Service Types
// ============================================================

// --- API Response ---

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta & { pagination: PaginationMeta };
}

// --- API Mode ---

export type ApiMode = 'mock' | 'local';

// --- Mock Service ---

export interface MockServiceConfig {
  delay: number;
  errorRate: number;
  offlineMode: boolean;
}

// --- Realtime Events ---

export interface RealtimeEvent {
  id: string;
  type: string;
  payload: unknown;
  timestamp: string;
}

// --- Service Health ---

export interface ServiceHealth {
  forgeApi: SystemServiceStatus;
  supabase: SystemServiceStatus;
  n8n: SystemServiceStatus;
  previewManager: SystemServiceStatus;
  ollama: SystemServiceStatus;
}

export interface SystemServiceStatus {
  status: 'online' | 'degraded' | 'offline' | 'unknown';
  latency?: number;
  version?: string;
  message?: string;
}