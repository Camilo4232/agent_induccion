import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Primary CTA button.
 * Per UX brief: keep ripple + halo (Material/known signals), drop the magnetic offset.
 * Brand: text on gold must be near-black for contrast (gold-on-gold-bg → 8.2:1).
 */
export default function MagneticButton({
  children,
  loading,
  disabled,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
}) {
  const ref = useRef(null)
  const [ripples, setRipples] = useState([])

  function handleClick(e) {
    if (disabled || loading) return
    const rect = ref.current.getBoundingClientRect()
    const id = Date.now() + Math.random()
    const rx = e.clientX - rect.left
    const ry = e.clientY - rect.top
    setRipples((r) => [...r, { id, x: rx, y: ry }])
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 700)
    onClick?.(e)
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`magnetic-btn magnetic-btn-${variant} ${className}`}
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
    >
      <span className="magnetic-halo" aria-hidden />
      <span className="magnetic-content">
        {loading ? <span className="magnetic-spinner" aria-hidden /> : children}
      </span>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="magnetic-ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}
    </motion.button>
  )
}
