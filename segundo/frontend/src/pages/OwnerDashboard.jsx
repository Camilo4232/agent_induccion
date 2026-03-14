import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { teachAPI, unansweredAPI, inviteAPI, proposalsAPI, teamAPI } from '../services/api'
import TeachInput from '../components/TeachInput'
import KnowledgeCard from '../components/KnowledgeCard'

const TABS = [
  { id: 'teach',      label: 'Enseñar',      icon: '✦' },
  { id: 'knowledge',  label: 'Manual',        icon: '≡' },
  { id: 'unanswered', label: 'Sin respuesta', icon: '?' },
  { id: 'proposals',  label: 'Propuestas',    icon: '◎', badge: 'proposals' },
  { id: 'conflicts',  label: 'Conflictos',    icon: '⚡', badge: 'conflicts' },
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
  const { user, logout } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (tab === 'knowledge')  loadKnowledge()
    if (tab === 'unanswered') loadUnanswered()
    if (tab === 'proposals')  loadProposals()
    if (tab === 'conflicts')  loadConflicts()
    if (tab === 'invite')     loadTeam()
  }, [tab])

  // Load counts on mount for badges
  useEffect(() => {
    proposalsAPI.list().then(r => setProposals(r.data)).catch(() => {})
    proposalsAPI.listConflicts().then(r => setConflicts(r.data)).catch(() => {})
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

  async function handleResolveConflict(id) {
    setActioning(a => ({ ...a, [id]: 'resolving' }))
    try {
      await proposalsAPI.resolveConflict(id)
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
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
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
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Enseñar */}
          {tab === 'teach' && (
            <div className="fade-in">
              <SectionHeader
                title="Enseña al agente"
                subtitle="Escribe en lenguaje natural. Segundo extrae, clasifica y guarda el conocimiento automáticamente."
              />
              <TeachInput onSaved={() => {}} />
            </div>
          )}

          {/* Manual */}
          {tab === 'knowledge' && (
            <div className="fade-in">
              <SectionHeader title="Manual del negocio" subtitle={`${knowledge.length} entradas guardadas`} />
              {knowledge.length === 0 ? (
                <EmptyState icon="≡" text="Aún no hay conocimiento guardado. Ve a Enseñar para comenzar." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {knowledge.map(entry => (
                    <KnowledgeCard key={entry.id} entry={entry} onUpdate={loadKnowledge} onDelete={loadKnowledge} />
                  ))}
                </div>
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
                        ⚡ Posible contradicción
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                        {c.explanation || 'Dos hechos en el manual pueden contradecirse.'}
                      </p>
                      <button
                        className="btn-secondary"
                        onClick={() => handleResolveConflict(c.id)}
                        disabled={actioning[c.id] === 'resolving'}
                        style={{ fontSize: 12 }}
                      >
                        {actioning[c.id] === 'resolving' ? '...' : 'Marcar como resuelto'}
                      </button>
                    </div>
                  ))}
                </div>
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
