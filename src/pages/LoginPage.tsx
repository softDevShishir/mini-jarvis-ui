import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiRequestError, describeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ErrorBanner } from '../components/ErrorBanner'

const FEATURES = [
  {
    title: 'AI-powered recommendations',
    text: 'Agents analyse your data and surface clear, ranked suggestions.',
  },
  {
    title: 'You stay in control',
    text: 'Agents only advise. Every approval or rejection is your decision.',
  },
  {
    title: 'Full audit trail',
    text: 'Every review is logged so decisions are always traceable.',
  },
]

export function LoginPage() {
  const { login, isAuthenticated, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      <section className="login-hero" aria-hidden="true">
        <div className="login-brand">
          <span className="login-logo">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" strokeLinejoin="round" />
              <path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z" strokeLinejoin="round" />
            </svg>
          </span>
          Mini Jarvis
        </div>
        <div className="login-hero-body">
          <h2 className="login-hero-title">Smarter decisions, with a human in the loop.</h2>
          <ul className="login-features">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <span className="login-check">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <strong>{feature.title}</strong>
                  <p>{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="login-hero-footer">© {new Date().getFullYear()} Mini Jarvis AI Agent</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <header className="login-header">
            <h1 className="login-title">Welcome back</h1>
            <p className="muted">Sign in to Mini Jarvis AI Agent to review AI recommendations.</p>
          </header>
          {notice && (
            <div className="banner banner-info" role="status">
              {notice}
            </div>
          )}
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="Enter your username"
              required
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <ErrorBanner message={error} />
            <button type="submit" className="btn btn-primary btn-block login-submit" disabled={submitting}>
              {submitting && <span className="spinner spinner-light" aria-hidden="true" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="login-note small">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 018 0v4" />
            </svg>
            Your session is kept in memory only. Refreshing the page signs you out.
          </p>
        </div>
      </section>
    </main>
  )
}
