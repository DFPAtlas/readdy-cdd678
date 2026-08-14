import type { ApiResponse, ApiError, ApiMeta, MockServiceConfig } from '@/types';

let config: MockServiceConfig = {
  delay: 300,
  errorRate: 0,
  offlineMode: false,
};

let requestCounter = 0;

export function configureMock(updates: Partial<MockServiceConfig>) {
  config = { ...config, ...updates };
}

export function generateRequestId(): string {
  requestCounter++;
  return `req_${Date.now()}_${requestCounter}`;
}

export function generateIdempotencyKey(): string {
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function safeDelay(): Promise<void> {
  if (config.offlineMode) {
    return Promise.reject(new Error('Offline mode — network unavailable'));
  }
  const jitter = config.delay * (0.5 + Math.random());
  return new Promise((resolve) => setTimeout(resolve, jitter));
}

export function shouldSimulateError(): boolean {
  return Math.random() < config.errorRate;
}

export function createApiMeta(overrides?: Partial<ApiMeta>): ApiMeta {
  return {
    requestId: generateRequestId(),
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

export function successResponse<T>(data: T, overrides?: Partial<ApiMeta>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: createApiMeta(overrides),
    error: undefined,
  };
}

export function errorResponse(code: string, message: string, details?: Record<string, unknown>): ApiResponse<never> {
  const error: ApiError = { code, message, details };
  return {
    success: false,
    error,
    meta: createApiMeta(),
    data: undefined,
  };
}

export function mapError(err: unknown): ApiError {
  if (err instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: err.message,
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  };
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  return { data, total, totalPages, page, pageSize };
}

export function getMockConfig(): MockServiceConfig {
  return { ...config };
}