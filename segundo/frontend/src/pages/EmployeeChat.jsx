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
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const { data } = await askAPI.ask(question, sessionId)
      setSessionId(data.session_id)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        confidence: data.confidence,
        tools_used: data.tools_used || [],
        knowledge_flagged: data.knowledge_flagged || false,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Hubo un error al contactar a Segundo. Intenta de nuevo.',
        confidence: 'none',
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
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
            onClick={() => { logout(); navigate('/login') }}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                      <div className="chat-bubble-assistant">{msg.content}</div>
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
                </div>
              </div>
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
            <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
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
