import { useLocation, useNavigate, Link } from 'react-router-dom'
import { AUTH_KEY } from '../../lib/constants'
import { colors } from '../../lib/theme'

function tabClassName(active) {
  return `app-shell-tab${active ? ' app-shell-tab--active' : ''}`
}

export default function AppShell({ title, tabs, children, actions }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const dropMatch = location.pathname.match(/^\/drops\/([^/]+)/)
  const dropId = dropMatch?.[1]
  const isItem = location.pathname.includes('/items/')

  function logout() {
    sessionStorage.removeItem(AUTH_KEY)
    navigate('/login')
  }

  const navTabs = tabs ?? []

  const shellVars = {
    '--shell-tab-muted': colors.muted,
    '--shell-tab-text': colors.text,
    '--shell-tab-accent-line': colors.accentBright,
  }

  return (
    <div
      className="app-shell-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.bg,
        ...shellVars,
      }}
    >
      <header style={{ borderBottom: `1px solid ${colors.border}`, background: colors.bg, flexShrink: 0 }}>
        <div className="app-shell-header-grid">
          <nav className="app-shell-nav" style={{ justifySelf: 'start' }}>
            {navTabs.length > 0 ? navTabs.map((tab, i) => (
              <Link key={i} to={tab.href} className={tabClassName(tab.active)}>{tab.label}</Link>
            )) : (
              <>
                <Link to="/" className={tabClassName(isHome && !dropId)}>ДРОПЫ</Link>
                {dropId && !isItem && <Link to={`/drops/${dropId}`} className={tabClassName(true)}>ДРОП</Link>}
                {isItem && <span className={tabClassName(true)}>ПОЗИЦИЯ</span>}
              </>
            )}
          </nav>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="app-shell-icon-btn"
            style={{
              background: colors.bg,
              border: `1px solid ${colors.bg}`,
              cursor: 'pointer',
              justifySelf: 'center',
            }}
            title="На главную"
          >
            <img
              src="/optimize.gif"
              alt="CASHER"
              style={{ height: '40px', objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'end', gap: '8px' }}>
            <button
              type="button"
              onClick={logout}
              title="Выход"
              className="app-shell-icon-btn"
              style={{ background: colors.bg, border: `1px solid ${colors.bg}`, color: colors.muted, cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="app-shell-title-row">
        <h1 className="app-shell-title" style={{ color: colors.text }}>{title}</h1>
        {actions && <div className="app-shell-actions">{actions}</div>}
      </div>

      <main className="app-shell-main" style={{ color: colors.text }}>{children}</main>
    </div>
  )
}
