import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGS } from '../i18n'

const LABELS = { es: 'ES', en: 'EN', pt: 'PT' }

export default function LangSwitcher({ compact = false }) {
  const { i18n } = useTranslation()
  const current = (i18n.resolvedLanguage || i18n.language || 'es').slice(0, 2)

  function change(lang) {
    if (lang === current) return
    i18n.changeLanguage(lang)
  }

  return (
    <div className={`lang-switcher ${compact ? 'lang-switcher--compact' : ''}`} role="group" aria-label="Language">
      {SUPPORTED_LANGS.map((lng) => (
        <button
          key={lng}
          onClick={() => change(lng)}
          className={`lang-btn ${current === lng ? 'is-active' : ''}`}
          aria-pressed={current === lng}
          type="button"
        >
          {LABELS[lng]}
        </button>
      ))}
    </div>
  )
}
