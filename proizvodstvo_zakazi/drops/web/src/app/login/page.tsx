import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="login-shell">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/optimize.gif" alt="CASHER" className="mb-8 h-16 object-contain" style={{ height: 'clamp(48px, 12vw, 64px)' }} />
      <div className="card login-card">
        <p className="label-caps mb-6 text-center">Панель управления дропами</p>
        <LoginForm />
      </div>
    </div>
  )
}
