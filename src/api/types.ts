// Mirrors the mini-jarvis backend DTOs (web/Dtos.java, web/ApiError.java, security/AuthController.java).
// Java `Instant` fields are serialised by Jackson as ISO-8601 strings.

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type RecommendationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type AgentRunStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED'
export type AuditEventType =
  | 'AGENT_RUN_STARTED'
  | 'AGENT_RUN_FINISHED'
  | 'AGENT_RUN_FAILED'
  | 'AI_CALL'
  | 'AI_FALLBACK_USED'
  | 'RECOMMENDATION_CREATED'
  | 'RECOMMENDATION_APPROVED'
  | 'RECOMMENDATION_REJECTED'
  | 'NOTIFICATION_SENT'
  | 'NOTIFICATION_FAILED'

/** AuthController.LoginRequest */
export interface LoginRequest {
  username: string
  password: string
}

/** AuthController.TokenResponse */
export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresInSeconds: number
}

/** Dtos.ProviderInfo */
export interface ProviderInfo {
  id: string
  model: string | null
  available: boolean
  isDefault: boolean
  isFallback: boolean
}

/** Dtos.ProvidersResponse */
export interface ProvidersResponse {
  defaultProvider: string | null
  fallbackProvider: string | null
  providers: ProviderInfo[]
}

/** Dtos.RecommendationDto */
export interface RecommendationDto {
  id: number
  agentRunId: number | null
  agentName: string
  title: string
  reason: string
  suggestedAction: string
  riskLevel: RiskLevel
  status: RecommendationStatus
  provider: string | null
  model: string | null
  fallbackUsed: boolean
  needsReview: boolean
  createdAt: string
  decidedAt: string | null
  decidedBy: string | null
  decisionComment: string | null
}

/** Dtos.AgentRunResponse */
export interface AgentRunResponse {
  runId: number
  agent: string
  status: AgentRunStatus
  provider: string | null
  model: string | null
  fallbackUsed: boolean
  summary: string | null
  riskLevel: RiskLevel | null
  needsReview: boolean
  reviewNotes: string | null
  inputTokens: number | null
  outputTokens: number | null
  startedAt: string | null
  finishedAt: string | null
  recommendations: RecommendationDto[]
}

/** Dtos.AuditLogDto */
export interface AuditLogDto {
  id: number
  eventType: AuditEventType
  actor: string | null
  agentRunId: number | null
  recommendationId: number | null
  details: string | null
  createdAt: string
}

/** Dtos.DecisionRequest */
export interface DecisionRequest {
  comment?: string
}

/** web.ApiError: the shared error shape. `agentRunId` is omitted when null. */
export interface ApiError {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  agentRunId?: number
}
