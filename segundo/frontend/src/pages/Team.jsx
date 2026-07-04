import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useStore from '../store/useStore'
import { agentsAPI } from '../services/api'
import LangSwitcher from '../components/LangSwitcher'

const DOMAIN_SCOPES = ['ventas', 'operaciones', 'clientes', 'general']

function scopeLabel(scope, t) {
  const defaults = {
    ventas: 'Ventas',
    operaciones: 'Operaciones',
    clientes: 'Clientes',
    general: 'General',
  }
  return t(`team.scopes.${scope}`, defaults[scope] || scope)
}

function apiError(err, fallback) {
  const detail = err?.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

export default function Team() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useStore()

  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [toast, setToast] = useState(null)
  const [showHire, setShowHire] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [chatAgent, setChatAgent] = useState(null)
  const [seeding, setSeeding] = useState(false)
  const [archivingId, setArchivingId] = useState(null)

  useEffect(() => { loadAgents() }, [])

  function showToast(text, type = 'success') {
    setToast({ text, type, key: Date.now() })
  }

  async function loadAgents() {
    setLoading(true)
    setLoadError(false)
    try {
      const { data } = await agentsAPI.list()
      const list = Array.isArray(data) ? data : data?.agents || []
      setAgents(list.filter(a => a.status !== 'archived'))
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      await agentsAPI.seed()
      showToast(t('team.seedSuccess', 'Tu equipo inicial está listo.'))
      await loadAgents()
    } catch (err) {
      showToast(apiError(err, t('team.seedError', 'No se pudo crear el equipo inicial. Intenta de nuevo.')), 'error')
    } finally {
      setSeeding(false)
    }
  }

  async function handleArchive(agent) {
    const ok = confirm(t(
      'team.archiveConfirm',
      '¿Archivar a {{name}}? Dejará de participar en misiones y conversaciones.',
      { name: agent.name }
    ))
    if (!ok) return
    setArchivingId(agent.id)
    try {
      await agentsAPI.archive(agent.id)
      setAgents(prev => prev.filter(a => a.id !== agent.id))
      showToast(t('team.archiveSuccess', 'Agente archivado.'))
    } catch (err) {
      showToast(apiError(err, t('team.archiveError', 'No se pudo archivar el agente.')), 'error')
    } finally {
      setArchivingId(null)
    }
  }

  function handleHired() {
    setShowHire(false)
    showToast(t('team.hireSuccess', 'Agente contratado y listo para trabajar.'))
    loadAgents()
  }

  function handleUpdated(updated) {
    setEditingAgent(null)
    setAgents(prev => prev.map(a => (a.id === updated.id ? { ...a, ...updated } : a)))
    showToast(t('team.updateSuccess', 'Agente actualizado.'))
  }

  // Jerarquía: raíces + subagentes anidados bajo su contratante
  const byParent = {}
  const roots = []
  for (const a of agents) {
    if (a.parent_agent_id && agents.some(p => p.id === a.parent_agent_id)) {
      if (!byParent[a.parent_agent_id]) byParent[a.parent_agent_id] = []
      byParent[a.parent_agent_id].push(a)
    } else {
      roots.push(a)
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
          <span className="wordmark-tag">{t('team.tag', 'Mi equipo')}</span>
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
            {t('team.backToDashboard', 'Volver al panel')}
          </button>
          <button
            onClick={() => navigate('/missions')}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('team.missionsLink', 'Misiones')}
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
          <div className="section-header-v2">
            <div>
              <h2>{t('team.title', 'Mi equipo de agentes')}</h2>
              <p>{t('team.subtitle', 'Contrata, edita y conversa con los agentes IA que trabajan para tu negocio.')}</p>
            </div>
            {!loading && !loadError && agents.length > 0 && (
              <button
                className="btn-primary"
                onClick={() => setShowHire(true)}
                style={{ width: 'auto', padding: '9px 18px', fontSize: 13, whiteSpace: 'nowrap' }}
              >
                {t('team.hireCta', 'Contratar agente')}
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', padding: '3rem 0' }}>
              <span className="chat-typing">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {t('team.loading', 'Cargando tu equipo…')}
              </span>
            </div>
          )}

          {/* Error de carga */}
          {!loading && loadError && (
            <div className="card" style={{ borderColor: 'rgba(184, 57, 42, 0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {t('team.loadError', 'No pudimos cargar tu equipo. Revisa tu conexión e intenta de nuevo.')}
              </p>
              <button className="btn-secondary" onClick={loadAgents} style={{ fontSize: 12, padding: '6px 14px' }}>
                {t('team.retry', 'Reintentar')}
              </button>
            </div>
          )}

          {/* Estado vacío */}
          {!loading && !loadError && agents.length === 0 && (
            <motion.div
              className="empty-state-v2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="es-mark">+</div>
              <div className="es-title">{t('team.emptyTitle', 'Todavía no tienes agentes')}</div>
              <p className="es-body">
                {t('team.emptyBody', 'Crea tu equipo inicial con los roles esenciales para tu negocio, o contrata un agente desde una plantilla.')}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  onClick={handleSeed}
                  disabled={seeding}
                  style={{ width: 'auto', padding: '10px 20px', fontSize: 13 }}
                >
                  {seeding ? t('team.seeding', 'Creando equipo…') : t('team.seedCta', 'Crear mi equipo inicial')}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowHire(true)}
                  style={{ fontSize: 13, padding: '10px 20px' }}
                >
                  {t('team.hireCta', 'Contratar agente')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Roster */}
          {!loading && !loadError && roots.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16, alignItems: 'start' }}>
              {roots.map(agent => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <AgentCard
                    agent={agent}
                    archiving={archivingId === agent.id}
                    onChat={() => setChatAgent(agent)}
                    onEdit={() => setEditingAgent(agent)}
                    onArchive={() => handleArchive(agent)}
                  />
                  {(byParent[agent.id] || []).length > 0 && (
                    <div
                      style={{
                        marginLeft: 18,
                        paddingLeft: 16,
                        borderLeft: '1px solid var(--border-strong)',
                        marginTop: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      {byParent[agent.id].map(child => (
                        <div key={child.id} style={{ position: 'relative' }}>
                          <span
                            aria-hidden
                            style={{ position: 'absolute', left: -16, top: 26, width: 12, height: 1, background: 'var(--border-strong)' }}
                          />
                          <AgentCard
                            agent={child}
                            isChild
                            parentName={agent.name}
                            archiving={archivingId === child.id}
                            onChat={() => setChatAgent(child)}
                            onEdit={() => setEditingAgent(child)}
                            onArchive={() => handleArchive(child)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal contratar */}
      <AnimatePresence>
        {showHire && (
          <HireModal
            onClose={() => setShowHire(false)}
            onHired={handleHired}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Modal editar */}
      <AnimatePresence>
        {editingAgent && (
          <EditModal
            key={editingAgent.id}
            agent={editingAgent}
            onClose={() => setEditingAgent(null)}
            onUpdated={handleUpdated}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Chat rápido */}
      <AnimatePresence>
        {chatAgent && (
          <ChatPanel key={chatAgent.id} agent={chatAgent} onClose={() => setChatAgent(null)} />
        )}
      </AnimatePresence>

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

/* ─── Tarjeta de agente ─── */
function AgentCard({ agent, isChild, parentName, archiving, onChat, onEdit, onArchive }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const persona = agent.persona || ''
  const isLong = persona.length > 140

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.005em', lineHeight: 1.25 }}>
            {agent.name}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{agent.role_title}</p>
        </div>
        {isChild && (
          <span className="badge badge-domain" style={{ flexShrink: 0 }} title={parentName ? t('team.subagentOf', 'Subagente de {{name}}', { name: parentName }) : undefined}>
            {t('team.subagentBadge', 'Subagente')}
          </span>
        )}
      </div>

      {(agent.can_hire || agent.is_reviewer) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {agent.can_hire && (
            <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--gold-400)' }}>
              {t('team.badgeCanHire', 'Contrata equipos')}
            </span>
          )}
          {agent.is_reviewer && (
            <span className="badge" style={{ background: 'rgba(90, 138, 168, 0.15)', color: 'var(--info)' }}>
              {t('team.badgeReviewer', 'Revisora — abogada del diablo')}
            </span>
          )}
        </div>
      )}

      {persona && (
        <div>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              ...(!expanded && isLong
                ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
                : {}),
            }}
          >
            {persona}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ background: 'none', border: 'none', padding: 0, marginTop: 4, fontSize: 12, color: 'var(--gold-400)', cursor: 'pointer' }}
            >
              {expanded ? t('team.seeLess', 'Ver menos') : t('team.seeMore', 'Ver más')}
            </button>
          )}
        </div>
      )}

      {agent.domain_scopes?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {agent.domain_scopes.map(scope => (
            <span
              key={scope}
              style={{
                fontSize: 10,
                padding: '2px 9px',
                borderRadius: 999,
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                textTransform: 'capitalize',
              }}
            >
              {scopeLabel(scope, t)}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto', paddingTop: 4 }}>
        <button className="btn-secondary" onClick={onChat} style={{ fontSize: 12, padding: '6px 12px' }}>
          {t('team.chatAction', 'Conversar')}
        </button>
        <button className="btn-secondary" onClick={onEdit} style={{ fontSize: 12, padding: '6px 12px' }}>
          {t('team.editAction', 'Editar')}
        </button>
        <button
          onClick={onArchive}
          disabled={archiving}
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: archiving ? 'default' : 'pointer',
            opacity: archiving ? 0.6 : 1,
          }}
        >
          {archiving ? '…' : t('team.archiveAction', 'Archivar')}
        </button>
      </div>
    </div>
  )
}

/* ─── Cascarón de modal (mismo patrón visual del resto de la app) ─── */
function ModalShell({ title, subtitle, onClose, children, maxWidth = 640 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 20px',
        overflowY: 'auto',
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          maxWidth,
          width: '100%',
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: 24,
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 18,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.005em', marginBottom: subtitle ? 4 : 18, paddingRight: 40 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.5 }}>{subtitle}</p>
        )}
        {children}
      </motion.div>
    </motion.div>
  )
}

/* ─── Modal de contratación: plantillas + personalizado ─── */
function HireModal({ onClose, onHired, showToast }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('templates')
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templatesError, setTemplatesError] = useState(false)
  const [selectedKey, setSelectedKey] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    setLoadingTemplates(true)
    setTemplatesError(false)
    try {
      const { data } = await agentsAPI.templates()
      setTemplates(Array.isArray(data) ? data : data?.templates || [])
    } catch {
      setTemplatesError(true)
    } finally {
      setLoadingTemplates(false)
    }
  }

  async function hireFromTemplate() {
    if (!selectedKey || submitting) return
    setSubmitting(true)
    try {
      await agentsAPI.create({ template_key: selectedKey })
      onHired()
    } catch (err) {
      showToast(apiError(err, t('team.hireError', 'No se pudo contratar el agente. Intenta de nuevo.')), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function hireCustom(form) {
    if (submitting) return
    setSubmitting(true)
    try {
      await agentsAPI.create(form)
      onHired()
    } catch (err) {
      showToast(apiError(err, t('team.hireError', 'No se pudo contratar el agente. Intenta de nuevo.')), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const tabStyle = active => ({
    fontSize: 12,
    fontWeight: 600,
    padding: '7px 14px',
    borderRadius: 999,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--gold-400)' : 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  return (
    <ModalShell
      title={t('team.hireModal.title', 'Contratar un agente')}
      subtitle={t('team.hireModal.subtitle', 'Elige una plantilla lista para trabajar o define un agente a tu medida.')}
      onClose={onClose}
      maxWidth={720}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }} role="tablist">
        <button role="tab" aria-selected={tab === 'templates'} onClick={() => setTab('templates')} style={tabStyle(tab === 'templates')}>
          {t('team.hireModal.tabTemplates', 'Plantillas')}
        </button>
        <button role="tab" aria-selected={tab === 'custom'} onClick={() => setTab('custom')} style={tabStyle(tab === 'custom')}>
          {t('team.hireModal.tabCustom', 'Personalizado')}
        </button>
      </div>

      {tab === 'templates' && (
        <div>
          {loadingTemplates && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '1.5rem 0', textAlign: 'center' }}>
              {t('team.hireModal.loadingTemplates', 'Cargando plantillas…')}
            </p>
          )}

          {!loadingTemplates && templatesError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '1rem 0', flexWrap: 'wrap' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {t('team.hireModal.templatesError', 'No pudimos cargar las plantillas.')}
              </p>
              <button className="btn-secondary" onClick={loadTemplates} style={{ fontSize: 12, padding: '6px 14px' }}>
                {t('team.retry', 'Reintentar')}
              </button>
            </div>
          )}

          {!loadingTemplates && !templatesError && templates.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '1.5rem 0', textAlign: 'center' }}>
              {t('team.hireModal.noTemplates', 'No hay plantillas disponibles por ahora. Crea un agente personalizado.')}
            </p>
          )}

          {!loadingTemplates && !templatesError && templates.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                {templates.map(tpl => {
                  const selected = selectedKey === tpl.key
                  return (
                    <button
                      key={tpl.key}
                      onClick={() => setSelectedKey(selected ? null : tpl.key)}
                      aria-pressed={selected}
                      style={{
                        textAlign: 'left',
                        background: selected ? 'var(--accent-dim)' : 'var(--bg-card)',
                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 12,
                        padding: 14,
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {tpl.name}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tpl.role_title}</span>
                      {tpl.persona && (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {tpl.persona}
                        </span>
                      )}
                      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                        {(tpl.domain_scopes || []).map(scope => (
                          <span key={scope} style={{ fontSize: 10, padding: '1px 8px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                            {scopeLabel(scope, t)}
                          </span>
                        ))}
                        {tpl.can_hire && (
                          <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--gold-400)' }}>
                            {t('team.badgeCanHire', 'Contrata equipos')}
                          </span>
                        )}
                        {tpl.is_reviewer && (
                          <span className="badge" style={{ background: 'rgba(90, 138, 168, 0.15)', color: 'var(--info)' }}>
                            {t('team.badgeReviewer', 'Revisora — abogada del diablo')}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  className="btn-primary"
                  onClick={hireFromTemplate}
                  disabled={!selectedKey || submitting}
                  style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}
                >
                  {submitting ? t('team.hireModal.hiring', 'Contratando…') : t('team.hireModal.hire', 'Contratar')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'custom' && (
        <AgentForm
          submitting={submitting}
          submitLabel={submitting ? t('team.hireModal.hiring', 'Contratando…') : t('team.hireModal.hire', 'Contratar')}
          onSubmit={hireCustom}
        />
      )}
    </ModalShell>
  )
}

/* ─── Modal de edición ─── */
function EditModal({ agent, onClose, onUpdated, showToast }) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(form) {
    if (submitting) return
    setSubmitting(true)
    try {
      const { data } = await agentsAPI.update(agent.id, form)
      onUpdated(data && data.id ? data : { ...agent, ...form })
    } catch (err) {
      showToast(apiError(err, t('team.updateError', 'No se pudieron guardar los cambios.')), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title={t('team.editModal.title', 'Editar agente')}
      subtitle={t('team.editModal.subtitle', 'Ajusta el rol y la personalidad de este agente.')}
      onClose={onClose}
      maxWidth={560}
    >
      <AgentForm
        initial={agent}
        submitting={submitting}
        submitLabel={submitting ? t('team.editModal.saving', 'Guardando…') : t('team.editModal.save', 'Guardar cambios')}
        onSubmit={handleSubmit}
      />
    </ModalShell>
  )
}

/* ─── Formulario compartido (crear personalizado / editar) ─── */
function AgentForm({ initial, submitting, submitLabel, onSubmit }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    name: initial?.name || '',
    role_title: initial?.role_title || '',
    persona: initial?.persona || '',
    domain_scopes: initial?.domain_scopes || [],
    can_hire: !!initial?.can_hire,
    is_reviewer: !!initial?.is_reviewer,
  })

  function toggleScope(scope) {
    setForm(f => ({
      ...f,
      domain_scopes: f.domain_scopes.includes(scope)
        ? f.domain_scopes.filter(s => s !== scope)
        : [...f.domain_scopes, scope],
    }))
  }

  const valid = form.name.trim() && form.role_title.trim()

  const checkRow = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    border: '1px solid var(--border)',
  }

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) onSubmit({ ...form, name: form.name.trim(), role_title: form.role_title.trim() }) }}>
      <div className="field-group">
        <label className="field-label" htmlFor="agent-name">{t('team.form.name', 'Nombre')}</label>
        <input
          id="agent-name"
          className="field-input"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder={t('team.form.namePlaceholder', 'Ej. Valentina, analista de ventas')}
        />
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="agent-role">{t('team.form.roleTitle', 'Cargo')}</label>
        <input
          id="agent-role"
          className="field-input"
          value={form.role_title}
          onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))}
          placeholder={t('team.form.rolePlaceholder', 'Ej. Especialista en atención al cliente')}
        />
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="agent-persona">{t('team.form.persona', 'Personalidad')}</label>
        <textarea
          id="agent-persona"
          className="field-input"
          value={form.persona}
          onChange={e => setForm(f => ({ ...f, persona: e.target.value }))}
          placeholder={t('team.form.personaPlaceholder', 'Describe cómo piensa y trabaja este agente. Ej. Reclutadora con décadas de experiencia armando equipos de alto desempeño…')}
          rows={4}
          style={{ resize: 'vertical', minHeight: 90, lineHeight: 1.5 }}
        />
      </div>

      <div className="field-group">
        <span className="field-label">{t('team.form.scopes', 'Áreas de conocimiento')}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DOMAIN_SCOPES.map(scope => {
            const checked = form.domain_scopes.includes(scope)
            return (
              <label
                key={scope}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                  background: checked ? 'var(--accent-dim)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleScope(scope)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                {scopeLabel(scope, t)}
              </label>
            )
          })}
        </div>
      </div>

      <div className="field-group" style={{ gap: 8 }}>
        <label style={checkRow}>
          <input
            type="checkbox"
            checked={form.can_hire}
            onChange={e => setForm(f => ({ ...f, can_hire: e.target.checked }))}
            style={{ marginTop: 2, accentColor: 'var(--accent)' }}
          />
          <span>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)' }}>
              {t('team.form.canHire', 'Puede contratar subagentes')}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t('team.form.canHireHint', 'Podrá sumar agentes de apoyo cuando una misión lo necesite.')}
            </span>
          </span>
        </label>
        <label style={checkRow}>
          <input
            type="checkbox"
            checked={form.is_reviewer}
            onChange={e => setForm(f => ({ ...f, is_reviewer: e.target.checked }))}
            style={{ marginTop: 2, accentColor: 'var(--accent)' }}
          />
          <span>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)' }}>
              {t('team.form.isReviewer', 'Es revisora — abogada del diablo')}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t('team.form.isReviewerHint', 'Evalúa el trabajo de los demás agentes y lo aprueba o rechaza con comentarios.')}
            </span>
          </span>
        </label>
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={!valid || submitting}
        style={{ marginTop: 6, fontSize: 13 }}
      >
        {submitLabel}
      </button>
    </form>
  )
}

