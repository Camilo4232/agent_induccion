import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import { transcribeAPI } from '../services/api'

const VoiceButton = forwardRef(function VoiceButton(
  { onTranscript, onStateChange, disabled = false },
  ref
) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [volume, setVolume] = useState(0) // 0-1

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const streamRef = useRef(null)

  function updateState(s) {
    setState(s)
    onStateChange?.(s)
  }

  function showError(msg) {
    setError(msg)
    setTimeout(() => setError(''), 3000)
  }

  // Poll mic volume via AnalyserNode
  function startVolumePolling(stream) {
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    const data = new Uint8Array(analyser.frequencyBinCount)
    function tick() {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      setVolume(Math.min(avg / 80, 1)) // normalize to 0-1
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  function stopVolumePolling() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setVolume(0)
  }

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      startVolumePolling(stream)

      const mediaRecorder = new MediaRecorder(stream)
      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        stopVolumePolling()

        // No audio captured at all — bail immediately
        if (chunksRef.current.length === 0) {
          updateState('idle')
          return
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        updateState('transcribing')
        try {
          const { data } = await transcribeAPI.transcribe(blob)
          if (!data.text) {
            showError('No se detectó voz.')
          } else {
            onTranscript?.(data.text)
            setError('')
          }
        } catch {
          showError('Error al transcribir.')
        } finally {
          updateState('idle')
        }
      }
      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      updateState('recording')
    } catch {
      setError('No se pudo acceder al micrófono.')
      updateState('idle')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  useImperativeHandle(ref, () => ({ stopRecording }))

  // Cleanup on unmount
  useEffect(() => () => {
    stopVolumePolling()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  // Scale: 1.0 at silence, up to 1.5 at full volume
  const scale = 1 + volume * 0.5
  // Glow radius grows with volume
  const glow = Math.round(volume * 24)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

      {/* Idle mic button */}
      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          title="Dictar con voz"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '1.5px solid var(--border)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, background: 'transparent',
            color: 'var(--text-muted)',
            transition: 'border-color 0.15s, color 0.15s, background 0.15s',
            opacity: disabled ? 0.4 : 1,
          }}
          onMouseOver={e => {
            if (!disabled) {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
              e.currentTarget.style.background = 'rgba(212,168,83,0.06)'
            }
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0"/>
            <line x1="12" y1="17" x2="12" y2="22"/>
            <line x1="8" y1="22" x2="16" y2="22"/>
          </svg>
        </button>
      )}

      {/* Recording: animated red orb + stop button */}
      {state === 'recording' && (
        <>
          <div style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: '#ef4444',
              transform: `scale(${scale})`,
              boxShadow: `0 0 ${glow}px rgba(239,68,68,0.6)`,
              transition: 'transform 0.08s ease-out, box-shadow 0.08s ease-out',
            }} />
          </div>
          <button
            type="button"
            onClick={stopRecording}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 8,
              background: '#ef4444', border: 'none',
              color: '#fff', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect width="10" height="10" rx="2"/>
            </svg>
            Detener y enviar
          </button>
        </>
      )}

      {/* Transcribing: dots */}
      {state === 'transcribing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40 }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--accent)', display: 'inline-block',
                animation: 'pulse-dot 1.2s infinite',
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Procesando...
          </span>
        </div>
      )}

      {error && (
        <span style={{ fontSize: 11, color: '#ef4444' }}>{error}</span>
      )}
    </div>
  )
})

export default VoiceButton
