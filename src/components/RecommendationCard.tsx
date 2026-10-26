import { useId, useState, type FormEvent } from 'react'
import { describeError } from '../api/client'
import type { RecommendationDto } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorBanner } from './ErrorBanner'
import { formatDateTime } from './format'
import { Modal } from './Modal'
import { RiskBadge } from './RiskBadge'

type Decision = 'approve' | 'reject'

interface RecommendationCardProps {
  recommendation: RecommendationDto
  /** Called with the updated recommendation after a successful approve/reject. */
  onDecided?: (updated: RecommendationDto) => void
}

const MAX_COMMENT_LENGTH = 1000 // Dtos.DecisionRequest: @Size(max = 1000)

export function RecommendationCard({ recommendation: rec, onDecided }: RecommendationCardProps) {
  const { api } = useAuth()
  const [decision, setDecision] = useState<Decision | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const commentId = useId()
  const hintId = useId()

  function open(next: Decision) {
    setDecision(next)
    setComment('')
    setError(null)
  }

  function close() {
    setDecision(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!decision) return
    setSubmitting(true)
    setError(null)
    try {
      const updated = await api.decide(rec.id, decision, comment)
      setDecision(null)
      onDecided?.(updated)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="card rec-card" aria-labelledby={`rec-${rec.id}-title`}>
      <header className="rec-header">
        <h3 id={`rec-${rec.id}-title`} className="rec-title">
          {rec.title}
        </h3>
        <div className="badge-row">
          <RiskBadge level={rec.riskLevel} />
          <span className={`badge badge-status-${rec.status.toLowerCase()}`}>{rec.status}</span>
        </div>
      </header>

      {rec.needsReview && (
        <p className="warning" role="note">
          <strong>Needs review:</strong> some figures in this recommendation could not be matched to the source data.
          Check the numbers before acting on it.
        </p>
      )}

      <dl className="rec-details">
        <dt>Reason</dt>
        <dd>{rec.reason}</dd>
        <dt>Suggested action</dt>
        <dd>{rec.suggestedAction}</dd>
      </dl>

      <p className="rec-meta muted">
        {rec.agentName} · {rec.provider ?? 'unknown provider'}
        {rec.model ? ` / ${rec.model}` : ''}
        {rec.fallbackUsed ? ' (fallback provider)' : ''} · created {formatDateTime(rec.createdAt)}
      </p>

      {rec.status !== 'PENDING' && (
        <p className="rec-meta muted">
          {rec.status === 'APPROVED' ? 'Approved' : 'Rejected'}
          {rec.decidedBy ? ` by ${rec.decidedBy}` : ''} on {formatDateTime(rec.decidedAt)}
          {rec.decisionComment ? ` — “${rec.decisionComment}”` : ''}
        </p>
      )}

      {rec.status === 'PENDING' && (
        <div className="rec-actions">
          <button type="button" className="btn btn-primary" onClick={() => open('approve')}>
            Approve
          </button>
          <button type="button" className="btn btn-danger" onClick={() => open('reject')}>
            Reject
          </button>
        </div>
      )}

      {decision && (
        <Modal
          title={`${decision === 'approve' ? 'Approve' : 'Reject'} recommendation`}
          onClose={close}
          busy={submitting}
        >
          <form onSubmit={submit}>
            <p className="modal-subject">{rec.title}</p>
            <p id={hintId} className="muted">
              {decision === 'approve'
                ? 'Approving only records your decision in the audit log. It does not execute anything; you carry out the action yourself.'
                : 'Rejecting records your decision in the audit log. Nothing else happens.'}
            </p>
            <label htmlFor={commentId}>Comment (optional)</label>
            <textarea
              id={commentId}
              value={comment}
              maxLength={MAX_COMMENT_LENGTH}
              rows={3}
              aria-describedby={hintId}
              onChange={(event) => setComment(event.target.value)}
            />
            <ErrorBanner message={error} />
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={close} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${decision === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : decision === 'approve' ? 'Record approval' : 'Record rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </article>
  )
}
