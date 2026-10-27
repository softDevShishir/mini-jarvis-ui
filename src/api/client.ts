import type {
  AgentRunResponse,
  ApiError,
  AuditLogDto,
  ProvidersResponse,
  RecommendationDto,
  RecommendationStatus,
  TokenResponse,
} from './types'

/** Thrown for every failed request. `body` is the backend's ApiError, or a synthesised one. */
export class ApiRequestError extends Error {
  readonly status: number
  readonly body: ApiError
  /** False when the response was not the backend's JSON error shape (network error, proxy error page). */
  readonly fromServer: boolean

  constructor(body: ApiError, fromServer: boolean) {
    super(body.message)
    this.name = 'ApiRequestError'
    this.status = body.status
    this.body = body
    this.fromServer = fromServer
  }
}

export interface ApiClientOptions {
  /** Prefix for every path. Empty in development (the Vite proxy forwards /api). */
  baseUrl?: string
  getToken: () => string | null
  /** Called when an authenticated request gets a 401 (expired or invalid token). */
  onUnauthorized?: () => void
  fetchImpl?: typeof fetch
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  /** False for the login call: no token is sent and a 401 means wrong credentials, not "log out". */
  auth?: boolean
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).message === 'string'
  )
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '')
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args))

  async function request<T>(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (auth) {
      const token = options.getToken()
      if (token) headers.Authorization = `Bearer ${token}`
    }

    let response: Response
    try {
      response = await doFetch(baseUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiRequestError(
        {
          timestamp: new Date().toISOString(),
          status: 0,
          error: 'Network Error',
          message: 'Cannot reach the Mini Jarvis AI Agent server. Is the backend running?',
          path,
        },
        false,
      )
    }

    const text = await response.text()
    let parsed: unknown = undefined
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = undefined
      }
    }

    if (!response.ok) {
      if (response.status === 401 && auth) options.onUnauthorized?.()
      if (isApiError(parsed)) throw new ApiRequestError(parsed, true)
      throw new ApiRequestError(
        {
          timestamp: new Date().toISOString(),
          status: response.status,
          error: response.statusText || 'Error',
          message: `The server returned HTTP ${response.status}.`,
          path,
        },
        false,
      )
    }

    return parsed as T
  }

  return {
    login: (username: string, password: string) =>
      request<TokenResponse>('/api/auth/login', { method: 'POST', body: { username, password }, auth: false }),

    getProviders: () => request<ProvidersResponse>('/api/providers'),

    getAgents: () => request<string[]>('/api/agents'),

    runAgent: (name: string, provider?: string) => {
      const query = provider ? `?provider=${encodeURIComponent(provider)}` : ''
      return request<AgentRunResponse>(`/api/agents/${encodeURIComponent(name)}/run${query}`, { method: 'POST' })
    },

    getRecommendations: (status?: RecommendationStatus) =>
      request<RecommendationDto[]>(`/api/recommendations${status ? `?status=${status}` : ''}`),

    decide: (id: number, decision: 'approve' | 'reject', comment?: string) => {
      const trimmed = comment?.trim()
      return request<RecommendationDto>(`/api/recommendations/${id}/${decision}`, {
        method: 'POST',
        body: trimmed ? { comment: trimmed } : {},
      })
    },

    getAuditLog: (limit: number) => request<AuditLogDto[]>(`/api/audit-log?limit=${limit}`),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

/** Turns any error into text for the error banner, with friendlier wording for the statuses users will hit. */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return error instanceof Error ? error.message : 'Something went wrong.'
  }
  if (!error.fromServer) return error.message
  const { status, message, agentRunId } = error.body
  switch (status) {
    case 409:
      return 'This recommendation has already been approved or rejected. Refresh the list to see its current status.'
    case 429:
      return `The daily AI call limit has been reached, so no agent can run until tomorrow. (${message})`
    case 502: {
      const run = agentRunId != null ? ` Run #${agentRunId} was saved as FAILED.` : ''
      return `The AI provider failed.${run} Details: ${message}`
    }
    default:
      return message
  }
}
