import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PricingPanel from '../components/PricingPanel'
import LangSwitcher from '../components/LangSwitcher'

export default function Pricing() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen" style={{ background: '#000', color: '#fff', minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 22 }}>
          Segundo<span style={{ color: '#fbbf24' }}>.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangSwitcher compact />
          <button
            onClick={() => navigate('/login')}
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('auth.signIn', 'Iniciar sesión')}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
        <PricingPanel />
      </main>
    </div>
  )
}
