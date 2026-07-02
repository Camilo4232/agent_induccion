import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useStore from '../store/useStore'
import { missionsAPI } from '../services/api'
import LangSwitcher from '../components/LangSwitcher'
import { MissionStatusBadge } from './Missions'

const ACTIVE_STATUSES = ['planning', 'running', 'reviewing']
const POLL_MS = 2500

/* ─── Estados de tarea: color + etiqueta ─── */
const TASK_STATUS = {
  pending:     { color: '#8a8580', bg: 'rgba(255, 255, 255, 0.06)' },
  in_progress: { color: '#d4a853', bg: 'rgba(201, 146, 61, 0.16)', pulse: true },
  review:      { color: '#a394e8', bg: 'rgba(139, 127, 214, 0.18)' },
  rejected:    { color: '#d08a4a', bg: 'rgba(201, 146, 61, 0.14)' },
  approved:    { color: '#5cb884', bg: 'rgba(45, 138, 82, 0.18)' },
  failed:      { color: '#d05a4a', bg: 'rgba(184, 57, 42, 0.16)' },
}

function taskStatusLabel(status, t) {
  const defaults = {
    pending: 'Pendiente',
    in_progress: 'En curso',
    review: 'En revisión',
    rejected: 'Rechazada',
    approved: 'Aprobada',
    failed: 'Fallida',
  }
  return t(`missionDetail.taskStatus.${status}`, defaults[status] || status)
}

