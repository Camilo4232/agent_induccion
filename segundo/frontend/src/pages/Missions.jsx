import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useStore from '../store/useStore'
import { missionsAPI } from '../services/api'
import LangSwitcher from '../components/LangSwitcher'

/* ─── Estados de misión: color + etiqueta ─── */
const MISSION_STATUS = {
  planning:  { color: '#7fa8c9', bg: 'rgba(90, 138, 168, 0.16)' },
  running:   { color: '#d4a853', bg: 'rgba(201, 146, 61, 0.16)', pulse: true },
  reviewing: { color: '#a394e8', bg: 'rgba(139, 127, 214, 0.18)' },
  completed: { color: '#5cb884', bg: 'rgba(45, 138, 82, 0.18)' },
  failed:    { color: '#d05a4a', bg: 'rgba(184, 57, 42, 0.16)' },
  cancelled: { color: '#8a8580', bg: 'rgba(255, 255, 255, 0.06)' },
}

function statusLabel(status, t) {
  const defaults = {
    planning: 'Planificando',
    running: 'En marcha',
    reviewing: 'En revisión',
    completed: 'Completada',
    failed: 'Fallida',
    cancelled: 'Cancelada',
  }
  return t(`missions.status.${status}`, defaults[status] || status)
}

export function MissionStatusBadge({ status }) {
  const { t } = useTranslation()
  const cfg = MISSION_STATUS[status] || { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.06)' }
  return (
    <span
      className="badge"
      style={{
        background: cfg.bg,
        color: cfg.color,
        gap: 6,
        flexShrink: 0,
        transition: 'background 0.3s, color 0.3s',
      }}
    >
      {cfg.pulse && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            animation: 'pulse-dot 1.4s ease-in-out infinite',
          }}
        />
      )}
      {statusLabel(status, t)}
    </span>
  )
}

function apiError(err, fallback) {
  const detail = err?.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

function formatWhen(iso, lang) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(lang, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function Missions() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useStore()

  const [objective, setObjective] = useState('')
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState('')
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => { loadMissions() }, [])

  async function loadMissions() {
    setLoading(true)
    setLoadError(false)
    try {
      const { data } = await missionsAPI.list()
      const list = Array.isArray(data) ? data : data?.missions || []
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      setMissions(list)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleLaunch(e) {
    e.preventDefault()
    const text = objective.trim()
    if (!text || launching) return
    setLaunching(true)
    setLaunchError('')
    try {
      const { data } = await missionsAPI.create(text)
      if (data?.id) {
        navigate(`/missions/${data.id}`)
      } else {
        setObjective('')
        setLaunching(false)
        loadMissions()
      }
    } catch (err) {
      setLaunchError(apiError(err, t('missions.launchError', 'No se pudo lanzar la misión. Intenta de nuevo.')))
      setLaunching(false)
    }
  }

  return (
    <div className="app-shell">
      {/* Header — wordmark coherente con el resto de la app */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="wordmark">
            Segundo<span className="wordmark-dot" aria-hidden />
          </span>
          <span className="wordmark-tag">{t('missions.tag', 'Misiones')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangSwitcher compact />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user?.email}</span>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              fontSize: 12,
              color: 'var(--text-primary)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              padding: '4px 12px',
              cursor: 'pointer',
            }}
          >
            {t('missions.backToDashboard', 'Volver al panel')}
          </button>
          <button
            onClick={() => navigate('/team')}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('missions.teamLink', 'Mi equipo')}
          </button>
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('common.exit', 'Salir')}
          </button>
        </div>
      </header>

      {/* Content */}
      <div id="main-content" style={{ flex: 1, overflow: 'auto', padding: '1.75rem' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          {/* Lanzador de misiones */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="card"
            style={{ padding: '1.4rem 1.5rem', marginBottom: '2rem' }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.45rem',
                fontWeight: 400,
                color: 'var(--text-primary)',
                letterSpacing: '-0.005em',
                marginBottom: 6,
              }}
            >
              {t('missions.launcher.title', '¿Qué necesitas que tu equipo resuelva?')}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              {t('missions.launcher.subtitle', 'Describe el objetivo. El manager armará el equipo, repartirá las tareas y te entregará el resultado.')}
            </p>
            <form onSubmit={handleLaunch}>
              <textarea
                className="teach-textarea"
                value={objective}
                onChange={e => setObjective(e.target.value)}
                placeholder={t('missions.launcher.placeholder', 'Ej. Prepara el plan de contratación del trimestre, audita los precios del catálogo, arma la campaña de fin de año…')}
                rows={4}
                disabled={launching}
                style={{ minHeight: 110 }}
              />
              {launchError && (
                <p role="alert" style={{ fontSize: 12, color: '#d05a4a', marginTop: 8 }}>
                  {launchError}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!objective.trim() || launching}
                  style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}
                >
                  {launching
                    ? t('missions.launcher.launching', 'Lanzando misión…')
                    : t('missions.launcher.launch', 'Lanzar misión')}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Lista de misiones */}
          <div className="section-header-v2">
            <div>
              <h2>{t('missions.listTitle', 'Tus misiones')}</h2>
              <p>{t('missions.listSubtitle', 'Sigue el avance de cada objetivo que le has encargado a tu equipo.')}</p>
            </div>
          </div>

          {/* Cargando */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', padding: '3rem 0' }}>
              <span className="chat-typing">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {t('missions.loading', 'Cargando misiones…')}
              </span>
            </div>
          )}

          {/* Error de carga */}
          {!loading && loadError && (
            <div
              className="card"
              style={{
                borderColor: 'rgba(184, 57, 42, 0.35)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {t('missions.loadError', 'No pudimos cargar tus misiones. Revisa tu conexión e intenta de nuevo.')}
              </p>
              <button className="btn-secondary" onClick={loadMissions} style={{ fontSize: 12, padding: '6px 14px' }}>
                {t('missions.retry', 'Reintentar')}
              </button>
            </div>
          )}

          {/* Estado vacío */}
          {!loading && !loadError && missions.length === 0 && (
            <motion.div
              className="empty-state-v2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="es-mark">◇</div>
              <div className="es-title">{t('missions.emptyTitle', 'Todavía no has lanzado ninguna misión')}</div>
              <p className="es-body">
                {t('missions.emptyBody', 'Escribe arriba lo que necesitas y tu equipo de agentes se pondrá a trabajar. Verás el avance aquí en tiempo real.')}
              </p>
            </motion.div>
          )}

          {/* Tarjetas de misiones */}
          {!loading && !loadError && missions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {missions.map((m, i) => (
                <motion.button
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                  whileHover={{ y: -2 }}
                  onClick={() => navigate(`/missions/${m.id}`)}
                  className="card"
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 16,
                        fontWeight: 400,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.005em',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.title || m.objective || t('missions.untitled', 'Misión sin título')}
                    </h3>
                    {m.title && m.objective && (
                      <p
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          marginTop: 3,
                          lineHeight: 1.45,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {m.objective}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5, opacity: 0.8 }}>
                      {formatWhen(m.created_at, i18n.language)}
                    </p>
                  </div>
                  <MissionStatusBadge status={m.status} />
                  <span aria-hidden style={{ color: 'var(--text-secondary)', fontSize: 14, flexShrink: 0 }}>›</span>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
