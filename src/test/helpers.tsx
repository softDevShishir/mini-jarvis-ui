import { vi } from 'vitest'

/** A fetch mock that answers every call with the given status and JSON body. */
export function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function mockFetch(...responses: Response[]) {
  const fn = vi.fn<typeof fetch>()
  for (const response of responses) fn.mockResolvedValueOnce(response)
  return fn
}

export function apiError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return {
    timestamp: '2026-10-26T00:00:00Z',
    status,
    error: 'Error',
    message,
    path: '/api/test',
    ...extra,
  }
}
