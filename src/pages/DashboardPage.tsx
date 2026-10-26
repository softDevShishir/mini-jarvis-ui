import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError, describeError } from '../api/client'
import type { AgentRunResponse, ProvidersResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorBanner } from '../components/ErrorBanner'
import { formatDateTime } from '../components/format'
import { RecommendationCard } from '../components/RecommendationCard'
import { RiskBadge } from '../components/RiskBadge'

const FALLBACK_AGENTS = ['cash-flow']
const DEFAULT_PROVIDER = ''

export function DashboardPage() {
  const { api } = useAuth()

  const [providers, setProviders] = useState<ProvidersResponse | null>(null)
  const [providersError, setProvidersError] = useState<string | null>(null)
  const [agents, setAgents] = useState<string[] | null>(null)

  const [agent, setAgent] = useState(FALLBACK_AGENTS[0])
  const [provider, setProvider] = useState(DEFAULT_PROVIDER)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<AgentRunResponse | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    api.getProviders().then(
      (response) => !ignore && setProviders(response),
      (err) => !ignore && setProvidersError(describeError(err)),
    )
    api.getAgents().then(
      (names) => {
        if (ignore) return
        const list = names.length > 0 ? names : FALLBACK_AGENTS
        setAgents(list)
        setAgent(list[0])
      },
      (err) => {
        if (ignore) return
        // Older backends have no GET /api/agents; fall back to the one agent that always exists.
        if (!(err instanceof ApiRequestError && err.status === 404)) setProvidersError(describeError(err))
        setAgents(FALLBACK_AGENTS)
      },
    )
    return () => {
      ignore = true
    }
  }, [api])

  useEffect(() => {
    if (!running) return
    const started = Date.now()
    const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  async function runAgent() {
    setRunning(true)
    setElapsed(0)
    setRunError(null)
    setResult(null)
    try {
      setResult(await api.runAgent(agent, provider || undefined))
    } catch (err) {
      setRunError(describeError(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="lead muted">
        Agents read your business data and suggest actions. They never act on their own: every recommendation waits
        for your approval.
      </p>

      <section className="card" aria-labelledby="providers-heading">
        <h2 id="providers-heading">AI providers</h2>
        <ErrorBanner message={providersError} onDismiss={() => setProvidersError(null)} />
        {!providers && !providersError && <p className="muted">Loading providers…</p>}
        {providers && (
          <>
            <ul className="chip-list" aria-label="Provider availability">
              {providers.providers.map((p) => (
                <li key={p.id} className={`chip ${p.available ? 'chip-ok' : 'chip-off'}`}>
                  <span className="chip-dot" aria-hidden="true" />
                  <span>
                    <strong>{p.id}</strong>
                    {p.model ? ` · ${p.model}` : ''}
                  </span>
                  <span className="chip-state">{p.available ? 'available' : 'unavailable'}</span>
                  {p.isDefault && <span className="chip-tag">default</span>}
                  {p.isFallback && <span className="chip-tag">fallback</span>}
                </li>
              ))}
            </ul>
            <p className="muted small">
              Default: {providers.defaultProvider ?? 'none'} · Fallback: {providers.fallbackProvider || 'none'}
            </p>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="run-heading">
        <h2 id="run-heading">Run an agent</h2>
        <form
          className="run-form"
          onSubmit={(event) => {
            event.preventDefault()
            void runAgent()
          }}
        >
          <div className="field">
            <label htmlFor="agent-select">Agent</label>
            <select
              id="agent-select"
              value={agent}
              disabled={running || agents === null}
              onChange={(event) => setAgent(event.target.value)}
            >
              {(agents ?? FALLBACK_AGENTS).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="provider-select">AI provider</label>
            <select
              id="provider-select"
              value={provider}
              disabled={running}
              onChange={(event) => setProvider(event.target.value)}
            >
              <option value={DEFAULT_PROVIDER}>
                Default{providers?.defaultProvider ? ` (${providers.defaultProvider})` : ''}
              </option>
              {providers?.providers.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.available}>
                  {p.id}
                  {p.available ? '' : ' (unavailable)'}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={running} aria-busy={running}>
            {running ? 'Running…' : 'Run agent'}
          </button>
        </form>

        <div aria-live="polite" className="run-status">
          {running && (
            <div className="banner banner-info">
              <span className="spinner" aria-hidden="true" />
              <span>
                Running <strong>{agent}</strong>… An AI call can take up to about a minute. ({elapsed}s elapsed)
              </span>
            </div>
          )}
        </div>
        <ErrorBanner message={runError} onDismiss={() => setRunError(null)} />
      </section>

      {result && <RunResult key={result.runId} result={result} />}
    </div>
  )
}

function RunResult({ result }: { result: AgentRunResponse }) {
  const [recommendations, setRecommendations] = useState(result.recommendations)
  return (
    <section className="card" aria-labelledby="result-heading">
      <header className="rec-header">
        <h2 id="result-heading">
          Run #{result.runId}: {result.agent}
        </h2>
        <div className="badge-row">
          <RiskBadge level={result.riskLevel} />
          <span className={`badge badge-run-${result.status.toLowerCase()}`}>{result.status}</span>
        </div>
      </header>

      <dl className="facts">
        <div>
          <dt>Provider</dt>
          <dd>{result.provider ?? '—'}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{result.model ?? '—'}</dd>
        </div>
        <div>
          <dt>Fallback used</dt>
          <dd>{result.fallbackUsed ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt>Finished</dt>
          <dd>{formatDateTime(result.finishedAt)}</dd>
        </div>
      </dl>

      {result.needsReview && (
        <div className="warning" role="note">
          <strong>Needs review:</strong> some figures could not be matched to the source data.
          {result.reviewNotes && <p className="review-notes">{result.reviewNotes}</p>}
        </div>
      )}

      <h3>Summary</h3>
      <p>{result.summary ?? 'No summary returned.'}</p>

      <h3>Recommendations created ({recommendations.length})</h3>
      {recommendations.length === 0 ? (
        <p className="muted">This run created no recommendations.</p>
      ) : (
        <>
          <p className="muted small">
            New recommendations start as PENDING. Review them here or on the <Link to="/recommendations">Recommendations</Link> page.
          </p>
          <div className="card-list">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onDecided={(updated) =>
                  setRecommendations((list) => list.map((r) => (r.id === updated.id ? updated : r)))
                }
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