/* ─── Panel lateral de chat rápido con un agente ─── */
function ChatPanel({ agent, onClose }) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  async function handleSend(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    const history = messages
      .filter(m => !m.isError)
      .slice(-20)
      .map(m => ({ role: m.role, content: (m.content || '').slice(0, 4000) }))
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setSending(true)
    try {
      const { data } = await agentsAPI.chat(agent.id, text, history)
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, sources: data.sources || [] }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: apiError(err, t('team.chat.error', 'No pude responder en este momento. Intenta de nuevo.')),
        isError: true,
      }])
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)', zIndex: 1000 }}
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('team.chat.title', 'Conversación con {{name}}', { name: agent.name })}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(440px, 100vw)',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Encabezado del panel */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.25 }}>
              {agent.name}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{agent.role_title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close', 'Cerrar')}
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Mensajes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1rem' }} role="log" aria-live="polite">
          {messages.length === 0 && !sending && (
            <div style={{ textAlign: 'center', paddingTop: '2.5rem' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
                {t('team.chat.empty', 'Hazle una pregunta a {{name}} sobre su área. Responde con el conocimiento de tu negocio.', { name: agent.name })}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div className="chat-bubble-user">{msg.content}</div>
                  </div>
                ) : (
                  <div>
                    <div
                      className="chat-bubble-assistant"
                      style={msg.isError ? { borderLeftColor: '#b06b48', background: 'rgba(176,107,72,0.04)' } : undefined}
                    >
                      {msg.content}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <details className="chat-sources">
                        <summary>{t('team.chat.viewSources', 'Ver fuentes ({{count}})', { count: msg.sources.length })}</summary>
                        <ul>
                          {msg.sources.map((s, idx) => (
                            <li key={idx}>{s.fact}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {sending && (
              <div className="chat-bubble-assistant" style={{ padding: '12px 16px', display: 'inline-flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
                <span className="chat-typing">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('team.chat.thinking', '{{name}} está pensando…', { name: agent.name })}
                </span>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Barra de entrada */}
        <form
          onSubmit={handleSend}
          style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <input
            ref={inputRef}
            className="field-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('team.chat.placeholder', 'Escribe tu mensaje…')}
            disabled={sending}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={sending || !input.trim()}
            aria-label={t('team.chat.send', 'Enviar')}
            style={{ width: 'auto', padding: '10px 16px', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            {t('team.chat.send', 'Enviar')}
          </button>
        </form>
      </motion.aside>
    </motion.div>
  )
}
