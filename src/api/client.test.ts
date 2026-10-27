import { describe, expect, it, vi } from 'vitest'
import { ApiRequestError, createApiClient, describeError } from './client'
import { apiError, jsonResponse, mockFetch } from '../test/helpers'

describe('api client', () => {
  it('adds the bearer token to authenticated requests', async () => {
    const fetchImpl = mockFetch(jsonResponse(200, { defaultProvider: 'claude', fallbackProvider: null, providers: [] }))
    const api = createApiClient({ getToken: () => 'abc.def.ghi', fetchImpl })

    await api.getProviders()

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/providers')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer abc.def.ghi')
  })

  it('prefixes the base URL and does not send a token on login', async () => {
    const fetchImpl = mockFetch(jsonResponse(200, { accessToken: 't', tokenType: 'Bearer', expiresInSeconds: 3600 }))
    const api = createApiClient({ baseUrl: 'https://api.example.com/', getToken: () => 'old', fetchImpl })

    const token = await api.login('admin', 'secret')

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/auth/login')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ username: 'admin', password: 'secret' })
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(token.accessToken).toBe('t')
  })

  it('parses the shared error shape into an ApiRequestError', async () => {
    const body = apiError(502, 'claude failed: overloaded', { agentRunId: 42 })
    const api = createApiClient({ getToken: () => 't', fetchImpl: mockFetch(jsonResponse(502, body)) })

    const error = await api.runAgent('cash-flow', 'claude').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).status).toBe(502)
    expect((error as ApiRequestError).body).toEqual(body)
    expect(describeError(error)).toBe('The AI provider failed. Run #42 was saved as FAILED. Details: claude failed: overloaded')
  })

  it('gives friendly text for 409 and 429', async () => {
    const conflict = new ApiRequestError(apiError(409, 'Recommendation 1 is already APPROVED'), true)
    const limit = new ApiRequestError(apiError(429, 'Daily AI call limit of 20 reached'), true)
    expect(describeError(conflict)).toMatch(/already been approved or rejected/)
    expect(describeError(limit)).toMatch(/daily AI call limit has been reached/)
  })

  it('calls onUnauthorized on a 401 from an authenticated request', async () => {
    const onUnauthorized = vi.fn()
    const fetchImpl = mockFetch(jsonResponse(401, apiError(401, 'Missing or invalid bearer token')))
    const api = createApiClient({ getToken: () => 'expired', onUnauthorized, fetchImpl })

    await expect(api.getRecommendations('PENDING')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not call onUnauthorized when the login itself returns 401', async () => {
    const onUnauthorized = vi.fn()
    const fetchImpl = mockFetch(jsonResponse(401, apiError(401, 'Invalid username or password')))
    const api = createApiClient({ getToken: () => null, onUnauthorized, fetchImpl })

    await expect(api.login('admin', 'wrong')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('reports a network failure without crashing', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    const api = createApiClient({ getToken: () => 't', fetchImpl })

    const error = await api.getAuditLog(50).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(describeError(error)).toMatch(/Cannot reach the Mini Jarvis AI Agent server/)
  })
})
