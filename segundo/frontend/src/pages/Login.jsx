import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, Trans } from 'react-i18next'
import { authAPI } from '../services/api'
import useStore from '../store/useStore'
import GlassInput from '../components/GlassInput'
import MagneticButton from '../components/MagneticButton'
import LangSwitcher from '../components/LangSwitcher'

const MobiusBackground = lazy(() => import('../components/MobiusBackground'))

export default function Login() {
  const { t } = useTranslation()
  const [identifier, setIdentifier] = useState('')
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
  const [activeFact, setActiveFact] = useState(0)
  const { setAuth } = useStore()
  const navigate = useNavigate()

  const FACT_ICONS = ['⏱', '🧠', '📡', '🔄']
  const facts = FACT_ICONS.map((icon, i) => ({ icon, text: t(`auth.facts.${i}`) }))

  const DEMO_ACCOUNTS = [
    { role: 'owner',    label: t('auth.demoOwner'),    hint: t('auth.demoOwnerHint'),    route: '/dashboard' },
    { role: 'employee', label: t('auth.demoEmployee'), hint: t('auth.demoEmployeeHint'), route: '/chat' },
  ]

  useEffect(() => {
    const id = setInterval(() => setActiveFact((i) => (i + 1) % facts.length), 3000)
    return () => clearInterval(id)
  }, [facts.length])

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
      setError(err.response?.data?.detail || t('auth.loginErrors.invalidCredentials'))
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
      setError(t('auth.loginErrors.demoFailed'))
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
      setResetMessage(t('auth.loginErrors.codeSent'))
      setResetStep('verify')
    } catch (err) {
      setError(err.response?.data?.detail || t('auth.loginErrors.sendCodeFailed'))
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
      setResetMessage(t('auth.loginErrors.passwordUpdated'))
      setResetCode('')
      setNewPassword('')
      setTimeout(() => {
        setForgotMode(false)
        setResetStep('request')
        setResetMessage('')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || t('auth.loginErrors.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  const eyeIcon = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', padding: 0, lineHeight: 1, zIndex: 3,
      }}
      tabIndex={-1}
      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
  )

  return (
    <div className="auth-shell">
      {/* ── Left panel ── */}
      <div className="auth-left auth-left--stage">
        <Suspense fallback={null}>
          <MobiusBackground />
        </Suspense>

        <div className="auth-left-content">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3rem' }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: '#0e0e0e', fontFamily: 'var(--font-serif)',
                boxShadow: '0 8px 24px rgba(212, 168, 83, 0.35)',
              }}>S</div>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                Segundo
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.6rem',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                maxWidth: 360,
              }}
            >
              {t('auth.headlineLogin1')}<br />
              <em className="accent-underline" style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
                {t('auth.headlineLogin2')}
              </em>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: 320 }}
            >
              {t('auth.tagline')}
            </motion.p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {facts.map((f, i) => (
              <motion.div
                key={i}
                className={`fact-card ${i === activeFact ? 'is-active' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{f.icon}</span>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                    {f.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            style={{ color: 'var(--text-muted)', fontSize: '11px' }}
          >
            {t('auth.footer')}
          </motion.p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right auth-right--glass">
        <motion.div
          className="auth-form-glass"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <LangSwitcher compact />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              {t('auth.loginEyebrow')}
            </p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', color: 'var(--text-primary)' }}>
              {t('auth.loginTitle')}
            </h1>
          </div>

          {/* Demo access */}
          <div className="demo-card">
            <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              ✦ {t('auth.demoTitle')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <motion.button
                  key={acc.role}
                  type="button"
                  onClick={() => handleDemo(acc.role, acc.route)}
                  disabled={!!demoLoading}
                  className="demo-btn"
                  whileTap={{ scale: 0.98 }}
                  style={{
                    opacity: demoLoading && demoLoading !== acc.role ? 0.5 : 1,
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>
                      {demoLoading === acc.role ? t('auth.demoLoading') : acc.label}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{acc.hint}</p>
                  </div>
                  <span className="demo-btn-arrow">→</span>
                </motion.button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="alert-error"
              >
                {error}
              </motion.div>
            )}
            {resetMessage && (
              <motion.div
                key="ok"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="alert-success"
              >
                {resetMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!forgotMode ? (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.2rem' }}>
                  {t('auth.orWithAccount')}
                </p>

                <form onSubmit={handleSubmit}>
                  <GlassInput
                    label={t('auth.identifierLabel')}
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={t('auth.identifierPlaceholder')}
                    required
                  />
                  <div style={{ position: 'relative' }}>
                    <GlassInput
                      label={t('auth.passwordLabel')}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                      suffix={eyeIcon}
                    />
                  </div>

                  <div style={{ marginTop: '1.5rem' }}>
                    <MagneticButton type="submit" loading={loading}>
                      <span>{loading ? '' : t('auth.submit')}</span>
                      {!loading && <span style={{ fontSize: 18 }}>→</span>}
                    </MagneticButton>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
                      {t('auth.autoDetectRole')}
                    </p>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setError(''); setResetMessage('') }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 12, marginTop: 14,
                    display: 'block', textAlign: 'center', width: '100%',
                    textDecoration: 'underline', textUnderlineOffset: '3px',
                  }}
                >
                  {t('auth.forgotPassword')}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="forgot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem' }}>
                  {t('auth.forgotEyebrow')}
                </p>

                {resetStep === 'request' ? (
                  <form onSubmit={handleForgotSubmit}>
                    <GlassInput
                      label={t('auth.identifierLabel')}
                      type="text"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder={t('auth.identifierPlaceholder')}
                      required
                    />
                    <div style={{ marginTop: '1.5rem' }}>
                      <MagneticButton type="submit" loading={loading}>
                        {loading ? '' : t('auth.sendCode')}
                      </MagneticButton>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetSubmit}>
                    <GlassInput
                      label={t('auth.verifyCodeLabel')}
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder={t('auth.verifyCodePlaceholder')}
                      maxLength={6}
                      required
                    />
                    <GlassInput
                      label={t('auth.newPasswordLabel')}
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                    />
                    <div style={{ marginTop: '1.5rem' }}>
                      <MagneticButton type="submit" loading={loading}>
                        {loading ? '' : t('auth.changePasswordSubmit')}
                      </MagneticButton>
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
                  {t('auth.backToLogin')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="divider" />

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {t('auth.noAccount')}{' '}
            <Link
              to="/register"
              style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
            >
              {t('auth.registerCta')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
