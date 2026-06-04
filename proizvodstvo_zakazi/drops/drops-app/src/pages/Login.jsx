import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PASSWORD, AUTH_KEY } from '../lib/constants'
import { colors, btnOutline } from '../lib/theme'

export default function Login() {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  function handleSubmit(e) {
    e.preventDefault()
    if (value === PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1')
      navigate(location.state?.from?.pathname || '/')
    } else {
      setError(true)
      setShake(true)
      setValue('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="login-shell">
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <img src="/optimize.gif" alt="CASHER" style={{ height: 'clamp(48px, 12vw, 64px)', objectFit: 'contain' }} />
      </div>

      <div className="card login-card">
        <p className="label-caps" style={{ marginBottom: '24px', textAlign: 'center' }}>
          Панель управления дропами
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ animation: shake ? 'shakeX 0.4s ease' : 'none' }}>
            <input
              type="password"
              placeholder="Пароль"
              value={value}
              onChange={e => { setValue(e.target.value); setError(false) }}
              autoFocus
              className="login-password-input"
              style={{
                borderColor: error ? colors.error : undefined,
              }}
            />
            {error && (
              <p style={{ color: colors.error, fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                Неверный пароль
              </p>
            )}
          </div>

          <button type="submit" style={{ ...btnOutline, marginTop: '16px', width: '100%' }}>
            ВОЙТИ
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}