function TaskStatusBadge({ status }) {
  const { t } = useTranslation()
  const cfg = TASK_STATUS[status] || { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.06)' }
  return (
    <span
      className="badge"
      style={{ background: cfg.bg, color: cfg.color, gap: 6, flexShrink: 0, transition: 'background 0.3s, color 0.3s' }}
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
      {taskStatusLabel(status, t)}
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

function formatClock(iso, lang) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString(lang, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return ''
  }
}

/* ─── Cronología: parseo defensivo del payload ─── */
function parsePayload(payload) {
  if (!payload) return {}
  if (typeof payload === 'object') return payload
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload)
      return typeof parsed === 'object' && parsed !== null ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function payloadName(p) {
  return p.agent_name || p.name || p.hired_name || null
}

function payloadTitle(p) {
  return p.task_title || p.title || null
}

/* Icono + texto legible por tipo de evento */
function describeEvent(event, t) {
  const p = parsePayload(event.payload)
  const name = payloadName(p)
  const title = payloadTitle(p)
  const type = event.type || ''

  const KNOWN = {
    mission_created: {
      icon: '◇', color: '#7fa8c9',
      text: () => t('missionDetail.events.missionCreated', 'Misión creada'),
    },
    planning_started: {
      icon: '◇', color: '#7fa8c9',
      text: () => t('missionDetail.events.planningStarted', 'El manager comenzó a planificar la misión'),
    },
    planning_completed: {
      icon: '◇', color: '#7fa8c9',
      text: () => t('missionDetail.events.planningCompleted', 'Plan de trabajo listo'),
    },
    agent_hired: {
      icon: '+', color: 'var(--gold-400)',
      text: () => name
        ? t('missionDetail.events.agentHired', 'Se contrató a {{name}} para esta misión', { name })
        : t('missionDetail.events.agentHiredAnon', 'Se contrató un nuevo agente para esta misión'),
    },
    task_created: {
      icon: '▸', color: '#8a8580',
      text: () => title
        ? t('missionDetail.events.taskCreated', 'Tarea creada: {{title}}', { title })
        : t('missionDetail.events.taskCreatedAnon', 'Tarea creada'),
    },
    task_started: {
      icon: '▸', color: '#d4a853',
      text: () => name
        ? t('missionDetail.events.taskStarted', '{{name}} comenzó a trabajar en su tarea', { name })
        : t('missionDetail.events.taskStartedAnon', 'Una tarea entró en ejecución'),
    },
    task_completed: {
      icon: '✓', color: '#d4a853',
      text: () => t('missionDetail.events.taskCompleted', 'Tarea terminada, lista para revisión'),
    },
    review_started: {
      icon: '≡', color: '#a394e8',
      text: () => t('missionDetail.events.reviewStarted', 'La revisora está evaluando el trabajo'),
    },
    task_approved: {
      icon: '✓', color: '#5cb884',
      text: () => title
        ? t('missionDetail.events.taskApproved', 'La revisora aprobó la tarea: {{title}}', { title })
        : t('missionDetail.events.taskApprovedAnon', 'La revisora aprobó la tarea'),
    },
    task_rejected: {
      icon: '↺', color: '#d08a4a',
      text: () => title
        ? t('missionDetail.events.taskRejected', 'La revisora rechazó la tarea con feedback: {{title}}', { title })
        : t('missionDetail.events.taskRejectedAnon', 'La revisora rechazó la tarea con feedback'),
    },
    task_retried: {
      icon: '↺', color: '#d08a4a',
      text: () => t('missionDetail.events.taskRetried', 'Reintentando la tarea con el feedback recibido'),
    },
    task_failed: {
      icon: '✕', color: '#d05a4a',
      text: () => title
        ? t('missionDetail.events.taskFailed', 'La tarea falló: {{title}}', { title })
        : t('missionDetail.events.taskFailedAnon', 'Una tarea falló'),
    },
    synthesis_started: {
      icon: '≡', color: 'var(--gold-400)',
      text: () => t('missionDetail.events.synthesisStarted', 'El manager está preparando el entregable final'),
    },
    mission_completed: {
      icon: '✓', color: '#5cb884',
      text: () => t('missionDetail.events.missionCompleted', 'Misión completada'),
    },
    mission_failed: {
      icon: '✕', color: '#d05a4a',
      text: () => t('missionDetail.events.missionFailed', 'La misión falló'),
    },
    mission_cancelled: {
      icon: '✕', color: '#8a8580',
      text: () => t('missionDetail.events.missionCancelled', 'Misión cancelada'),
    },
  }

  const known = KNOWN[type]
  if (known) return { icon: known.icon, color: known.color, text: known.text() }

  // Fallback legible para tipos no mapeados
  const humanized = type.replace(/[._-]+/g, ' ').trim() || t('missionDetail.events.unknown', 'Actividad de la misión')
  const extra = [name, title].filter(Boolean).join(' — ')
  return {
    icon: '·',
    color: '#8a8580',
    text: extra ? `${humanized}: ${extra}` : humanized,
  }
}

export default function MissionDetail() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useStore()

  const [mission, setMission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [toast, setToast] = useState(null)
  const hasData = useRef(false)
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const { data } = await missionsAPI.get(id)
      hasData.current = true
      setMission(data)
      setLoadError(false)
    } catch {
      // Un tropiezo del polling no borra lo ya cargado
      if (!hasData.current) setLoadError(true)
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [id])

  // Carga inicial (y si cambia el id)
  useEffect(() => {
    hasData.current = false
    setMission(null)
    setLoading(true)
    setLoadError(false)
    load()
  }, [id, load])

  // Polling cada 2.5s SOLO mientras la misión está activa; se detiene en estados terminales
  useEffect(() => {
    const status = mission?.status
    if (!status || !ACTIVE_STATUSES.includes(status)) return
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
  }, [mission?.status, load])

  function showToast(text, type = 'success') {
    setToast({ text, type, key: Date.now() })
  }

  async function handleCancel() {
    const ok = confirm(t('missionDetail.cancelConfirm', '¿Cancelar esta misión? Los agentes dejarán de trabajar en ella.'))
    if (!ok) return
    setCancelling(true)
    try {
      await missionsAPI.cancel(id)
      await load()
      showToast(t('missionDetail.cancelSuccess', 'Misión cancelada.'))
    } catch (err) {
      showToast(apiError(err, t('missionDetail.cancelError', 'No se pudo cancelar la misión.')), 'error')
    } finally {
      setCancelling(false)
    }
  }

  const isActive = mission ? ACTIVE_STATUSES.includes(mission.status) : false
  const tasks = [...(mission?.tasks || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  const events = [...(mission?.events || [])].sort(
    (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
  )
  const agents = mission?.agents || []

  return (
    <div className="app-shell">
      {/* Header — wordmark coherente con el resto de la app */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="wordmark">
            Segundo<span className="wordmark-dot" aria-hidden />
          </span>
          <span className="wordmark-tag">{t('missionDetail.tag', 'Misión')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangSwitcher compact />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user?.email}</span>
          <button
            onClick={() => navigate('/missions')}
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
            {t('missionDetail.backToMissions', 'Volver a misiones')}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('missionDetail.dashboardLink', 'Panel')}
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
          {/* Cargando */}
          {loading && !mission && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', padding: '3rem 0' }}>
              <span className="chat-typing">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {t('missionDetail.loading', 'Cargando misión…')}
              </span>
            </div>
          )}

          {/* Error de carga */}
          {!loading && loadError && !mission && (
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
                {t('missionDetail.loadError', 'No pudimos cargar esta misión. Revisa tu conexión e intenta de nuevo.')}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={load} style={{ fontSize: 12, padding: '6px 14px' }}>
                  {t('missionDetail.retry', 'Reintentar')}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => navigate('/missions')}
                  style={{ fontSize: 12, padding: '6px 14px' }}
                >
                  {t('missionDetail.backToMissions', 'Volver a misiones')}
                </button>
              </div>
            </div>
          )}

          {mission && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {/* ─── Cabecera de la misión ─── */}
              <div className="card" style={{ padding: '1.4rem 1.5rem', marginBottom: '1.5rem', transition: 'border-color 0.4s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h1
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '1.5rem',
                          fontWeight: 400,
                          color: 'var(--text-primary)',
                          letterSpacing: '-0.005em',
                          lineHeight: 1.25,
                        }}
                      >
                        {mission.title || t('missionDetail.untitled', 'Misión sin título')}
                      </h1>
                      <MissionStatusBadge status={mission.status} />
                    </div>
                    {mission.objective && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {mission.objective}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, opacity: 0.8 }}>
                      {t('missionDetail.createdAt', 'Creada: {{when}}', { when: formatWhen(mission.created_at, i18n.language) })}
                      {mission.finished_at &&
                        ` · ${t('missionDetail.finishedAt', 'Finalizada: {{when}}', { when: formatWhen(mission.finished_at, i18n.language) })}`}
                    </p>
                  </div>
                  {isActive && (
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="btn-secondary"
                      style={{
                        fontSize: 12,
                        padding: '7px 16px',
                        color: '#d05a4a',
                        borderColor: 'rgba(184, 57, 42, 0.4)',
                        flexShrink: 0,
                      }}
                    >
                      {cancelling
                        ? t('missionDetail.cancelling', 'Cancelando…')
                        : t('missionDetail.cancelCta', 'Cancelar misión')}
                    </button>
                  )}
                </div>
                {isActive && (
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--gold-400)',
                        animation: 'pulse-dot 1.4s ease-in-out infinite',
                      }}
                    />
                    {t('missionDetail.liveHint', 'Tu equipo está trabajando. Esta página se actualiza sola.')}
                  </p>
                )}
              </div>

              {/* ─── Entregable final / error ─── */}
              <AnimatePresence>
                {mission.status === 'completed' && mission.result_summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="card"
                    style={{
                      marginBottom: '1.5rem',
                      padding: '1.5rem 1.6rem',
                      borderColor: 'rgba(212, 168, 83, 0.4)',
                      background: 'linear-gradient(160deg, rgba(198, 151, 64, 0.07), var(--bg-card) 55%)',
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '1.15rem',
                        fontWeight: 400,
                        color: 'var(--gold-400)',
                        marginBottom: 10,
                      }}
                    >
                      {t('missionDetail.deliverableTitle', 'Entregable final')}
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {mission.result_summary}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {mission.status === 'failed' && (
                <div
                  className="card"
                  style={{
                    marginBottom: '1.5rem',
                    borderColor: 'rgba(184, 57, 42, 0.35)',
                    background: 'rgba(184, 57, 42, 0.05)',
                  }}
                >
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 400, color: '#d05a4a', marginBottom: 8 }}>
                    {t('missionDetail.failedTitle', 'La misión no pudo completarse')}
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {mission.error || t('missionDetail.failedFallback', 'Ocurrió un error inesperado durante la ejecución.')}
                  </p>
                </div>
              )}

              {mission.status === 'cancelled' && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {t('missionDetail.cancelledNote', 'Esta misión fue cancelada. Las tareas quedaron como estaban en ese momento.')}
                  </p>
                </div>
              )}

              {/* ─── Equipo ─── */}
              {agents.length > 0 && (
                <section style={{ marginBottom: '1.75rem' }}>
                  <SectionTitle>{t('missionDetail.teamTitle', 'Equipo')}</SectionTitle>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {agents.map(agent => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 999,
                          padding: '6px 14px 6px 6px',
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: 'var(--accent-dim)',
                            color: 'var(--gold-400)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-serif)',
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                        >
                          {(agent.name || '?').trim().charAt(0).toUpperCase()}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                            {agent.name}
                          </span>
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                            {agent.role_title}
                          </span>
                        </span>
                        {agent.parent_agent_id != null && (
                          <span
                            className="badge"
                            style={{ background: 'var(--accent-dim)', color: 'var(--gold-400)', flexShrink: 0 }}
                          >
                            {t('missionDetail.hiredForMission', 'Contratado para esta misión')}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* ─── Tareas ─── */}
              <section style={{ marginBottom: '1.75rem' }}>
                <SectionTitle>{t('missionDetail.tasksTitle', 'Tareas')}</SectionTitle>
                {tasks.length === 0 ? (
                  <div className="card">
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {mission.status === 'planning'
                        ? t('missionDetail.tasksPlanning', 'El manager está descomponiendo la misión en tareas…')
                        : t('missionDetail.tasksEmpty', 'Esta misión no tiene tareas registradas.')}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {tasks.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </section>

              {/* ─── Cronología ─── */}
              {events.length > 0 && (
                <section style={{ marginBottom: '1.75rem' }}>
                  <SectionTitle>{t('missionDetail.timelineTitle', 'Cronología')}</SectionTitle>
                  <div className="card" style={{ padding: '1.1rem 1.3rem' }}>
                    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {events.map((event, i) => (
                        <TimelineRow
                          key={event.id ?? i}
                          event={event}
                          isLast={i === events.length - 1}
                          lang={i18n.language}
                        />
                      ))}
                    </ol>
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1300,
              padding: '10px 18px',
              borderRadius: 999,
              background: 'var(--bg-card)',
              border: `1px solid ${toast.type === 'error' ? 'rgba(184, 57, 42, 0.5)' : 'var(--border-strong)'}`,
              color: toast.type === 'error' ? '#d05a4a' : 'var(--text-primary)',
              fontSize: 13,
              boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
              maxWidth: 'min(90vw, 480px)',
            }}
          >
            <ToastAutoDismiss onDone={() => setToast(null)} dep={toast.key} />
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToastAutoDismiss({ onDone, dep }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3500)
    return () => clearTimeout(id)
  }, [dep]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function SectionTitle({ children }) {
  return (
    <h2
      style={{
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        marginBottom: 12,
      }}
    >
      {children}
    </h2>
  )
}

/* ─── Tarjeta de tarea ─── */
function TaskCard({ task }) {
  const { t } = useTranslation()
  const [showDescription, setShowDescription] = useState(false)
  const isRejected = task.status === 'rejected'

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card"
      style={{
        borderColor: isRejected ? 'rgba(201, 146, 61, 0.55)' : undefined,
        transition: 'border-color 0.4s, background 0.4s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 16,
              fontWeight: 400,
              color: 'var(--text-primary)',
              letterSpacing: '-0.005em',
              lineHeight: 1.3,
            }}
          >
            {task.title}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {task.agent_name
              ? t('missionDetail.taskAgent', 'A cargo de {{name}}', { name: task.agent_name })
              : t('missionDetail.taskUnassigned', 'Sin agente asignado')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {task.attempts > 1 && (
            <span
              className="badge"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
              title={t('missionDetail.attemptsHint', 'Veces que se ha intentado esta tarea')}
            >
              ↺ {t('missionDetail.attempts', '{{count}} intentos', { count: task.attempts })}
            </span>
          )}
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      {/* Descripción colapsable */}
      {task.description && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setShowDescription(s => !s)}
            aria-expanded={showDescription}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 12,
              color: 'var(--gold-400)',
              cursor: 'pointer',
            }}
          >
            {showDescription
              ? t('missionDetail.hideDescription', 'Ocultar descripción')
              : t('missionDetail.showDescription', 'Ver descripción')}
          </button>
          <AnimatePresence initial={false}>
            {showDescription && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                  marginTop: 6,
                }}
              >
                {task.description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Feedback de la revisora */}
      {task.review_notes && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 8,
            borderLeft: '3px solid var(--warning)',
            background: 'rgba(201, 146, 61, 0.08)',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--warning)', marginBottom: 4 }}>
            {t('missionDetail.reviewerFeedback', 'Feedback de la revisora')}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {task.review_notes}
          </p>
        </div>
      )}

      {/* Resultado de la tarea */}
      {task.output && (
        <div
          style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 8,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>
            {t('missionDetail.taskOutput', 'Resultado')}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {task.output}
          </p>
        </div>
      )}
    </motion.div>
  )
}

/* ─── Fila de la cronología ─── */
function TimelineRow({ event, isLast, lang }) {
  const { t } = useTranslation()
  const { icon, color, text } = describeEvent(event, t)

  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: 'flex', gap: 12, position: 'relative' }}
    >
      {/* Riel vertical + icono */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <span
          aria-hidden
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            color,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
        {!isLast && <span aria-hidden style={{ width: 1, flex: 1, background: 'var(--border)', margin: '4px 0' }} />}
      </div>

      {/* Texto + hora */}
      <div style={{ paddingBottom: isLast ? 0 : 16, minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginTop: 4 }}>{text}</p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {formatClock(event.created_at, lang)}
        </p>
      </div>
    </motion.li>
  )
}
