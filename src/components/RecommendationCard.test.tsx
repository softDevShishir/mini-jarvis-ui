import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../api/client'
import type { RecommendationDto } from '../api/types'
import { AuthContext, type AuthState } from '../auth/AuthContext'
import { jsonResponse, mockFetch } from '../test/helpers'
import { RecommendationCard } from './RecommendationCard'

const pending: RecommendationDto = {
  id: 7,
  agentRunId: 3,
  agentName: 'cash-flow',
  title: 'Chase the overdue Harbour Cafe invoice',
  reason: 'INV-1042 is 45 days overdue.',
  suggestedAction: 'Call the client this week.',
  riskLevel: 'HIGH',
  status: 'PENDING',
  provider: 'claude',
  model: 'claude-sonnet-5-5',
  fallbackUsed: false,
  needsReview: false,
  createdAt: '2026-10-26T01:00:00Z',
  decidedAt: null,
  decidedBy: null,
  decisionComment: null,
}

function renderCard(rec: RecommendationDto, fetchImpl = mockFetch(), onDecided = vi.fn()) {
  const auth: AuthState = {
    isAuthenticated: true,
    username: 'admin',
    notice: null,
    api: createApiClient({ getToken: () => 'jwt', fetchImpl }),
    login: vi.fn(),
    logout: vi.fn(),
  }
  render(
    <AuthContext.Provider value={auth}>
      <RecommendationCard recommendation={rec} onDecided={onDecided} />
    </AuthContext.Provider>,
  )
  return { fetchImpl, onDecided }
}

describe('RecommendationCard', () => {
  it('shows the needs-review warning when set', () => {
    renderCard({ ...pending, needsReview: true })
    expect(screen.getByRole('note')).toHaveTextContent(/Needs review/)
  })

  it('does not show the warning when needsReview is false', () => {
    renderCard(pending)
    expect(screen.queryByText(/Needs review/)).not.toBeInTheDocument()
  })

  it('approve posts the comment to the approve endpoint', async () => {
    const approved = { ...pending, status: 'APPROVED', decidedBy: 'admin', decisionComment: 'Calling Monday' }
    const { fetchImpl, onDecided } = renderCard(pending, mockFetch(jsonResponse(200, approved)))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = screen.getByRole('dialog', { name: 'Approve recommendation' })
    expect(dialog).toHaveTextContent(/does not execute anything/)
    await user.type(within(dialog).getByLabelText(/Comment/), 'Calling Monday')
    await user.click(within(dialog).getByRole('button', { name: 'Record approval' }))

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/recommendations/7/approve')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ comment: 'Calling Monday' })
    expect(onDecided).toHaveBeenCalledWith(approved)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reject posts to the reject endpoint', async () => {
    const rejected = { ...pending, status: 'REJECTED' }
    const { fetchImpl } = renderCard(pending, mockFetch(jsonResponse(200, rejected)))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    await user.click(screen.getByRole('button', { name: 'Record rejection' }))

    expect(fetchImpl.mock.calls[0][0]).toBe('/api/recommendations/7/reject')
  })

  it.each(['APPROVED', 'REJECTED'] as const)('hides the decision buttons for %s items', (status) => {
    renderCard({ ...pending, status, decidedBy: 'admin', decidedAt: '2026-10-26T02:00:00Z' })
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
  })
})
