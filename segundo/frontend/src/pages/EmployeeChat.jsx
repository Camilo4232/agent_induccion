import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { askAPI, briefingAPI } from '../services/api'
import VoiceButton from '../components/VoiceButton'

export default function EmployeeChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [failedMessage, setFailedMessage] = useState(null)
  const [slowWarning, setSlowWarning] = useState(false)
  const [sessions, setSessions] = useState([])
  const [showSessions, setShowSessions] = useState(false)
  const [briefing, setBriefing] = useState(null)
  const [loadingBriefing, setLoadingBriefing] = useState(false)
  const [voiceState, setVoiceState] = useState('idle') // 'idle' | 'recording' | 'transcribing'
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const { user, logout } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => { loadSessions() }, [])

  async function handleLoadBriefing() {
    setLoadingBriefing(true)
    try {
      const { data } = await briefingAPI.generate()
      setBriefing(data.briefing)
    } catch {
      setBriefing('No pude cargar el resumen. Puedes hacer preguntas directamente.')
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
    setLoading(true)

    // Show slow warning after 30s
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
      const status = err.response?.status
      let errorMsg = 'Hubo un error al contactar a Segundo.'
      if (status === 429) errorMsg = 'Demasiadas preguntas seguidas. Espera un momento.'
      else if (status === 500) errorMsg = 'Error del servidor. Intenta de nuevo.'
      else if (!err.response) errorMsg = 'Sin conexión a internet. Verifica tu red.'

      setFailedMessage({ question, error: errorMsg })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMsg,
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
      // Remove the error message
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
            marginLeft: 4, fontSize: 11, color: 'var(--text-muted)',
            fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>Asistente del negocio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</span>
          <button
            onClick={() => { setShowSessions(s => !s); if (!showSessions) loadSessions() }}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Historial
          </button>
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Sessions sidebar */}
      {showSessions && (
        <div style={{
          background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          padding: '0.75rem 1rem', maxHeight: 300, overflowY: 'auto',
        }}>
          <div style={{ maxWidth: 660, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Conversaciones recientes
              </span>
              <button
                onClick={handleNewConversation}
                style={{
                  fontSize: 12, color: 'var(--accent)', background: 'none',
                  border: '1px solid rgba(212,168,83,0.3)', borderRadius: 6,
                  padding: '4px 10px', cursor: 'pointer',
                }}
              >
                + Nueva
              </button>
            </div>
            {sessions.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No hay conversaciones anteriores.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => selectSession(s.id)}
                    style={{
                      background: s.id === sessionId ? 'rgba(212,168,83,0.08)' : 'transparent',
                      border: '1px solid',
                      borderColor: s.id === sessionId ? 'rgba(212,168,83,0.3)' : 'var(--border)',
                      borderRadius: 8, padding: '8px 12px', textAlign: 'left',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', width: '100%',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
                      {s.preview || 'Conversación vacía'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                      {s.started_at ? new Date(s.started_at).toLocaleDateString() : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div id="main-content" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
        <div style={{ maxWidth: 660, margin: '0 auto' }}>

          {/* Empty state */}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: '4rem' }} className="fade-in">
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: 'var(--accent-dim)', border: '1px solid rgba(212,168,83,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
                fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--accent)',
              }}>S</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                Hola, soy Segundo
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: '1.5rem' }}>
                Pregúntame lo que necesitas saber sobre el negocio
              </p>

              {briefing ? (
                <div style={{
                  background: 'var(--bg-card)', border: '1px solid rgba(212,168,83,0.2)',
                  borderRadius: 12, padding: '1rem 1.2rem', textAlign: 'left', maxWidth: 440, margin: '0 auto',
                }}>
                  <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Resumen del día
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{briefing}</p>
                </div>
              ) : (
                <button
                  onClick={handleLoadBriefing}
                  disabled={loadingBriefing}
                  style={{
                    background: 'var(--accent-dim)', border: '1px solid rgba(212,168,83,0.2)',
                    color: 'var(--accent)', borderRadius: 8, padding: '9px 18px',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {loadingBriefing ? 'Cargando...' : '✦ Ver resumen del día'}
                </button>
              )}

              {/* Quick suggestions */}
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['¿Cuál es el descuento máximo?', '¿Qué hago con una devolución?', '¿Cuándo llega el proveedor?'].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); setTimeout(() => handleSend(), 10) }}
                    style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', borderRadius: 20, padding: '6px 14px',
                      fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseOver={e => { e.target.style.borderColor = 'var(--text-muted)'; e.target.style.color = 'var(--text-primary)' }}
                    onMouseOut={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} role="log" aria-live="polite">
            {messages.map((msg, i) => (
              <div key={i} className="fade-in" style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div className="chat-bubble-user">{msg.content}</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(212,168,83,0.15)', border: '1px solid rgba(212,168,83,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                      }}>S</div>
                      <div className="chat-bubble-assistant" style={msg.isError ? { borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.04)' } : undefined}>{msg.content}</div>
                    </div>
                    {/* Badges */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, marginLeft: 32, flexWrap: 'wrap' }}>
                      {msg.confidence === 'escalated' && (
                        <span className="badge badge-escalated">⚡ Escalado al encargado</span>
                      )}
                      {msg.knowledge_flagged && (
                        <span className="badge badge-flagged">✦ Conocimiento nuevo detectado</span>
                      )}
                      {msg.tools_used && msg.tools_used.filter(t => t.startsWith('search_')).length > 0 && (
                        <span className="badge badge-domain">
                          {msg.tools_used.find(t => t.startsWith('search_'))?.replace('search_', '')}
                        </span>
                      )}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <details style={{ marginTop: 6, marginLeft: 32, fontSize: 12, color: 'var(--text-muted)' }}>
                        <summary style={{ cursor: 'pointer' }}>
                          Basado en {msg.sources.length} hecho(s)
                        </summary>
                        <ul style={{ marginTop: 4, paddingLeft: 16, lineHeight: 1.6 }}>
                          {msg.sources.map((s, idx) => (
                            <li key={idx} style={{ color: 'var(--text-secondary)' }}>{s.fact}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: '1rem' }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: 'rgba(212,168,83,0.15)', border: '1px solid rgba(212,168,83,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: 'var(--accent)',
              }}>S</div>
              <div className="chat-bubble-assistant" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--text-muted)',
                      display: 'inline-block',
                      animation: 'pulse-dot 1.2s infinite',
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                    Segundo está pensando...
                  </span>
                </div>
                {slowWarning && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    Está tardando más de lo normal. Puedes esperar o reintentar.
                  </p>
                )}
              </div>
            </div>
          )}
          {failedMessage && !loading && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button
                onClick={handleRetry}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', borderRadius: 8, padding: '6px 14px',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Reintentar pregunta
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{
        background: voiceState === 'recording' ? 'rgba(220,38,38,0.04)' : 'var(--bg-card)',
        borderTop: voiceState === 'recording' ? '1px solid rgba(220,38,38,0.2)' : '1px solid var(--border)',
        padding: '1rem',
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        <div style={{ maxWidth: 660, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* VoiceButton always mounted — handles its own idle/recording/transcribing UI */}
          <VoiceButton
            disabled={loading}
            onTranscript={(text) => {
              setMessages(prev => [...prev, { role: 'user', content: text }])
              setLoading(true)
              askAPI.ask(text, sessionId).then(({ data }) => {
                setSessionId(data.session_id)
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: data.response,
                  confidence: data.confidence,
                  tools_used: data.tools_used || [],
                  knowledge_flagged: data.knowledge_flagged || false,
                }])
              }).catch(() => {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: 'Hubo un error al contactar a Segundo. Intenta de nuevo.',
                  confidence: 'none',
                }])
              }).finally(() => {
                setLoading(false)
                setTimeout(() => inputRef.current?.focus(), 50)
              })
            }}
            onStateChange={setVoiceState}
          />

          {/* Text input + send — only visible when idle */}
          {voiceState === 'idle' && (
            <form onSubmit={handleSend} role="search" style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
              <input
                ref={inputRef}
                className="field-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe o usa el micrófono..."
                disabled={loading}
                style={{ flex: 1 }}
                autoFocus
              />
              <button
                className="btn-primary"
                type="submit"
                disabled={loading || !input.trim()}
                style={{ width: 'auto', padding: '10px 18px', whiteSpace: 'nowrap' }}
                aria-label="Enviar mensaje"
              >
                {loading ? '...' : '→'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
