import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import useStore from '../store/useStore'

const DEMO_ACCOUNTS = [
  { role: 'owner',    label: 'Entrar como Dueño',    hint: 'Enseña, gestiona, invita empleados',  route: '/dashboard' },
  { role: 'employee', label: 'Entrar como Empleado',  hint: 'Consulta el manual del negocio',       route: '/chat' },
]

const FACTS = [
  { icon: '⏱', text: 'Ahorras 3–5 días de capacitación por cada empleado nuevo.' },
  { icon: '🧠', text: 'El conocimiento de tu negocio deja de vivir solo en tu cabeza.' },
  { icon: '📡', text: 'Tu equipo encuentra respuestas sin interrumpirte.' },
  { icon: '🔄', text: 'El manual se actualiza solo con cada conversación.' },
]

export default function Login() {
  const [identifier, setIdentifier] = useState('')  // email o teléfono
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetStep, setResetStep] = useState('request')
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const { setAuth } = useStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const isPhone = identifier.startsWith('+') || /^\d{7,}$/.test(identifier.replace(/\s/g, ''))
      const payload = isPhone
        ? { phone: identifier.replace(/\s/g, ''), password }
        : { email: identifier, password }
      const { data } = await authAPI.login(payload)
      setAuth(
        { email: identifier, role: data.role, business_id: data.business_id, id: data.user_id },
        data.access_token,
      )
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
      if (data.must_change_password) {
        navigate('/change-password')
      } else {
        navigate(data.role === 'owner' ? '/dashboard' : '/chat')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  async function handleDemo(role, route) {
    setError('')
    setDemoLoading(role)
    try {
      const { data } = await authAPI.demoLogin(role)
      setAuth(
        { email: data.role === 'owner' ? 'demo@segundo.app' : 'empleado@segundo.app',
          role: data.role, business_id: data.business_id, id: data.user_id },
        data.access_token,
      )
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
      navigate(route)
    } catch (err) {
      setError('No se pudo iniciar el modo demo. Intenta de nuevo.')
    } finally {
      setDemoLoading(null)
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault()
    setError('')
    setResetMessage('')
    setLoading(true)
    try {
      const isPhone = resetEmail.startsWith('+') || /^\d{7,}$/.test(resetEmail.replace(/\s/g, ''))
      const payload = isPhone
        ? { phone: resetEmail.replace(/\s/g, '') }
        : { email: resetEmail }
      await authAPI.forgotPassword(payload)
      setResetMessage('Código enviado. Revisa tu email o mensajes.')
      setResetStep('verify')
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo enviar el código. Verifica tus datos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault()
    setError('')
    setResetMessage('')
    setLoading(true)
    try {
      const isPhone = resetEmail.startsWith('+') || /^\d{7,}$/.test(resetEmail.replace(/\s/g, ''))
      const payload = {
        ...(isPhone ? { phone: resetEmail.replace(/\s/g, '') } : { email: resetEmail }),
        code: resetCode,
        new_password: newPassword,
      }
      await authAPI.resetPassword(payload)
      setResetMessage('Contraseña actualizada correctamente.')
      setResetCode('')
      setNewPassword('')
      setTimeout(() => {
        setForgotMode(false)
        setResetStep('request')
        setResetMessage('')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo cambiar la contraseña. Verifica el código.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      {/* ── Left panel ── */}
      <div className="auth-left">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#0e0e0e', fontFamily: 'var(--font-serif)',
            }}>S</div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              Segundo
            </span>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2.4rem',
            lineHeight: 1.15,
            color: 'var(--text-primary)',
            marginBottom: '1rem',
            maxWidth: 320,
          }}>
            El colega que<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>nunca renuncia.</em>
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: 300 }}>
            El sistema de onboarding para negocios de 3 a 15 empleados que convierte tu experiencia en un activo permanente.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FACTS.map((f, i) => (
            <div
              key={i}
              className="testimonial-card"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{f.icon}</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                  {f.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
          © 2026 Segundo · Para negocios reales en Latinoamérica
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-form-box fade-in">
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Acceso al sistema
            </p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-primary)' }}>
              Bienvenido de vuelta
            </h1>
          </div>

          {/* Demo access */}
          <div style={{
            background: 'rgba(212,168,83,0.05)', border: '1px solid rgba(212,168,83,0.18)',
            borderRadius: 10, padding: '1rem', marginBottom: '1.5rem',
          }}>
            <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              ✦ Acceso de demostración
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleDemo(acc.role, acc.route)}
                  disabled={!!demoLoading}
                  style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', transition: 'border-color 0.15s',
                    opacity: demoLoading && demoLoading !== acc.role ? 0.5 : 1,
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>
                      {demoLoading === acc.role ? 'Ingresando...' : acc.label}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{acc.hint}</p>
                  </div>
                  <span style={{ color: 'var(--accent)', fontSize: 16 }}>→</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="alert-error">{error}</div>}
          {resetMessage && <div className="alert-success">{resetMessage}</div>}

          {!forgotMode ? (
            <>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem' }}>
                — o ingresa con tu cuenta —
              </p>

              <form onSubmit={handleSubmit}>
                <div className="field-group">
                  <label className="field-label">Email o teléfono</label>
                  <input
                    className="field-input"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="tu@negocio.com o +52 55 1234 5678"
                    required
                    autoFocus
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="field-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: 0, lineHeight: 1,
                      }}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? 'Verificando...' : 'Ingresar →'}
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                    El sistema detecta automáticamente si eres dueño o empleado.
                  </p>
                </div>
              </form>

              <button
                type="button"
                onClick={() => { setForgotMode(true); setError(''); setResetMessage('') }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 12, marginTop: 12,
                  display: 'block', textAlign: 'center', width: '100%',
                  textDecoration: 'underline', textUnderlineOffset: '3px',
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem' }}>
                — recuperar contraseña —
              </p>

              {resetStep === 'request' ? (
                <form onSubmit={handleForgotSubmit}>
                  <div className="field-group">
                    <label className="field-label">Email o teléfono</label>
                    <input
                      className="field-input"
                      type="text"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="tu@negocio.com o +52 55 1234 5678"
                      required
                      autoFocus
                    />
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <button className="btn-primary" type="submit" disabled={loading}>
                      {loading ? 'Enviando...' : 'Enviar código'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit}>
                  <div className="field-group">
                    <label className="field-label">Código de verificación</label>
                    <input
                      className="field-input"
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Nueva contraseña</label>
                    <input
                      className="field-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <button className="btn-primary" type="submit" disabled={loading}>
                      {loading ? 'Cambiando...' : 'Cambiar contraseña'}
                    </button>
                  </div>
                </form>
              )}

              <button
                type="button"
                onClick={() => { setForgotMode(false); setResetStep('request'); setError(''); setResetMessage('') }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 12, marginTop: 16,
                  display: 'block', textAlign: 'center', width: '100%',
                }}
              >
                ← Volver al login
              </button>
            </>
          )}

          <div className="divider" />

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
            ¿Primera vez?{' '}
            <Link
              to="/register"
              style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
            >
              Registra tu negocio
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
