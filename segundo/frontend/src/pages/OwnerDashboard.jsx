import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useStore from '../store/useStore'
import { teachAPI, unansweredAPI, inviteAPI, proposalsAPI, teamAPI, notificationsAPI, analyticsAPI, templatesAPI } from '../services/api'
import TeachInput from '../components/TeachInput'
import KnowledgeCard from '../components/KnowledgeCard'
import LangSwitcher from '../components/LangSwitcher'
import PricingPanel from '../components/PricingPanel'

function getGreeting(name, t) {
  const h = new Date().getHours()
  const part = h < 12 ? t('owner.greeting.morning') : h < 19 ? t('owner.greeting.afternoon') : t('owner.greeting.evening')
  const first = (name || '').split(' ')[0] || ''
  return first ? `${part}, ${first}` : part
}

// Animated count-up
function CountUp({ value, duration = 700, suffix = '', prefix = '' }) {
  const [display, setDisplay] = useState(0)
  const numericValue = typeof value === 'number'
    ? value
    : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0
  useEffect(() => {
    let start
    let raf
    const from = 0
    const tick = (ts) => {
      if (!start) start = ts
      const t = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (numericValue - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [numericValue, duration])
  const formatted = Number.isInteger(numericValue)
    ? Math.round(display).toString()
    : display.toFixed(0)
  return <>{prefix}{formatted}{suffix}</>
}

export default function OwnerDashboard() {
  const { t } = useTranslation()
  const TABS = [
    { id: 'teach',      label: t('owner.tabs.teach') },
    { id: 'knowledge',  label: t('owner.tabs.knowledge') },
    { id: 'inbox',      label: t('owner.tabs.inbox'),  badge: 'inbox' },
    { id: 'analytics',  label: t('owner.tabs.analytics') },
    { id: 'invite',     label: t('owner.tabs.invite') },
    { id: 'plan',       label: t('owner.tabs.plan') },
  ]
  const INBOX_FILTERS = [
    { id: 'unanswered', label: t('owner.inbox.filterUnanswered') },
    { id: 'proposals',  label: t('owner.inbox.filterProposals') },
    { id: 'conflicts',  label: t('owner.inbox.filterConflicts') },
  ]
  const [tab, setTab] = useState('teach')
  const [inboxFilter, setInboxFilter] = useState('unanswered')
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
  const [dismissing, setDismissing] = useState({})
  const [actioning, setActioning] = useState({})
  const [unansweredHistory, setUnansweredHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
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
  const [showBulk, setShowBulk] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const { user, logout } = useStore()
  const navigate = useNavigate()

  // Animated tab indicator
  const tabBarRef = useRef(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  useLayoutEffect(() => {
    const bar = tabBarRef.current
    if (!bar) return
    const active = bar.querySelector('.tab-btn.active')
    if (active) {
      const barRect = bar.getBoundingClientRect()
      const r = active.getBoundingClientRect()
      setIndicator({ left: r.left - barRect.left + bar.scrollLeft, width: r.width })
    }
  }, [tab])

  useEffect(() => {
    if (tab === 'teach')      loadTemplates()
    if (tab === 'knowledge')  loadKnowledge()
    if (tab === 'inbox') {
      if (inboxFilter === 'unanswered') loadUnanswered()
      if (inboxFilter === 'proposals')  loadProposals()
      if (inboxFilter === 'conflicts')  loadConflicts()
    }
    if (tab === 'analytics')  loadAnalytics()
    if (tab === 'invite')     loadTeam()
  }, [tab, inboxFilter])

  useEffect(() => {
    if (tab !== 'knowledge') return
    const timer = setTimeout(() => loadKnowledge(), 300)
    return () => clearTimeout(timer)
  }, [knowledgeSearch, knowledgeCategory, knowledgePage])

  // Load counts on mount for badges
  useEffect(() => {
    unansweredAPI.list().then(r => setUnanswered(r.data)).catch(() => {})
    proposalsAPI.list().then(r => setProposals(r.data)).catch(() => {})
    proposalsAPI.listConflicts().then(r => setConflicts(r.data)).catch(() => {})
    notificationsAPI.count().then(r => setUnreadCount(r.data.unread)).catch(() => {})
    analyticsAPI.summary().then(r => setAnalytics(r.data)).catch(() => {})
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
    if (!confirm(t('owner.invite.removeConfirm'))) return
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
      const removed = unanswered.find(q => q.id === id)
      setUnanswered(prev => prev.filter(q => q.id !== id))
      if (removed) {
        setUnansweredHistory(prev => [
          { ...removed, resolved: true, _action: 'resolved' },
          ...prev,
        ])
      }
    } finally {
      setResolving(r => ({ ...r, [id]: false }))
    }
  }

  async function handleDismiss(id) {
    if (!confirm(t('owner.inbox.dismissConfirm'))) return
    setDismissing(d => ({ ...d, [id]: true }))
    try {
      await unansweredAPI.dismiss(id)
      const removed = unanswered.find(q => q.id === id)
      setUnanswered(prev => prev.filter(q => q.id !== id))
      if (removed) {
        setUnansweredHistory(prev => [
          { ...removed, resolved: true, _action: 'dismissed' },
          ...prev,
        ])
      }
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      alert(
        status === 404
          ? 'No se pudo descartar: el endpoint DELETE /unanswered/{id} no responde. ¿Reiniciaste el backend?'
          : `Error al descartar (${status || 'red'})${detail ? ': ' + detail : ''}`
      )
    } finally {
      setDismissing(d => ({ ...d, [id]: false }))
    }
  }

  async function loadHistory() {
    try {
      const { data } = await unansweredAPI.history()
      setUnansweredHistory(data.map(q => ({ ...q, _action: 'resolved' })))
    } catch {}
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
      setInviteError(err.response?.data?.detail || t('owner.invite.errorCreate'))
    }
  }

  function buildWhatsAppLink(phone, name, password) {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const text = t('owner.invite.whatsappMessage', { name, phone, password })
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

  const inboxCount = unanswered.length + proposals.length + conflicts.length
  const badgeCounts = { inbox: inboxCount }

  const welcomeMsg = (() => {
    if (unanswered.length > 0)
      return t('owner.welcome.unanswered', { count: unanswered.length })
    if (proposals.length > 0)
      return t('owner.welcome.proposals', { count: proposals.length })
    if (conflicts.length > 0)
      return t('owner.welcome.conflicts', { count: conflicts.length })
    return t('owner.welcome.allCaughtUp')
  })()

  return (
    <div className="app-shell">
      {/* Header — wordmark + actions */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="wordmark">
            Segundo<span className="wordmark-dot" aria-hidden />
          </span>
          <span className="wordmark-tag">{t('owner.tag')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangSwitcher compact />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user?.email}</span>
          <div style={{ position: 'relative' }}>
            <button
              className="notif-trigger"
              onClick={() => { setShowNotifications(s => !s); if (!showNotifications) loadNotifications() }}
              aria-label={t('owner.notifications.title')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  className="notif-dropdown"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <div className="notif-head">
                    <span className="notif-head-title">{t('owner.notifications.title')}</span>
                    {notifications.some(n => !n.read) && (
                      <button onClick={handleMarkAllRead} className="notif-mark-all">
                        {t('owner.notifications.markAllRead')}
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="notif-empty">{t('owner.notifications.empty')}</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`notif-item ${n.read ? '' : 'unread'}`}
                        onClick={() => { if (!n.read) { notificationsAPI.markRead(n.id); setUnreadCount(c => Math.max(0, c-1)); setNotifications(prev => prev.map(x => x.id === n.id ? {...x, read: true} : x)) } }}
                      >
                        <div className="notif-title" style={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
                        <div className="notif-body">{n.body}</div>
                        <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('common.exit')}
          </button>
        </div>
      </header>

      {/* Welcome strip */}
      <div className="welcome-strip">
        <div className="welcome-strip-inner">
          <div>
            <span className="welcome-greet">{getGreeting(user?.name, t)}</span>
            <p>{welcomeMsg}</p>
          </div>
          {inboxCount > 0 && (
            <button
              onClick={() => setTab('inbox')}
              className="btn-secondary"
              style={{ whiteSpace: 'nowrap', fontSize: 12 }}
            >
              {t('owner.welcome.goToInbox', { count: inboxCount })}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" role="tablist" ref={tabBarRef}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            role="tab"
            aria-selected={tab === t.id}
          >
            {t.label}
            {t.badge && badgeCounts[t.badge] > 0 && (
              <span className="tab-badge">{badgeCounts[t.badge]}</span>
            )}
          </button>
        ))}
        <motion.span
          className="tab-indicator"
          animate={{ left: indicator.left, width: indicator.width }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      </div>

      {/* Content */}
      <div id="main-content" style={{ flex: 1, overflow: 'auto', padding: '1.75rem' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>

          {/* Enseñar */}
          {tab === 'teach' && (
            <motion.div
              key="teach"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SectionHeader
                title={t('owner.teach.title')}
                subtitle={t('owner.teach.subtitle')}
              />
              <TeachInput onSaved={() => {}} />

              <div style={{ marginTop: '1.75rem' }}>
                <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('owner.teach.otherWays')}
                </h3>

                {/* Carga masiva — collapsed by default */}
                <div className="card" style={{ padding: 0, marginBottom: 10, overflow: 'hidden' }}>
                  <button
                    onClick={() => setShowBulk(s => !s)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{t('owner.teach.bulkTitle')}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('owner.teach.bulkSubtitle')}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', transform: showBulk ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showBulk && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)' }}>
                          {!bulkPreview && (
                            <>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
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
                                      setBulkResult({ error: err.response?.data?.detail || t('owner.teach.errorProcess') })
                                    } finally {
                                      setBulkUploading(false)
                                    }
                                  }}
                                  style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}
                                >
                                  {bulkUploading ? t('owner.teach.analyzing') : t('owner.teach.analyzeFile')}
                                </button>
                              </div>
                              {bulkResult && (
                                <div style={{ marginTop: 8, fontSize: 12, color: bulkResult.error ? 'var(--danger)' : 'var(--success)' }}>
                                  {bulkResult.error || t('owner.teach.savedSummary', { saved: bulkResult.saved, errors: bulkResult.errors })}
                                </div>
                              )}
                            </>
                          )}

                          {bulkPreview && (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                  {t('owner.teach.selected', { selected: Object.values(bulkSelected).filter(Boolean).length, total: bulkPreview.length })}
                                </span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={() => {
                                      const all = {}
                                      const allSelected = Object.values(bulkSelected).every(Boolean)
                                      bulkPreview.forEach((_, i) => { all[i] = !allSelected })
                                      setBulkSelected(all)
                                    }}
                                    className="btn-secondary"
                                    style={{ fontSize: 11, padding: '4px 10px' }}
                                  >
                                    {Object.values(bulkSelected).every(Boolean) ? t('owner.teach.deselectAll') : t('owner.teach.selectAll')}
                                  </button>
                                  <button
                                    onClick={() => { setBulkPreview(null); setBulkSelected({}); setBulkFile(null) }}
                                    className="btn-secondary"
                                    style={{ fontSize: 11, padding: '4px 10px' }}
                                  >
                                    {t('common.cancel')}
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
                                      background: bulkSelected[i] ? 'var(--surface-elevated)' : 'transparent',
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
                                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--accent-dim)', color: 'var(--gold-400)' }}>{fact.category}</span>
                                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>{fact.domain}</span>
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
                                    setBulkResult({ error: err.response?.data?.detail || t('owner.teach.errorSave') })
                                  } finally {
                                    setBulkSaving(false)
                                  }
                                }}
                                style={{ width: '100%', padding: '8px 16px', fontSize: 12 }}
                              >
                                {bulkSaving ? t('owner.teach.saving') : t('owner.teach.saveFacts', { count: Object.values(bulkSelected).filter(Boolean).length })}
                              </button>
                              {bulkResult && (
                                <div style={{ marginTop: 8, fontSize: 12, color: bulkResult.error ? 'var(--danger)' : 'var(--success)' }}>
                                  {bulkResult.error || t('owner.teach.savedOk', { count: bulkResult.saved })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Plantillas */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    onClick={() => setShowTemplates(s => !s)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{t('owner.teach.templatesTitle')}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('owner.teach.templatesSubtitle')}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', transform: showTemplates ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showTemplates && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '12px 18px 16px', borderTop: '1px solid var(--border)' }}>
                          {templates.length === 0 ? (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('owner.teach.templatesEmpty')}</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {templates.map(tpl => (
                                <div key={tpl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{tpl.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('owner.teach.templateFactsCount', { count: tpl.facts_count })}</div>
                                  </div>
                                  <button
                                    className="btn-secondary"
                                    disabled={loadingTemplate === tpl.id}
                                    onClick={async () => {
                                      setLoadingTemplate(tpl.id)
                                      try {
                                        await templatesAPI.load(tpl.id)
                                        alert(t('owner.teach.templateLoaded', { name: tpl.name }))
                                      } catch {
                                        alert(t('owner.teach.templateError'))
                                      } finally {
                                        setLoadingTemplate(null)
                                      }
                                    }}
                                    style={{ fontSize: 12, padding: '6px 12px' }}
                                  >
                                    {loadingTemplate === tpl.id ? '...' : t('owner.teach.templateLoad')}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* Manual */}
          {tab === 'knowledge' && (
            <motion.div
              key="knowledge"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SectionHeader
                title={t('owner.knowledge.title')}
                subtitle={t('owner.knowledge.subtitle', { filtered: filteredKnowledge.length, total: knowledge.length })}
                right={
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/knowledge/export?format=json`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}
                    >
                      {t('owner.knowledge.exportJson')}
                    </a>
                    <a
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/knowledge/export?format=csv`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}
                    >
                      {t('owner.knowledge.exportCsv')}
                    </a>
                  </div>
                }
              />

              <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
                <input
                  className="field-input"
                  type="text"
                  value={knowledgeSearch}
                  onChange={e => { setKnowledgeSearch(e.target.value); setKnowledgePage(1) }}
                  placeholder={t('owner.knowledge.search')}
                  style={{ flex: 1, minWidth: 200 }}
                />
                <select
                  className="field-input"
                  value={knowledgeCategory}
                  onChange={e => { setKnowledgeCategory(e.target.value); setKnowledgePage(1) }}
                  style={{ width: 'auto', minWidth: 180, cursor: 'pointer', appearance: 'auto' }}
                >
                  <option value="">{t('owner.knowledge.allCategories')}</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {pagedKnowledge.length === 0 ? (
                <EmptyStateV2
                  icon="≡"
                  title={knowledgeSearch ? t('owner.knowledge.emptyTitleSearch') : t('owner.knowledge.emptyTitleNoSearch')}
                  body={knowledgeSearch
                    ? t('owner.knowledge.emptyBodySearch')
                    : t('owner.knowledge.emptyBodyNoSearch')}
                  ctaLabel={knowledgeSearch ? null : t('owner.knowledge.goToTeach')}
                  onCta={() => setTab('teach')}
                />
              ) : (
                <>
                  <motion.div
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.04 } },
                    }}
                  >
                    {pagedKnowledge.map(entry => (
                      <motion.div
                        key={entry.id}
                        variants={{
                          hidden: { opacity: 0, y: 8 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.25 }}
                      >
                        <KnowledgeCard entry={entry} onUpdate={loadKnowledge} onDelete={loadKnowledge} />
                      </motion.div>
                    ))}
                  </motion.div>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1.5rem' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => setKnowledgePage(p => Math.max(1, p - 1))}
                        disabled={knowledgePage === 1}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                      >
                        {t('owner.knowledge.previous')}
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
                        {t('owner.knowledge.next')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Bandeja unificada */}
          {tab === 'inbox' && (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SectionHeader
                title={t('owner.inbox.title')}
                subtitle={t('owner.inbox.subtitle')}
              />

              <div className="subfilter-bar">
                {INBOX_FILTERS.map(f => {
                  const counts = { unanswered: unanswered.length, proposals: proposals.length, conflicts: conflicts.length }
                  return (
                    <button
                      key={f.id}
                      onClick={() => setInboxFilter(f.id)}
                      className={`subfilter-btn ${inboxFilter === f.id ? 'active' : ''}`}
                    >
                      {f.label}
                      {counts[f.id] > 0 && <span className="subfilter-count">{counts[f.id]}</span>}
                    </button>
                  )
                })}
              </div>

              <AnimatePresence mode="wait">
                {inboxFilter === 'unanswered' && (
                  <motion.div key="u" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    {unanswered.length === 0 ? (
                      <EmptyStateV2
                        icon="✓"
                        title={t('owner.inbox.unansweredEmptyTitle')}
                        body={t('owner.inbox.unansweredEmptyBody')}
                      />
                    ) : (
                      <motion.div
                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                      >
                        {unanswered.map(q => (
                          <motion.div
                            key={q.id}
                            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                          >
                            <UnansweredItem question={q} onResolve={handleResolve} onDismiss={handleDismiss} saving={resolving[q.id]} dismissing={dismissing[q.id]} t={t} />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}

                    {/* Activity log toggle */}
                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !showHistory
                          setShowHistory(next)
                          if (next) loadHistory()
                        }}
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontWeight: 600,
                        }}
                      >
                        {showHistory ? t('owner.inbox.activityHide') : t('owner.inbox.activityToggle')}
                      </button>

                      <AnimatePresence initial={false}>
                        {showHistory && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            style={{ overflow: 'hidden', marginTop: 12 }}
                          >
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
                              {t('owner.inbox.activityLog')}
                            </div>
                            {unansweredHistory.length === 0 ? (
                              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                {t('owner.inbox.activityEmpty')}
                              </p>
                            ) : (
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {unansweredHistory.map(item => (
                                  <li
                                    key={item.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      padding: '8px 12px',
                                      background: 'var(--bg-card)',
                                      border: '1px solid var(--border)',
                                      borderRadius: 8,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 10,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        background: item._action === 'dismissed' ? 'rgba(176,107,72,0.12)' : 'rgba(76,175,80,0.12)',
                                        color: item._action === 'dismissed' ? '#b06b48' : '#4caf50',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {item._action === 'dismissed' ? t('owner.inbox.activityDismissed') : t('owner.inbox.activityResolved')}
                                    </span>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, lineHeight: 1.4 }}>
                                      "{item.question}"
                                    </span>
                                    {item.created_at && (
                                      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {inboxFilter === 'proposals' && (
                  <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    {proposals.length === 0 ? (
                      <EmptyStateV2
                        icon="◎"
                        title={t('owner.inbox.proposalsEmptyTitle')}
                        body={t('owner.inbox.proposalsEmptyBody')}
                      />
                    ) : (
                      <motion.div
                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                      >
                        {proposals.map(p => (
                          <motion.div
                            key={p.id}
                            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                          >
                            <ProposalItem proposal={p} onAction={handleProposalAction} actioning={actioning[p.id]} t={t} />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {inboxFilter === 'conflicts' && (
                  <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    {conflicts.length === 0 ? (
                      <EmptyStateV2
                        icon="✓"
                        title={t('owner.inbox.conflictsEmptyTitle')}
                        body={t('owner.inbox.conflictsEmptyBody')}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {conflicts.map(c => (
                          <div key={c.id} className="card" style={{ borderColor: 'rgba(184, 57, 42, 0.25)' }}>
                            <div className="conflict-label">{t('owner.inbox.conflictLabel')}</div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>
                              {c.explanation || t('owner.inbox.conflictDefault')}
                            </p>
                            {c.fact_a_text && c.fact_b_text && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                <div style={{ padding: '12px', background: 'var(--accent-dim)', border: '1px solid var(--border)', borderRadius: 10 }}>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{t('owner.inbox.factA')}</div>
                                  <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>{c.fact_a_text}</p>
                                </div>
                                <div style={{ padding: '12px', background: 'var(--accent-dim)', border: '1px solid var(--border)', borderRadius: 10 }}>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{t('owner.inbox.factB')}</div>
                                  <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>{c.fact_b_text}</p>
                                </div>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {c.fact_a_id && (
                                <button className="btn-success" onClick={() => handleResolveConflict(c.id, c.fact_a_id)} disabled={actioning[c.id] === 'resolving'} style={{ fontSize: 12, flex: 1 }}>
                                  {actioning[c.id] === 'resolving' ? '...' : t('owner.inbox.keepA')}
                                </button>
                              )}
                              {c.fact_b_id && (
                                <button className="btn-success" onClick={() => handleResolveConflict(c.id, c.fact_b_id)} disabled={actioning[c.id] === 'resolving'} style={{ fontSize: 12, flex: 1 }}>
                                  {actioning[c.id] === 'resolving' ? '...' : t('owner.inbox.keepB')}
                                </button>
                              )}
                              <button className="btn-secondary" onClick={() => handleResolveConflict(c.id)} disabled={actioning[c.id] === 'resolving'} style={{ fontSize: 12, flex: 1 }}>
                                {actioning[c.id] === 'resolving' ? '...' : t('owner.inbox.keepBoth')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Métricas */}
          {tab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SectionHeader
                title={t('owner.analytics.title')}
                subtitle={t('owner.analytics.subtitle')}
              />
              {!analytics ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('owner.analytics.loading')}</p>
              ) : (
                <>
                  <div className="kpi-grid">
                    <div className="kpi-card kpi-hero">
                      <div className="kpi-label">{t('owner.analytics.resolutionRate')}</div>
                      <div className="kpi-value">
                        <CountUp value={Math.round(analytics.resolution_rate * 100)} suffix="%" />
                      </div>
                      <div className="kpi-trend">{t('owner.analytics.resolutionRateHint')}</div>
                    </div>
                    {[
                      { label: t('owner.analytics.questionsToday'),    value: analytics.total_questions_today },
                      { label: t('owner.analytics.questionsWeek'),     value: analytics.total_questions_week },
                      { label: t('owner.analytics.unansweredPending'), value: analytics.unanswered_pending },
                      { label: t('owner.analytics.knowledgeCount'),    value: analytics.knowledge_entries_count },
                      { label: t('owner.analytics.knowledgeGrowth'),   value: analytics.knowledge_growth_week, prefix: '+' },
                      { label: t('owner.analytics.activeEmployees'),   value: analytics.active_employees_today },
                    ].map((m, i) => (
                      <div key={i} className="kpi-card">
                        <div className="kpi-label">{m.label}</div>
                        <div className="kpi-value">
                          <CountUp value={m.value} prefix={m.prefix || ''} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {knowledgeUsage && (
                    <>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 10, marginTop: '1.5rem' }}>{t('owner.analytics.topUsedTitle')}</h3>
                      {knowledgeUsage.top_used.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t('owner.analytics.topUsedEmpty')}</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.75rem' }}>
                          {knowledgeUsage.top_used.map(e => (
                            <div key={e.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                              <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{e.fact.length > 90 ? e.fact.slice(0, 90) + '…' : e.fact}</span>
                              <span style={{ fontSize: 12, color: 'var(--gold-500)', fontWeight: 600, marginLeft: 12, flexShrink: 0, fontFamily: 'var(--font-serif)' }}>{e.usage_count}×</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 10 }}>{t('owner.analytics.neverUsedTitle')}</h3>
                      {knowledgeUsage.never_used.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('owner.analytics.neverUsedEmpty')}</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {knowledgeUsage.never_used.map(e => (
                            <div key={e.id} className="card" style={{ padding: '10px 14px', opacity: 0.65 }}>
                              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.fact.length > 90 ? e.fact.slice(0, 90) + '…' : e.fact}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{e.category}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Equipo */}
          {tab === 'invite' && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SectionHeader
                title={t('owner.invite.title')}
                subtitle={t('owner.invite.subtitle')}
              />

              <div className="subfilter-bar">
                <button
                  onClick={() => setInviteSubTab('invite')}
                  className={`subfilter-btn ${inviteSubTab === 'invite' ? 'active' : ''}`}
                >
                  {t('owner.invite.newEmployee')}
                </button>
                <button
                  onClick={() => setInviteSubTab('list')}
                  className={`subfilter-btn ${inviteSubTab === 'list' ? 'active' : ''}`}
                >
                  {t('owner.invite.registered')}
                  {teamMembers.length > 0 && <span className="subfilter-count">{teamMembers.length}</span>}
                </button>
              </div>

              {inviteSubTab === 'invite' && (
                <div className="card">
                  {inviteResult && (
                    <div className="alert-success" style={{ marginBottom: '1.2rem' }}>
                      <strong>{inviteResult.message}</strong>
                      <div style={{ margin: '10px 0', padding: '12px 14px', background: 'rgba(45, 138, 82, 0.1)', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>
                          {t('owner.invite.phone')}: <strong>{inviteResult.phone}</strong>
                        </div>
                        <div style={{ fontSize: 12 }}>
                          {t('owner.invite.password')}: <code style={{
                            background: 'rgba(45, 138, 82, 0.18)',
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
                            padding: '9px 16px', borderRadius: 8,
                            background: '#25D366', color: '#fff',
                            fontSize: 13, fontWeight: 600,
                            textDecoration: 'none', cursor: 'pointer',
                          }}
                        >
                          {t('owner.invite.sendWhatsapp')}
                        </a>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: 12 }}
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${t('owner.invite.phone')}: ${inviteResult.phone}\n${t('owner.invite.password')}: ${inviteResult.temp_password}`
                            )
                          }}
                        >
                          {t('owner.invite.copy')}
                        </button>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>
                        {t('owner.invite.mustChangeNote')}
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
                      <label className="field-label">{t('owner.invite.nameLabel')}</label>
                      <input
                        className="field-input"
                        type="text"
                        value={inviteForm.name}
                        onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                        placeholder={t('owner.invite.namePlaceholder')}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">{t('owner.invite.phoneLabel')}</label>
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
                          placeholder={t('owner.invite.phonePlaceholder')}
                          required
                          style={{ flex: 1 }}
                        />
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {t('owner.invite.phoneHelp')}
                      </p>
                    </div>
                    <div className="field-group">
                      <label className="field-label">{t('owner.invite.passwordLabel')}</label>
                      <input
                        className="field-input"
                        type="text"
                        value={inviteForm.customPassword}
                        onChange={e => setInviteForm({ ...inviteForm, customPassword: e.target.value })}
                        placeholder={t('owner.invite.passwordPlaceholder')}
                      />
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {t('owner.invite.passwordHelp')}
                      </p>
                    </div>
                    <button className="btn-primary" type="submit" style={{ marginTop: 8 }}>
                      {t('owner.invite.submit')}
                    </button>
                  </form>
                </div>
              )}

              {inviteSubTab === 'list' && (
                <div>
                  {teamMembers.length === 0 ? (
                    <EmptyStateV2
                      icon="+"
                      title={t('owner.invite.noTeamTitle')}
                      body={t('owner.invite.noTeamBody')}
                      ctaLabel={t('owner.invite.inviteFirst')}
                      onCta={() => setInviteSubTab('invite')}
                    />
                  ) : (
                    <motion.div
                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                      initial="hidden"
                      animate="visible"
                      variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                    >
                      {teamMembers.map(m => (
                        <motion.div
                          key={m.id}
                          className="card"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {m.name || t('owner.invite.noName')}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {m.phone}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 8 }}>
                              <span>{t('owner.invite.memberCreatedAt', { date: new Date(m.created_at).toLocaleDateString() })}</span>
                              {m.must_change_password && (
                                <span style={{ color: 'var(--gold-500)' }}>{t('owner.invite.pendingActivation')}</span>
                              )}
                            </div>
                          </div>
                          <button
                            className="btn-danger"
                            onClick={() => handleRemoveEmployee(m.id)}
                            disabled={removingId === m.id}
                            style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
                          >
                            {removingId === m.id ? '...' : t('owner.invite.remove')}
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PricingPanel />
            </motion.div>
          )}

        </div>
      </div>
    </div>
  )
}

function ProposalItem({ proposal: p, onAction, actioning, t }) {
  const [expanded, setExpanded] = useState(false)
  const preview = p.proposed_fact
    ? p.proposed_fact.length > 89
      ? p.proposed_fact.slice(0, 89) + '…'
      : p.proposed_fact
    : t('owner.inbox.noDescription')

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
          lineHeight: 1.45, fontWeight: 500,
        }}>
          {expanded ? p.proposed_fact || t('owner.inbox.noDescription') : preview}
        </span>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)', flexShrink: 0,
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▾</span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--border)' }}
          >
            <div style={{ padding: '12px 16px 14px' }}>
              {p.category && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {t('owner.inbox.category')}: <strong>{p.category}</strong>
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-success"
                  onClick={() => onAction(p.id, 'approve')}
                  disabled={!!actioning}
                  style={{ flex: 1 }}
                >
                  {actioning === 'approve' ? '...' : t('owner.inbox.approve')}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => onAction(p.id, 'reject')}
                  disabled={!!actioning}
                  style={{ flex: 1 }}
                >
                  {actioning === 'reject' ? '...' : t('owner.inbox.discard')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="section-header-v2">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

function EmptyStateV2({ icon, title, body, ctaLabel, onCta }) {
  return (
    <div className="empty-state-v2">
      <div className="es-mark">{icon}</div>
      <div className="es-title">{title}</div>
      <p className="es-body">{body}</p>
      {ctaLabel && (
        <button className="es-cta" onClick={onCta}>
          {ctaLabel} →
        </button>
      )}
    </div>
  )
}

function UnansweredItem({ question, onResolve, onDismiss, saving, dismissing, t }) {
  const [answer, setAnswer] = useState('')
  const busy = saving || dismissing
  return (
    <div className="card">
      <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.5 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          {t('owner.inbox.questionFromEmployee')}
        </span>
        "{question.question}"
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="field-input"
          type="text"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder={t('owner.inbox.writeAnswer')}
          style={{ flex: 1 }}
        />
        <button
          className="btn-primary"
          onClick={() => onResolve(question.id, answer)}
          disabled={busy || !answer.trim()}
          style={{ width: 'auto', padding: '10px 18px', whiteSpace: 'nowrap' }}
        >
          {saving ? '...' : t('common.save')}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(question.id)}
          disabled={busy}
          aria-label={t('owner.inbox.dismiss')}
          title={t('owner.inbox.dismiss')}
          style={{
            width: 36, height: 36, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-muted)',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          {dismissing ? '...' : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
