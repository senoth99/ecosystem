import { useNavigate, Link } from 'react-router-dom'
import { AUTH_KEY } from '../../lib/constants'
import { colors } from '../../lib/theme'

export default function Header({ breadcrumbs = [] }) {
  const navigate = useNavigate()

  function logout() {
    sessionStorage.removeItem(AUTH_KEY)
    navigate('/login')
  }

  return (
    <header style={{
      borderBottom: `1px solid ${colors.border}`,
      background: colors.bg,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 16px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <Link to="/" style={{ flexShrink: 0 }}>
            <img src="/optimize.gif" alt="CASHER" style={{ height: '36px', objectFit: 'contain' }} />
          </Link>

          {breadcrumbs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ color: colors.mutedDark, fontSize: '14px' }}>/</span>
              {breadcrumbs.map((b, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  {i < breadcrumbs.length - 1 ? (
                    <>
                      <Link to={b.href} style={{
                        color: colors.muted,
                        fontSize: '13px',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '120px',
                      }}>{b.label}</Link>
                      <span style={{ color: colors.mutedDark, fontSize: '14px' }}>/</span>
                    </>
                  ) : (
                    <span style={{
                      color: colors.text,
                      fontSize: '13px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '160px',
                    }}>{b.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={logout}
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            fontSize: '11px',
            letterSpacing: '0.1em',
            padding: '6px 12px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ВЫХОД
        </button>
      </div>
    </header>
  )
}
