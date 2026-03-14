import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import useStore from '../store/useStore'

export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (next !== confirm) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    setLoading(true)
    try {
      await authAPI.changePassword(current, next)
      navigate(user?.role === 'owner' ? '/dashboard' : '/chat')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ visible }) => visible ? (
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
  )

  return (
    <div className="auth-shell">
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
            fontFamily: 'var(--font-serif)', fontSize: '2.4rem',
            lineHeight: 1.15, color: 'var(--text-primary)',
            marginBottom: '1rem', maxWidth: 320,
          }}>
            Un último<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>paso.</em>
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: 300 }}>
            Por seguridad, crea tu propia contraseña antes de empezar.
            La contraseña temporal que recibiste ya no funcionará después de este cambio.
          </p>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
          © 2026 Segundo · Para negocios reales en Latinoamérica
        </p>
      </div>

      <div className="auth-right">
        <div className="auth-form-box fade-in">
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Primer acceso
            </p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--text-primary)' }}>
              Crea tu contraseña
            </h1>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label className="field-label">Contraseña temporal</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="field-input"
                  type={showCurrent ? 'text' : 'password'}
                  value={current}
                  onChange={e => setCurrent(e.target.value)}
                  placeholder="La contraseña que te compartió el dueño"
                  required
                  autoFocus
                  style={{ paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                  <EyeIcon visible={showCurrent} />
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Nueva contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="field-input"
                  type={showNext ? 'text' : 'password'}
                  value={next}
                  onChange={e => setNext(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowNext(v => !v)} tabIndex={-1}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                  <EyeIcon visible={showNext} />
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Confirmar nueva contraseña</label>
              <input
                className="field-input"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la nueva contraseña"
                required
                minLength={6}
              />
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar y entrar →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
