import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiRequestError, describeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ErrorBanner } from '../components/ErrorBanner'

export function LoginPage() {
  const { login, isAuthenticated, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated && !submitting) return <Navigate to={from} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.status === 401
          ? 'Invalid username or password.'
          : describeError(err),
      )
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="card login-card">
        <h1 className="login-title">Mini Jarvis AI Agent</h1>
        <p className="muted">Sign in to review AI recommendations. Agents only advise; every decision is yours.</p>
        {notice && (
          <div className="banner banner-info" role="status">
            {notice}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <ErrorBanner message={error} />
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted small">Your session is kept in memory only. Refreshing the page signs you out.</p>
      </div>
    </main>
  )
}
