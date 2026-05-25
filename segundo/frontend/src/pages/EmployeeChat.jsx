import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useStore from '../store/useStore'
import { askAPI, briefingAPI } from '../services/api'
import VoiceButton from '../components/VoiceButton'
import LangSwitcher from '../components/LangSwitcher'
import PricingPanel from '../components/PricingPanel'

function pickIndices(seed, poolSize, count = 3) {
  const idx = []
  let n = seed
  while (idx.length < count && idx.length < poolSize) {
    n = (n * 9301 + 49297) % 233280
    const i = Math.floor((n / 233280) * poolSize)
    if (!idx.includes(i)) idx.push(i)
  }
  return idx
}

export default function EmployeeChat() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [failedMessage, setFailedMessage] = useState(null)
  const [slowWarning, setSlowWarning] = useState(false)
  const [sessions, setSessions] = useState([])
  const [showSessions, setShowSessions] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [sessionsExpanded, setSessionsExpanded] = useState(true)
  const [briefing, setBriefing] = useState(null)
  const [loadingBriefing, setLoadingBriefing] = useState(false)
  const [briefingExpanded, setBriefingExpanded] = useState(true)
  const [voiceState, setVoiceState] = useState('idle')
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const { user, logout } = useStore()
  const navigate = useNavigate()

  // Sugerencias estables por sesión, traducidas según el idioma actual.
  const seed = useMemo(() => Date.now(), [])
  const suggestions = useMemo(() => {
    const pool = t('chat.suggestions', { returnObjects: true })
    const arr = Array.isArray(pool) ? pool : Object.values(pool || {})
    return pickIndices(seed, arr.length, 3).map(i => arr[i])
  }, [t, seed])

  function errorMessage(err) {
    if (!err.response) return t('chat.errors.noConnection')
    const s = err.response?.status
    if (s === 429) return t('chat.errors.rateLimit')
    if (s === 500) return t('chat.errors.server')
    return t('chat.errors.generic')
  }

  // Auto-scroll inteligente: solo si el usuario está al fondo
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setHasNewMessage(false)
    } else if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      setHasNewMessage(true)
    }
  }, [messages, isAtBottom])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setIsAtBottom(atBottom)
    if (atBottom) setHasNewMessage(false)
  }

  function jumpToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setHasNewMessage(false)
  }

  useEffect(() => { loadSessions() }, [])

  async function handleLoadBriefing() {
    setLoadingBriefing(true)
    try {
      const { data } = await briefingAPI.generate()
      setBriefing(data.briefing)
    } catch {
      setBriefing(t('chat.briefingError'))
    } finally {
      setLoadingBriefing(false)
    }
  }

  async function handleSend(e) {
    e?.preventDefault()
    const question = input.trim()
    if (!question || loading) return
    setInput('')
    setFailedMessage(null)
    setSlowWarning(false)
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setIsAtBottom(true)
    setLoading(true)

    const slowTimer = setTimeout(() => setSlowWarning(true), 30000)

    try {
      const { data } = await askAPI.ask(question, sessionId)
      setSessionId(data.session_id)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        confidence: data.confidence,
        tools_used: data.tools_used || [],
        knowledge_flagged: data.knowledge_flagged || false,
        sources: data.sources || [],
      }])
    } catch (err) {
      const msg = errorMessage(err)
      setFailedMessage({ question, error: msg })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: msg,
        confidence: 'error',
        isError: true,
      }])
    } finally {
      clearTimeout(slowTimer)
      setSlowWarning(false)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleRetry() {
    if (failedMessage) {
      setInput(failedMessage.question)
      setFailedMessage(null)
      setMessages(prev => prev.filter(m => !m.isError))
      setTimeout(() => handleSend(), 50)
    }
  }

  async function loadSessions() {
    try {
      const { data } = await askAPI.listSessions()
      setSessions(data)
    } catch {}
  }

  async function selectSession(id) {
    setSessionId(id)
    setMessages([])
    try {
      const { data } = await askAPI.getHistory(id)
      setMessages(data.map(m => ({ role: m.role, content: m.content })))
    } catch {}
    setShowSessions(false)
  }

  function handleNewConversation() {
    setSessionId(null)
    setMessages([])
    setShowSessions(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toolLabel = (tool) => {
    const map = {
      search_pricing: t('chat.tools.pricing'),
      search_returns: t('chat.tools.returns'),
      search_inventory: t('chat.tools.inventory'),
      search_schedule: t('chat.tools.schedule'),
      search_policies: t('chat.tools.policies'),
      search_general: t('chat.tools.general'),
    }
    return map[tool] || tool.replace('search_', '').replace(/_/g, ' ')
  }

  function shouldShowSegundoMark(idx) {
    const msg = messages[idx]
    if (msg.role !== 'assistant') return false
    return !messages.slice(0, idx).some(m => m.role === 'assistant')
  }

  return (
    <div className="app-shell">
      {/* Header — wordmark coherente con el dashboard */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="wordmark">
            Segundo<span className="wordmark-dot" aria-hidden />
          </span>
          <span className="wordmark-tag">{t('chat.tag')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangSwitcher compact />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user?.email}</span>
          <button
            onClick={() => { setShowSessions(s => !s); if (!showSessions) loadSessions() }}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('common.history')}
          </button>
          <button
            onClick={() => setShowPlan(true)}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('owner.tabs.plan')}
          </button>
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('common.exit')}
          </button>
        </div>
      </header>

      {/* Sessions panel */}
      <AnimatePresence>
        {showSessions && (
          <motion.div
            className="sessions-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ maxWidth: 660, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('chat.history')}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={handleNewConversation} className="sessions-new-btn">
                    {t('chat.newConversation')}
                  </button>
                  <button
                    onClick={() => setSessionsExpanded(e => !e)}
                    aria-label={sessionsExpanded ? t('common.collapse') : t('common.expand')}
                    aria-expanded={sessionsExpanded}
                    className="sessions-close"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: sessionsExpanded ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>
              </div>
              <AnimatePresence initial={false}>
                {sessionsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: 'hidden' }}
                  >
                    {sessions.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('chat.noPreviousConversations')}</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {sessions.map(s => (
                          <button
                            key={s.id}
                            onClick={() => selectSession(s.id)}
                            className={`session-item ${s.id === sessionId ? 'is-active' : ''}`}
                          >
                            <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
                              {s.preview || t('chat.emptyConversation')}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                              {s.started_at ? new Date(s.started_at).toLocaleDateString() : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages area */}
      <div
        id="main-content"
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem', position: 'relative' }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Empty state */}
          {messages.length === 0 && (
            <motion.div
              style={{ textAlign: 'center', paddingTop: '3rem' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.005em' }}>
                {t('chat.emptyTitle')}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: '2rem', lineHeight: 1.6, maxWidth: 460, margin: '0 auto 2rem' }}>
                {t('chat.emptySubtitle')}
              </p>

              {briefing ? (
                <motion.div
                  className="briefing-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ position: 'relative' }}
                >
                  <button
                    onClick={() => setBriefingExpanded(e => !e)}
                    aria-label={briefingExpanded ? t('common.collapse') : t('common.expand')}
                    aria-expanded={briefingExpanded}
                    className="briefing-toggle"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: briefingExpanded ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <span className="briefing-label">{t('chat.briefingLabel')}</span>
                  <AnimatePresence initial={false}>
                    {briefingExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <p className="briefing-body" style={{ marginTop: 4 }}>{briefing}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <button
                  onClick={handleLoadBriefing}
                  disabled={loadingBriefing}
                  className="briefing-cta"
                >
                  {loadingBriefing ? t('chat.briefingLoading') : t('chat.briefingCta')}
                </button>
              )}

              {/* Sugerencias */}
              <div style={{ marginTop: '2rem' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'block' }}>
                  {t('chat.suggestionsLabel')}
                </span>
                <div className="chat-suggestions">
                  {suggestions.map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 30) }}
                      className="chip-suggestion"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} role="log" aria-live="polite">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
              >
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div className="chat-bubble-user">{msg.content}</div>
                  </div>
                ) : (
                  <div>
                    {shouldShowSegundoMark(i) && (
                      <span className="chat-segundo-mark">{t('chat.segundoReplies')}</span>
                    )}
                    <div
                      className="chat-bubble-assistant"
                      style={msg.isError ? { borderLeftColor: '#b06b48', background: 'rgba(176,107,72,0.04)' } : undefined}
                    >
                      {msg.content}
                    </div>
                    {/* Badges (sin emojis decorativos) */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {msg.confidence === 'escalated' && (
                        <span className="badge badge-escalated">{t('chat.escalated')}</span>
                      )}
                      {msg.knowledge_flagged && (
                        <span className="badge badge-flagged">{t('chat.knowledgeFlagged')}</span>
                      )}
                      {msg.tools_used && msg.tools_used.filter(tool => tool.startsWith('search_')).length > 0 && (
                        <span className="badge badge-domain">
                          {toolLabel(msg.tools_used.find(tool => tool.startsWith('search_')))}
                        </span>
                      )}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <details className="chat-sources">
                        <summary>{t('chat.viewSources', { count: msg.sources.length })}</summary>
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
          </div>

          {/* Typing indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginTop: '1.25rem' }}
            >
              <div className="chat-bubble-assistant" style={{ padding: '14px 18px', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <span className="chat-typing">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {t('chat.thinking')}
                </span>
              </div>
              {slowWarning && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  {t('chat.slowWarning')}
                </p>
              )}
            </motion.div>
          )}

          {failedMessage && !loading && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
              <button
                onClick={handleRetry}
                className="btn-secondary"
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                {t('chat.retry')}
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <AnimatePresence>
          {hasNewMessage && !isAtBottom && (
            <motion.button
              className="chat-new-msg-chip"
              onClick={jumpToBottom}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              {t('chat.newMessage')}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div
        className={`chat-input-bar ${voiceState === 'recording' ? 'is-recording' : ''}`}
        style={{
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          padding: '0.85rem 1rem',
          transition: 'background 0.3s, border-color 0.3s',
        }}
      >
        {messages.length > 0 && input.length === 0 && !loading && voiceState === 'idle' && (
          <div style={{ maxWidth: 680, margin: '0 auto 8px' }}>
            <div className="chat-suggestions-bar">
              {suggestions.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 30) }}
                  className="chip-suggestion"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>

          <VoiceButton
            disabled={loading}
            onTranscript={(text) => {
              setMessages(prev => [...prev, { role: 'user', content: text }])
              setIsAtBottom(true)
              setLoading(true)
              askAPI.ask(text, sessionId).then(({ data }) => {
                setSessionId(data.session_id)
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: data.response,
                  confidence: data.confidence,
                  tools_used: data.tools_used || [],
                  knowledge_flagged: data.knowledge_flagged || false,
                  sources: data.sources || [],
                }])
              }).catch((err) => {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: errorMessage(err),
                  confidence: 'error',
                  isError: true,
                }])
              }).finally(() => {
                setLoading(false)
                setTimeout(() => inputRef.current?.focus(), 50)
              })
            }}
            onStateChange={setVoiceState}
          />

          {voiceState === 'idle' && (
            <form onSubmit={handleSend} role="search" style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
              <input
                ref={inputRef}
                className="field-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.inputPlaceholder')}
                disabled={loading}
                style={{ flex: 1 }}
                autoFocus
              />
              <button
                className="chat-send-btn"
                type="submit"
                disabled={loading || !input.trim()}
                aria-label={t('chat.sendAria')}
              >
                <span className="chat-send-label">{t('chat.sendLabel')}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>
          )}

          {voiceState === 'recording' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, paddingLeft: 8 }}>
              <span className="recording-pulse" aria-hidden />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('chat.listening')}</span>
            </div>
          )}

          {voiceState === 'transcribing' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, paddingLeft: 8 }}>
              <span className="chat-typing-dot" />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('chat.transcribing')}</span>
            </div>
          )}

        </div>
      </div>

      <AnimatePresence>
        {showPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowPlan(false)}
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
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 980,
                width: '100%',
                background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: 24,
                position: 'relative',
              }}
            >
              <button
                onClick={() => setShowPlan(false)}
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
              <PricingPanel readOnly />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
