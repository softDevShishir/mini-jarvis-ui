import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { describeError } from '../api/client'
import type { RecommendationDto, RecommendationStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorBanner } from '../components/ErrorBanner'
import { RecommendationCard } from '../components/RecommendationCard'

type Tab = RecommendationStatus | 'ALL'

const TABS: { id: Tab; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'ALL', label: 'All' },
]

export function RecommendationsPage() {
  const { api } = useAuth()
  const [tab, setTab] = useState<Tab>('PENDING')
  const [reloadCount, setReloadCount] = useState(0)
  // Key of the request the current items came from; while it differs, the list is loading.
  const [loaded, setLoaded] = useState<{ key: string; tab: Tab; items: RecommendationDto[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestKey = `${tab}:${reloadCount}`
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    let ignore = false
    api.getRecommendations(tab === 'ALL' ? undefined : tab).then(
      (items) => {
        if (ignore) return
        setLoaded({ key: requestKey, tab, items })
        setError(null)
      },
      (err) => {
        if (ignore) return
        setLoaded({ key: requestKey, tab, items: [] })
        setError(describeError(err))
      },
    )
    return () => {
      ignore = true
    }
  }, [api, tab, requestKey])

  const loading = loaded?.key !== requestKey
  const items = loading ? [] : loaded.items

  const handleDecided = useCallback(
    (updated: RecommendationDto) => {
      setLoaded((current) => {
        if (!current) return current
        const next =
          current.tab === 'PENDING'
            ? current.items.filter((r) => r.id !== updated.id)
            : current.items.map((r) => (r.id === updated.id ? updated : r))
        return { ...current, items: next }
      })
    },
    [],
  )

  function selectTab(index: number) {
    const next = TABS[(index + TABS.length) % TABS.length]
    setTab(next.id)
    tabRefs.current[(index + TABS.length) % TABS.length]?.focus()
  }

  function handleTabKey(event: KeyboardEvent, index: number) {
    if (event.key === 'ArrowRight') selectTab(index + 1)
    else if (event.key === 'ArrowLeft') selectTab(index - 1)
    else if (event.key === 'Home') selectTab(0)
    else if (event.key === 'End') selectTab(TABS.length - 1)
    else return
    event.preventDefault()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Recommendations</h1>
        <button type="button" className="btn btn-secondary" onClick={() => setReloadCount((n) => n + 1)}>
          Refresh
        </button>
      </div>
      <p className="lead muted">
        Approving or rejecting only records your decision in the audit log. Nothing is executed automatically; you
        carry out any action yourself.
      </p>

      <div role="tablist" aria-label="Filter by status" className="tabs">
        {TABS.map((t, index) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="rec-panel"
            tabIndex={tab === t.id ? 0 : -1}
            className="tab"
            onClick={() => setTab(t.id)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="rec-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} aria-busy={loading}>
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        {loading && <p className="muted">Loading recommendations…</p>}
        {!loading && !error && items.length === 0 && (
          <p className="empty muted">No {tab === 'ALL' ? '' : tab.toLowerCase() + ' '}recommendations.</p>
        )}
        <div className="card-list">
          {items.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} onDecided={handleDecided} />
          ))}
        </div>
      </div>
    </div>
  )
}
