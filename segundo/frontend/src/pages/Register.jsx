import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import useStore from '../store/useStore'

export default function Register() {
  const [form, setForm] = useState({ business_name: '', name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { setAuth } = useStore()
  const navigate = useNavigate()

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authAPI.register(form)
      setAuth(
        { email: form.email, role: data.role, business_id: data.business_id, id: data.user_id },
        data.access_token,
      )
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg).join(', '))
      } else {
        setError(detail || 'Error al registrar')
      }
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
            Tu negocio aprende<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>contigo.</em>
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: 300, marginBottom: '2.5rem' }}>
            En 30 minutos entrenas al agente. Al día siguiente tu empleado nuevo trabaja solo.
          </p>

          <div style={{
            background: 'rgba(212,168,83,0.06)',
            border: '1px solid rgba(212,168,83,0.2)',
            borderRadius: 12,
            padding: '1.2rem',
            maxWidth: 320,
          }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
                ¿Cómo funciona el registro?
              </strong>
              Creas tu cuenta de dueño. Luego entrenas al agente con el conocimiento de tu negocio.
              Después invitas a tu equipo para que puedan consultarlo.
            </p>
          </div>
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
              Nuevo negocio
            </p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-primary)' }}>
              Registra tu negocio
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Estás creando una cuenta de <strong style={{ color: 'var(--accent)' }}>dueño</strong>.
              Después podrás invitar a tus empleados desde el panel.
            </p>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label className="field-label">Nombre del negocio</label>
              <input
                className="field-input"
                type="text"
                value={form.business_name}
                onChange={update('business_name')}
                placeholder="Ferretería El Tornillo"
                required
                autoFocus
              />
            </div>
            <div className="field-group">
              <label className="field-label">Tu nombre</label>
              <input
                className="field-input"
                type="text"
                value={form.name}
                onChange={update('name')}
                placeholder="Carlos López"
                required
              />
            </div>
            <div className="field-group">
              <label className="field-label">Email</label>
              <input
                className="field-input"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="carlos@negocio.com"
                required
              />
            </div>
            <div className="field-group">
              <label className="field-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="field-input"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
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
                {loading ? 'Creando negocio...' : 'Crear negocio →'}
              </button>
            </div>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
            >
              Ingresar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
