import { useEffect, useState } from 'react'
import { describeError } from '../api/client'
import type { AuditLogDto } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorBanner } from '../components/ErrorBanner'
import { formatDateTime } from '../components/format'

const LIMITS = [10, 25, 50, 100, 200, 500] // the backend caps limit at 500

export function AuditLogPage() {
  const { api } = useAuth()
  const [limit, setLimit] = useState(50)
  const [reloadCount, setReloadCount] = useState(0)
  // Key of the request the current rows came from; while it differs, the table is loading.
  const [loaded, setLoaded] = useState<{ key: string; rows: AuditLogDto[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestKey = `${limit}:${reloadCount}`

  useEffect(() => {
    let ignore = false
    api.getAuditLog(limit).then(
      (rows) => {
        if (ignore) return
        setLoaded({ key: requestKey, rows })
        setError(null)
      },
      (err) => {
        if (ignore) return
        setLoaded((current) => ({ key: requestKey, rows: current?.rows ?? [] }))
        setError(describeError(err))
      },
    )
    return () => {
      ignore = true
    }
  }, [api, limit, requestKey])

  const loading = loaded?.key !== requestKey
  const rows = loaded?.rows ?? []

  return (
    <div className="page">
      <h1>Audit log</h1>
      <p className="lead muted">Every agent run, AI call, recommendation and decision, newest first.</p>

      <div className="toolbar">
        <div className="field field-inline">
          <label htmlFor="limit-select">Show</label>
          <select id="limit-select" value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
            {LIMITS.map((n) => (
              <option key={n} value={n}>
                {n} entries
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setReloadCount((n) => n + 1)}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="table-wrap card" aria-busy={loading}>
        <table className="table">
          <caption className="sr-only">Latest {limit} audit log entries</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Event</th>
              <th scope="col">Actor</th>
              <th scope="col">Run</th>
              <th scope="col">Rec.</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="nowrap">{formatDateTime(row.createdAt)}</td>
                <td>
                  <code className="event">{row.eventType}</code>
                </td>
                <td>{row.actor ?? '—'}</td>
                <td>{row.agentRunId ?? '—'}</td>
                <td>{row.recommendationId ?? '—'}</td>
                <td className="details">{row.details ?? ''}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
