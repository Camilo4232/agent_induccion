import { useState } from 'react'
import { teachAPI } from '../services/api'
import VoiceButton from './VoiceButton'

const EXAMPLES = [
  'Si el cliente pide descuento, máximo el 10% si compra más de $200.000',
  'El proveedor de lácteos llega los martes. Si no llega antes de las 10am, llamar al 310-xxx',
  'Los clientes del conjunto Los Pinos tienen precio especial en productos de limpieza',
]

export default function TeachInput({ onSaved }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [voiceState, setVoiceState] = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setError('')
    setResults([])
    setLoading(true)
    try {
      const { data } = await teachAPI.teach(text)
      setResults(data)
      if (data.some(r => r.saved)) onSaved?.()
      setText('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '1rem' }}>
          <textarea
            className="teach-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Escribe en lenguaje natural lo que quieres enseñar...&#10;&#10;Ej: Si el cliente pide descuento, máximo el 10% si compra más de $200.000"
            rows={4}
          />
          {error && <p style={{ color: '#e74c3c', fontSize: 13, marginTop: 6 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <VoiceButton
              disabled={loading}
              onTranscript={(t) => setText(prev => prev ? prev + ' ' + t : t)}
              onStateChange={setVoiceState}
            />
            {voiceState === 'idle' && (
              <button
                className="btn-primary"
                type="submit"
                disabled={loading || !text.trim()}
                style={{ width: 'auto', padding: '10px 20px' }}
              >
                {loading ? 'Procesando...' : 'Enseñar →'}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Examples */}
      {results.length === 0 && !loading && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Ejemplos
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {EXAMPLES.map((ex, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setText(ex)}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '9px 12px', textAlign: 'left',
                  color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', lineHeight: 1.4,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: 8 }} className="fade-in">
          {results.map((r, i) => (
            <div key={i}>
              {r.needs_clarification ? (
                <div style={{
                  background: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.2)',
                  borderRadius: 10, padding: '1rem',
                }}>
                  <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Necesito aclaración
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {r.clarification_question}
                  </p>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(39,174,96,0.06)', border: '1px solid rgba(39,174,96,0.2)',
                  borderRadius: 10, padding: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#2ecc71', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      ✓ Guardado
                    </span>
                    <span className="badge badge-domain">{r.domain || 'general'}</span>
                    <span className="badge badge-domain">{r.category}</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.fact}</p>
                  {r.conflict_warning && (
                    <div style={{
                      marginTop: 10, padding: '8px 10px',
                      background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)',
                      borderRadius: 8,
                    }}>
                      <p style={{ fontSize: 12, color: '#e74c3c' }}>
                        ⚡ {r.conflict_warning.message}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
