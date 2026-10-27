import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Layout() {
  const { username, logout } = useAuth()
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <span className="brand">Mini Jarvis AI Agent</span>
          <nav aria-label="Main">
            <ul className="nav-list">
              <li>
                <NavLink to="/" end>
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/recommendations">Recommendations</NavLink>
              </li>
              <li>
                <NavLink to="/audit-log">Audit log</NavLink>
              </li>
            </ul>
          </nav>
          <div className="user-area">
            {username && <span className="muted">Signed in as {username}</span>}
            <button type="button" className="btn btn-secondary btn-small" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
