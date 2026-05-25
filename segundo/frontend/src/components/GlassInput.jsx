import { useState, forwardRef } from 'react'
import { motion } from 'framer-motion'

const GlassInput = forwardRef(function GlassInput(
  { label, type = 'text', value, onChange, placeholder, required, autoFocus, suffix, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const filled = value !== undefined && value !== ''
  const float = focused || filled

  return (
    <div className="glass-field">
      <motion.label
        className="glass-label"
        animate={{
          y: float ? -22 : 0,
          scale: float ? 0.78 : 1,
          color: focused ? 'var(--accent)' : 'var(--text-secondary)',
        }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      >
        {label}
      </motion.label>

      <div className={`glass-input-wrap ${focused ? 'is-focused' : ''}`}>
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={float ? placeholder : ''}
          required={required}
          autoFocus={autoFocus}
          className="glass-input"
          {...rest}
        />
        {suffix}
        <motion.span
          className="glass-underline"
          initial={false}
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        />
      </div>
    </div>
  )
})

export default GlassInput
