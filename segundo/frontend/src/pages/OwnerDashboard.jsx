import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { teachAPI, unansweredAPI, inviteAPI, proposalsAPI, teamAPI, notificationsAPI, analyticsAPI, templatesAPI } from '../services/api'
import TeachInput from '../components/TeachInput'
import KnowledgeCard from '../components/KnowledgeCard'

const TABS = [
  { id: 'teach',      label: 'Enseñar',      icon: '✦' },
  { id: 'knowledge',  label: 'Manual',        icon: '≡' },
  { id: 'unanswered', label: 'Sin respuesta', icon: '?' },
  { id: 'proposals',  label: 'Propuestas',    icon: '◎', badge: 'proposals' },
  { id: 'conflicts',  label: 'Conflictos',    icon: '⚡', badge: 'conflicts' },
  { id: 'analytics',  label: 'Métricas',      icon: '◷' },
  { id: 'invite',     label: 'Equipo',        icon: '+' },
]

export default function OwnerDashboard() {
  const [tab, setTab] = useState('teach')
  const [knowledge, setKnowledge] = useState([])
  const [unanswered, setUnanswered] = useState([])
  const [proposals, setProposals] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [inviteForm, setInviteForm] = useState({ phone: '', name: '', countryCode: '+52', customPassword: '' })
  const [inviteResult, setInviteResult] = useState(null)
  const [inviteError, setInviteError] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [inviteSubTab, setInviteSubTab] = useState('invite')
  const [removingId, setRemovingId] = useState(null)
  const [resolving, setResolving] = useState({})
  const [actioning, setActioning] = useState({})
  const [knowledgeSearch, setKnowledgeSearch] = useState('')
  const [knowledgeCategory, setKnowledgeCategory] = useState('')
  const [knowledgePage, setKnowledgePage] = useState(1)
  const [analytics, setAnalytics] = useState(null)
  const [knowledgeUsage, setKnowledgeUsage] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [templates, setTemplates] = useState([])
  const [loadingTemplate, setLoadingTemplate] = useState(null)
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)
  const [bulkPreview, setBulkPreview] = useState(null)
  const [bulkSelected, setBulkSelected] = useState({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const { user, logout } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (tab === 'teach')      loadTemplates()
    if (tab === 'knowledge')  loadKnowledge()
    if (tab === 'unanswered') loadUnanswered()
    if (tab === 'proposals')  loadProposals()
    if (tab === 'conflicts')  loadConflicts()
    if (tab === 'analytics')  loadAnalytics()
    if (tab === 'invite')     loadTeam()
  }, [tab])

  useEffect(() => {
    if (tab !== 'knowledge') return
    const timer = setTimeout(() => loadKnowledge(), 300)
    return () => clearTimeout(timer)
  }, [knowledgeSearch, knowledgeCategory, knowledgePage])

  // Load counts on mount for badges
  useEffect(() => {
    proposalsAPI.list().then(r => setProposals(r.data)).catch(() => {})
    proposalsAPI.listConflicts().then(r => setConflicts(r.data)).catch(() => {})
    notificationsAPI.count().then(r => setUnreadCount(r.data.unread)).catch(() => {})
  }, [])

  async function loadKnowledge() {
    try { const { data } = await teachAPI.listKnowledge(); setKnowledge(data) } catch {}
  }
  async function loadUnanswered() {
    try { const { data } = await unansweredAPI.list(); setUnanswered(data) } catch {}
  }
  async function loadProposals() {
    try { const { data } = await proposalsAPI.list(); setProposals(data) } catch {}
  }
  async function loadConflicts() {
    try { const { data } = await proposalsAPI.listConflicts(); setConflicts(data) } catch {}
  }
  async function loadTeam() {
    try { const { data } = await teamAPI.list(); setTeamMembers(data) } catch {}
  }
  async function loadAnalytics() {
    try {
      const [summaryRes, usageRes] = await Promise.all([
        analyticsAPI.summary(),
        analyticsAPI.knowledgeUsage(),
      ])
      setAnalytics(summaryRes.data)
      setKnowledgeUsage(usageRes.data)
    } catch {}
  }
  async function loadTemplates() {
    try { const { data } = await templatesAPI.list(); setTemplates(data) } catch {}
  }
  async function loadNotifications() {
    try { const { data } = await notificationsAPI.list(); setNotifications(data) } catch {}
  }
  async function handleMarkAllRead() {
    try {
      await notificationsAPI.markAllRead()
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch {}
  }
  async function handleRemoveEmployee(id) {
    if (!confirm('Seguro que quieres eliminar a este empleado?')) return
    setRemovingId(id)
    try {
      await teamAPI.remove(id)
      setTeamMembers(prev => prev.filter(m => m.id !== id))
    } finally {
      setRemovingId(null)
    }
  }

  async function handleResolve(id, answer) {
    if (!answer.trim()) return
    setResolving(r => ({ ...r, [id]: true }))
    try {
      await unansweredAPI.resolve(id, answer)
      setUnanswered(prev => prev.filter(q => q.id !== id))
    } finally {
      setResolving(r => ({ ...r, [id]: false }))
    }
  }

  async function handleProposalAction(id, action) {
    setActioning(a => ({ ...a, [id]: action }))
    try {
      if (action === 'approve') await proposalsAPI.approve(id)
      else await proposalsAPI.reject(id)
      setProposals(prev => prev.filter(p => p.id !== id))
    } finally {
      setActioning(a => ({ ...a, [id]: null }))
    }
  }

  async function handleResolveConflict(id, keepFactId) {
    setActioning(a => ({ ...a, [id]: 'resolving' }))
    try {
      await proposalsAPI.resolveConflict(id, keepFactId)
      setConflicts(prev => prev.filter(c => c.id !== id))
    } finally {
      setActioning(a => ({ ...a, [id]: null }))
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviteError('')
    setInviteResult(null)
    try {
      const fullPhone = inviteForm.countryCode + inviteForm.phone.replace(/\s/g, '')
      const { data } = await inviteAPI.invite(fullPhone, inviteForm.name, inviteForm.customPassword || null)
      setInviteResult({ ...data, phone: fullPhone, name: inviteForm.name })
      setInviteForm({ phone: '', name: '', countryCode: inviteForm.countryCode, customPassword: '' })
      loadTeam()
    } catch (err) {
      setInviteError(err.response?.data?.detail || 'Error al crear el acceso')
    }
  }

  function buildWhatsAppLink(phone, name, password) {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const text = `Hola ${name}, tu acceso a Segundo está listo.\n\nTeléfono: ${phone}\nContraseña: ${password}\n\nEntra en segundo.app/login y te pedirá crear tu propia contraseña.`
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
  }

  const categories = [...new Set(knowledge.map(e => e.category).filter(Boolean))]

  const filteredKnowledge = knowledge.filter(entry => {
    const matchesSearch = !knowledgeSearch ||
      entry.processed_fact.toLowerCase().includes(knowledgeSearch.toLowerCase())
    const matchesCategory = !knowledgeCategory || entry.category === knowledgeCategory
    return matchesSearch && matchesCategory
  })
  const PAGE_SIZE = 20
  const totalPages = Math.ceil(filteredKnowledge.length / PAGE_SIZE)
  const pagedKnowledge = filteredKnowledge.slice((knowledgePage - 1) * PAGE_SIZE, knowledgePage * PAGE_SIZE)

  const badgeCounts = { proposals: proposals.length, conflicts: conflicts.length }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#0e0e0e',
          }}>S</div>
          <span className="app-logo">Segundo</span>
          <span style={{
            marginLeft: 8, fontSize: 11, color: 'var(--text-muted)',
            fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>Panel dueño</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</span>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifications(s => !s); if (!showNotifications) loadNotifications() }}
              style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
              aria-label="Notificaciones"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: 'var(--accent)', color: '#0e0e0e',
                  fontSize: 9, fontWeight: 700, padding: '1px 4px',
                  borderRadius: 99, minWidth: 14, textAlign: 'center',
                }}>{unreadCount}</span>
              )}
            </button>
            {showNotifications && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                width: 320, maxHeight: 400, overflowY: 'auto',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 100,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Notificaciones</span>
                  {notifications.some(n => !n.read) && (
                    <button onClick={handleMarkAllRead} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Marcar todo leído
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p style={{ padding: '1.5rem', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Sin notificaciones</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{
                      padding: '10px 14px', borderBottom: '1px solid var(--border)',
                      background: n.read ? 'transparent' : 'rgba(212,168,83,0.04)',
                      cursor: 'pointer',
                    }}
                    onClick={() => { if (!n.read) { notificationsAPI.markRead(n.id); setUnreadCount(c => Math.max(0, c-1)); setNotifications(prev => prev.map(x => x.id === n.id ? {...x, read: true} : x)) } }}
                    >
                      <div style={{ fontSize: 12, fontWeight: n.read ? 400 : 600, color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.body}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="tab-bar" role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            role="tab"
            aria-selected={tab === t.id}
          >
            <span style={{ fontSize: 10 }}>{t.icon}</span>
            {t.label}
            {t.badge && badgeCounts[t.badge] > 0 && (
              <span className="tab-badge">{badgeCounts[t.badge]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div id="main-content" style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Enseñar */}
          {tab === 'teach' && (
            <div className="fade-in">
              <SectionHeader
                title="Enseña al agente"
                subtitle="Escribe en lenguaje natural. Segundo extrae, clasifica y guarda el conocimiento automáticamente."
              />
              <TeachInput onSaved={() => {}} />

              <div className="card" style={{ marginTop: '1.5rem', padding: '1rem' }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Carga masiva</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>Sube un archivo CSV o JSON. Un agente inteligente extrae los hechos para que los revises antes de guardar.</p>

                {!bulkPreview && (
                  <>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="file"
                        accept=".csv,.json"
                        onChange={e => { setBulkFile(e.target.files[0]); setBulkResult(null); setBulkPreview(null) }}
                        style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                      />
                      <button
                        className="btn-primary"
                        disabled={!bulkFile || bulkUploading}
                        onClick={async () => {
                          setBulkUploading(true)
                          setBulkResult(null)
                          setBulkPreview(null)
                          try {
                            const { data } = await teachAPI.bulkPreview(bulkFile)
                            setBulkPreview(data.facts)
                            const sel = {}
                            data.facts.forEach((_, i) => { sel[i] = true })
                            setBulkSelected(sel)
                          } catch (err) {
                            setBulkResult({ error: err.response?.data?.detail || 'Error al procesar archivo' })
                          } finally {
                            setBulkUploading(false)
                          }
                        }}
                        style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}
                      >
                        {bulkUploading ? 'Extrayendo hechos...' : 'Analizar archivo'}
                      </button>
                    </div>
                    {bulkResult && (
                      <div style={{ marginTop: 8, fontSize: 12, color: bulkResult.error ? '#e74c3c' : '#2ecc71' }}>
                        {bulkResult.error || `${bulkResult.saved} hechos guardados, ${bulkResult.errors} errores`}
                      </div>
                    )}
                  </>
                )}

                {bulkPreview && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {Object.values(bulkSelected).filter(Boolean).length} de {bulkPreview.length} hechos seleccionados
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => {
                            const all = {}
                            const allSelected = Object.values(bulkSelected).every(Boolean)
                            bulkPreview.forEach((_, i) => { all[i] = !allSelected })
                            setBulkSelected(all)
                          }}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          {Object.values(bulkSelected).every(Boolean) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </button>
                        <button
                          onClick={() => { setBulkPreview(null); setBulkSelected({}); setBulkFile(null) }}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>

                    <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, border: '1px solid var(--border)', borderRadius: 8, padding: 6 }}>
                      {bulkPreview.map((fact, i) => (
                        <label
                          key={i}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px',
                            borderRadius: 6, cursor: 'pointer',
                            background: bulkSelected[i] ? 'var(--bg-secondary)' : 'transparent',
                            opacity: bulkSelected[i] ? 1 : 0.5,
                            transition: 'all 0.15s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!bulkSelected[i]}
                            onChange={() => setBulkSelected(prev => ({ ...prev, [i]: !prev[i] }))}
                            style={{ marginTop: 2, accentColor: 'var(--accent)' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>{fact.text}</div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--accent-soft)', color: 'var(--accent)' }}>{fact.category}</span>
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--bg-tertiary, #2a2a2a)', color: 'var(--text-muted)' }}>{fact.domain}</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <button
                      className="btn-primary"
                      disabled={bulkSaving || Object.values(bulkSelected).filter(Boolean).length === 0}
                      onClick={async () => {
                        setBulkSaving(true)
                        setBulkResult(null)
                        const approved = bulkPreview.filter((_, i) => bulkSelected[i])
                        try {
                          const { data } = await teachAPI.bulkConfirm(approved)
                          setBulkResult(data)
                          setBulkPreview(null)
                          setBulkSelected({})
                          setBulkFile(null)
                        } catch (err) {
                          setBulkResult({ error: err.response?.data?.detail || 'Error al guardar' })
                        } finally {
                          setBulkSaving(false)
                        }
                      }}
                      style={{ width: '100%', padding: '8px 16px', fontSize: 12 }}
                    >
                      {bulkSaving ? 'Guardando...' : `Guardar ${Object.values(bulkSelected).filter(Boolean).length} hechos`}
                    </button>

                    {bulkResult && (
                      <div style={{ marginTop: 8, fontSize: 12, color: bulkResult.error ? '#e74c3c' : '#2ecc71' }}>
                        {bulkResult.error || `${bulkResult.saved} hechos guardados exitosamente`}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Plantillas por industria</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>Carga hechos predefinidos para tu tipo de negocio.</p>
                {templates.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No hay plantillas disponibles.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {templates.map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.facts_count} hechos</div>
                        </div>
                        <button
                          className="btn-secondary"
                          disabled={loadingTemplate === t.id}
                          onClick={async () => {
                            setLoadingTemplate(t.id)
                            try {
                              await templatesAPI.load(t.id)
                              alert(`Plantilla "${t.name}" cargada correctamente`)
                            } catch {
                              alert('Error al cargar plantilla')
                            } finally {
                              setLoadingTemplate(null)
                            }
                          }}
                          style={{ fontSize: 12, padding: '6px 12px' }}
                        >
                          {loadingTemplate === t.id ? '...' : 'Cargar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual */}
          {tab === 'knowledge' && (
            <div className="fade-in">
              <SectionHeader title="Manual del negocio" subtitle={`${filteredKnowledge.length} de ${knowledge.length} entradas`} />

              {/* Search and filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
                <input
                  className="field-input"
                  type="text"
                  value={knowledgeSearch}
                  onChange={e => { setKnowledgeSearch(e.target.value); setKnowledgePage(1) }}
                  placeholder="Buscar..."
                  style={{ flex: 1, minWidth: 200 }}
                />
                <select
                  className="field-input"
                  value={knowledgeCategory}
                  onChange={e => { setKnowledgeCategory(e.target.value); setKnowledgePage(1) }}
                  style={{ width: 'auto', minWidth: 150, cursor: 'pointer', appearance: 'auto' }}
                >
                  <option value="">Todas las categorías</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Export button */}
              <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/knowledge/export?format=json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none',
                    border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px',
                  }}
                >
                  Exportar JSON
                </a>
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/knowledge/export?format=csv`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none',
                    border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px',
                  }}
                >
                  Exportar CSV
                </a>
              </div>

              {pagedKnowledge.length === 0 ? (
                <EmptyState icon="≡" text={knowledgeSearch ? "No se encontraron resultados." : "Aún no hay conocimiento guardado. Ve a Enseñar para comenzar."} />
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pagedKnowledge.map(entry => (
                      <KnowledgeCard key={entry.id} entry={entry} onUpdate={loadKnowledge} onDelete={loadKnowledge} />
                    ))}
                  </div>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1rem' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => setKnowledgePage(p => Math.max(1, p - 1))}
                        disabled={knowledgePage === 1}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                      >
                        ← Anterior
                      </button>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        {knowledgePage} / {totalPages}
                      </span>
                      <button
                        className="btn-secondary"
                        onClick={() => setKnowledgePage(p => Math.min(totalPages, p + 1))}
                        disabled={knowledgePage === totalPages}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Sin respuesta */}
          {tab === 'unanswered' && (
            <div className="fade-in">
              <SectionHeader
                title="Sin respuesta"
                subtitle="Preguntas que el agente no pudo responder. Resuélvelas para enriquecer el manual."
              />
              {unanswered.length === 0 ? (
                <EmptyState icon="✓" text="No hay preguntas sin respuesta. ¡Segundo lo sabe todo!" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {unanswered.map(q => (
                    <UnansweredItem key={q.id} question={q} onResolve={handleResolve} saving={resolving[q.id]} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Propuestas */}
          {tab === 'proposals' && (
            <div className="fade-in">
              <SectionHeader
                title="Propuestas de conocimiento"
                subtitle="Segundo detectó información nueva en conversaciones. Aprueba o descarta."
              />
              {proposals.length === 0 ? (
                <EmptyState icon="◎" text="No hay propuestas pendientes." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {proposals.map(p => (
                    <ProposalItem
                      key={p.id}
                      proposal={p}
                      onAction={handleProposalAction}
                      actioning={actioning[p.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conflictos */}
          {tab === 'conflicts' && (
            <div className="fade-in">
              <SectionHeader
                title="Conflictos detectados"
                subtitle="Segundo detectó posibles contradicciones en el manual. Revisa y resuelve."
              />
              {conflicts.length === 0 ? (
                <EmptyState icon="✓" text="No hay conflictos. El manual está consistente." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {conflicts.map(c => (
                    <div key={c.id} className="card" style={{ borderColor: 'rgba(192,57,43,0.25)' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        marginBottom: 8, fontSize: 11, color: '#e74c3c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        Posible contradicción
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                        {c.explanation || 'Dos hechos en el manual pueden contradecirse.'}
                      </p>
                      {c.fact_a_text && c.fact_b_text && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                          <div style={{ padding: '10px 12px', background: 'rgba(212,168,83,0.06)', border: '1px solid var(--border)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hecho A</div>
                            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{c.fact_a_text}</p>
                          </div>
                          <div style={{ padding: '10px 12px', background: 'rgba(212,168,83,0.06)', border: '1px solid var(--border)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hecho B</div>
                            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{c.fact_b_text}</p>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {c.fact_a_id && (
                          <button className="btn-success" onClick={() => handleResolveConflict(c.id, c.fact_a_id)} disabled={actioning[c.id] === 'resolving'} style={{ fontSize: 12, flex: 1 }}>
                            {actioning[c.id] === 'resolving' ? '...' : 'Mantener A'}
                          </button>
                        )}
                        {c.fact_b_id && (
                          <button className="btn-success" onClick={() => handleResolveConflict(c.id, c.fact_b_id)} disabled={actioning[c.id] === 'resolving'} style={{ fontSize: 12, flex: 1 }}>
                            {actioning[c.id] === 'resolving' ? '...' : 'Mantener B'}
                          </button>
                        )}
                        <button className="btn-secondary" onClick={() => handleResolveConflict(c.id)} disabled={actioning[c.id] === 'resolving'} style={{ fontSize: 12, flex: 1 }}>
                          {actioning[c.id] === 'resolving' ? '...' : 'Mantener ambos'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Métricas */}
          {tab === 'analytics' && (
            <div className="fade-in">
              <SectionHeader title="Métricas del negocio" subtitle="Resumen de actividad y uso del conocimiento" />
              {!analytics ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando métricas...</p>
              ) : (
                <>
                  {/* Summary cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: '1.5rem' }}>
                    {[
                      { label: 'Preguntas hoy', value: analytics.total_questions_today },
                      { label: 'Preguntas (7d)', value: analytics.total_questions_week },
                      { label: 'Tasa resolución', value: `${Math.round(analytics.resolution_rate * 100)}%` },
                      { label: 'Sin respuesta', value: analytics.unanswered_pending },
                      { label: 'Hechos activos', value: analytics.knowledge_entries_count },
                      { label: 'Nuevos (7d)', value: `+${analytics.knowledge_growth_week}` },
                      { label: 'Empleados hoy', value: analytics.active_employees_today },
                    ].map((m, i) => (
                      <div key={i} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-serif)' }}>{m.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Knowledge usage */}
                  {knowledgeUsage && (
                    <>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Hechos más usados</h3>
                      {knowledgeUsage.top_used.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Aún no hay datos de uso.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.5rem' }}>
                          {knowledgeUsage.top_used.map((e, i) => (
                            <div key={e.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                              <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{e.fact.length > 80 ? e.fact.slice(0, 80) + '…' : e.fact}</span>
                              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginLeft: 12, flexShrink: 0 }}>{e.usage_count}x</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Nunca usados</h3>
                      {knowledgeUsage.never_used.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Todos los hechos han sido usados al menos una vez.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {knowledgeUsage.never_used.map(e => (
                            <div key={e.id} className="card" style={{ padding: '10px 14px', opacity: 0.7 }}>
                              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.fact.length > 80 ? e.fact.slice(0, 80) + '…' : e.fact}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{e.category}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Equipo */}
          {tab === 'invite' && (
            <div className="fade-in">
              <SectionHeader
                title="Equipo"
                subtitle="Gestiona el acceso de tus empleados."
              />

              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: '1rem' }}>
                <button
                  onClick={() => setInviteSubTab('invite')}
                  style={{
                    padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)',
                    background: inviteSubTab === 'invite' ? 'var(--accent)' : 'transparent',
                    color: inviteSubTab === 'invite' ? '#0e0e0e' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Nuevo empleado
                </button>
                <button
                  onClick={() => setInviteSubTab('list')}
                  style={{
                    padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)',
                    background: inviteSubTab === 'list' ? 'var(--accent)' : 'transparent',
                    color: inviteSubTab === 'list' ? '#0e0e0e' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Registrados ({teamMembers.length})
                </button>
              </div>

              {/* Sub-tab: Invitar */}
              {inviteSubTab === 'invite' && (
                <div className="card">
                  {inviteResult && (
                    <div className="alert-success" style={{ marginBottom: '1.2rem' }}>
                      <strong>{inviteResult.message}</strong>
                      <div style={{ margin: '10px 0', padding: '10px 12px', background: 'rgba(39,174,96,0.1)', borderRadius: 6 }}>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>
                          Teléfono: <strong>{inviteResult.phone}</strong>
                        </div>
                        <div style={{ fontSize: 12 }}>
                          Contraseña: <code style={{
                            background: 'rgba(39,174,96,0.2)',
                            padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace',
                          }}>{inviteResult.temp_password}</code>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <a
                          href={buildWhatsAppLink(inviteResult.phone, inviteResult.name, inviteResult.temp_password)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 6,
                            background: '#25D366', color: '#fff',
                            fontSize: 13, fontWeight: 600,
                            textDecoration: 'none', cursor: 'pointer',
                          }}
                        >
                          Enviar por WhatsApp
                        </a>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: 12 }}
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Teléfono: ${inviteResult.phone}\nContraseña: ${inviteResult.temp_password}`
                            )
                          }}
                        >
                          Copiar
                        </button>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>
                        El empleado deberá cambiar su contraseña en el primer inicio de sesión.
                      </span>
                    </div>
                  )}
                  {inviteError && (
                    <div className="alert-error" style={{ marginBottom: '1.2rem' }}>
                      {inviteError}
                    </div>
                  )}
                  <form onSubmit={handleInvite}>
                    <div className="field-group">
                      <label className="field-label">Nombre del empleado</label>
                      <input
                        className="field-input"
                        type="text"
                        value={inviteForm.name}
                        onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                        placeholder="María García"
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Teléfono</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          value={inviteForm.countryCode}
                          onChange={e => setInviteForm({ ...inviteForm, countryCode: e.target.value })}
                          className="field-input"
                          style={{
                            width: 130, padding: '10px 8px',
                            cursor: 'pointer', appearance: 'auto',
                          }}
                        >
                          <option value="+52">MX +52</option>
                          <option value="+57">CO +57</option>
                          <option value="+54">AR +54</option>
                          <option value="+56">CL +56</option>
                          <option value="+51">PE +51</option>
                          <option value="+593">EC +593</option>
                          <option value="+58">VE +58</option>
                          <option value="+502">GT +502</option>
                          <option value="+503">SV +503</option>
                          <option value="+504">HN +504</option>
                          <option value="+506">CR +506</option>
                          <option value="+507">PA +507</option>
                          <option value="+591">BO +591</option>
                          <option value="+595">PY +595</option>
                          <option value="+598">UY +598</option>
                          <option value="+53">CU +53</option>
                          <option value="+1">US +1</option>
                          <option value="+34">ES +34</option>
                        </select>
                        <input
                          className="field-input"
                          type="tel"
                          value={inviteForm.phone}
                          onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })}
                          placeholder="55 1234 5678"
                          required
                          style={{ flex: 1 }}
                        />
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Solo los dígitos locales, sin código de país
                      </p>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Contraseña para el empleado</label>
                      <input
                        className="field-input"
                        type="text"
                        value={inviteForm.customPassword}
                        onChange={e => setInviteForm({ ...inviteForm, customPassword: e.target.value })}
                        placeholder="ej: tienda2024"
                      />
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Escoge una contraseña fácil de compartir. Si la dejas vacía, se genera una automática.
                      </p>
                    </div>
                    <button className="btn-primary" type="submit" style={{ marginTop: 8 }}>
                      Crear acceso
                    </button>
                  </form>
                </div>
              )}

              {/* Sub-tab: Lista de empleados registrados */}
              {inviteSubTab === 'list' && (
                <div>
                  {teamMembers.length === 0 ? (
                    <EmptyState icon="+" text="No hay empleados registrados. Invita al primero desde 'Nuevo empleado'." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {teamMembers.map(m => (
                        <div key={m.id} className="card" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {m.name || 'Sin nombre'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {m.phone}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 8 }}>
                              <span>Creado: {new Date(m.created_at).toLocaleDateString()}</span>
                              {m.must_change_password && (
                                <span style={{ color: 'var(--accent)' }}>Pendiente de activar</span>
                              )}
                            </div>
                          </div>
                          <button
                            className="btn-danger"
                            onClick={() => handleRemoveEmployee(m.id)}
                            disabled={removingId === m.id}
                            style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
                          >
                            {removingId === m.id ? '...' : 'Eliminar'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function ProposalItem({ proposal: p, onAction, actioning }) {
  const [expanded, setExpanded] = useState(false)
  const preview = p.proposed_fact
    ? p.proposed_fact.length > 89
      ? p.proposed_fact.slice(0, 89) + '…'
      : p.proposed_fact
    : 'Sin descripción'

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header — siempre visible, clic para expandir */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', textAlign: 'left',
        }}
      >
        <span className="badge badge-domain" style={{ flexShrink: 0 }}>{p.domain || 'general'}</span>
        <span style={{
          flex: 1, fontSize: 13, color: 'var(--text-primary)',
          lineHeight: 1.4, fontWeight: 500,
        }}>
          {expanded ? p.proposed_fact || 'Sin descripción' : preview}
        </span>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)', flexShrink: 0,
          transition: 'transform 0.15s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▾</span>
      </button>

      {/* Detalle expandido */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          {p.category && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, marginTop: 10 }}>
              Categoría: <strong>{p.category}</strong>
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: p.category ? 0 : 12 }}>
            <button
              className="btn-success"
              onClick={() => onAction(p.id, 'approve')}
              disabled={!!actioning}
              style={{ flex: 1 }}
            >
              {actioning === 'approve' ? '...' : '✓ Aprobar'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => onAction(p.id, 'reject')}
              disabled={!!actioning}
              style={{ flex: 1 }}
            >
              {actioning === 'reject' ? '...' : 'Descartar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: 4 }}>
        {title}
      </h2>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{subtitle}</p>}
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div style={{
      textAlign: 'center', padding: '3rem 1rem',
      color: 'var(--text-muted)', fontSize: 14,
    }}>
      <div style={{ fontSize: '1.8rem', marginBottom: 10, opacity: 0.4 }}>{icon}</div>
      {text}
    </div>
  )
}

function UnansweredItem({ question, onResolve, saving }) {
  const [answer, setAnswer] = useState('')
  return (
    <div className="card">
      <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.5 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Pregunta del empleado
        </span>
        "{question.question}"
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="field-input"
          type="text"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Escribe la respuesta oficial..."
          style={{ flex: 1 }}
        />
        <button
          className="btn-primary"
          onClick={() => onResolve(question.id, answer)}
          disabled={saving || !answer.trim()}
          style={{ width: 'auto', padding: '10px 16px', whiteSpace: 'nowrap' }}
        >
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
