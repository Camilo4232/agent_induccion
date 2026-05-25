import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { billingAPI } from '../services/api'
import useStore from '../store/useStore'

const PLANS = [
  {
    id: 'changarro',
    nameKey: 'pricing.plans.changarro.name',
    priceUSD: 19,
    priceCOP: 79900,
    priceBRL: 99,
    employees: 5,
    featuresKey: 'pricing.plans.changarro.features',
  },
  {
    id: 'negocio',
    nameKey: 'pricing.plans.negocio.name',
    priceUSD: 49,
    priceCOP: 199900,
    priceBRL: 249,
    employees: 15,
    highlight: true,
    featuresKey: 'pricing.plans.negocio.features',
  },
  {
    id: 'patron',
    nameKey: 'pricing.plans.patron.name',
    priceUSD: 119,
    priceCOP: 479900,
    priceBRL: 599,
    employees: 30,
    featuresKey: 'pricing.plans.patron.features',
  },
]

const CURRENCIES = [
  { code: 'USD', symbol: '$',    key: 'priceUSD', locale: 'en-US', lang: 'en' },
  { code: 'COP', symbol: '$',    key: 'priceCOP', locale: 'es-CO', lang: 'es' },
  { code: 'BRL', symbol: 'R$ ',  key: 'priceBRL', locale: 'pt-BR', lang: 'pt' },
]

function defaultCurrency(lang) {
  if (lang?.startsWith('pt')) return 'BRL'
  if (lang?.startsWith('en')) return 'USD'
  return 'COP'
}

export default function PricingPanel({ readOnly = false }) {
  const { t, i18n } = useTranslation()
  const { token, user } = useStore()
  const [currency, setCurrency] = useState(() => defaultCurrency(i18n.resolvedLanguage || i18n.language))
  const [currentPlan, setCurrentPlan] = useState(null)
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const curMeta = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0]

  const handleCurrencyChange = (cur) => {
    setCurrency(cur.code)
  }

  const tLocal = (key) => {
    const ns = i18n.getFixedT(curMeta.lang || 'es')
    return ns(key)
  }
  const tLocalArr = (key) => {
    const ns = i18n.getFixedT(curMeta.lang || 'es')
    const val = ns(key, { returnObjects: true })
    return Array.isArray(val) ? val : Object.values(val || {})
  }
  const tLocalInterp = (key, opts) => {
    const ns = i18n.getFixedT(curMeta.lang || 'es')
    return ns(key, opts)
  }

  useEffect(() => {
    if (token && user?.role === 'owner') {
      billingAPI
        .myPlan()
        .then(({ data }) => setCurrentPlan(data.plan))
        .catch(() => {})
    }
  }, [token, user])

  const handleSubscribe = async (planId) => {
    if (readOnly) {
      setMessage({ type: 'info', text: tLocal('pricing.employeeNotice') })
      return
    }
    if (!token || user?.role !== 'owner') {
      window.location.href = `/register?plan=${planId}`
      return
    }
    setBusy(planId)
    setMessage(null)
    try {
      const { data } = await billingAPI.subscribe(planId)
      setCurrentPlan(data.plan)
      setMessage({
        type: 'ok',
        text: tLocalInterp('pricing.subscribed', { plan: tLocal(`pricing.plans.${planId}.name`) }),
      })
    } catch (err) {
      setMessage({
        type: 'err',
        text: err.response?.data?.detail || tLocal('pricing.error'),
      })
    } finally {
      setBusy(null)
    }
  }

  const fmt = (amount) => amount.toLocaleString(curMeta.locale)

  return (
    <div style={{ padding: '8px 4px 32px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: '1.8rem',
            margin: '0 0 8px',
            color: '#fff',
          }}
        >
          {tLocal('pricing.title')}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: 0 }}>
          {tLocal('pricing.subtitle')}
        </p>

        <div
          style={{
            display: 'inline-flex',
            marginTop: 20,
            padding: 4,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            gap: 2,
          }}
        >
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => handleCurrencyChange(c)}
              style={{
                padding: '6px 16px',
                fontSize: 11,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: currency === c.code ? '#fbbf24' : 'transparent',
                color: currency === c.code ? '#000' : 'rgba(255,255,255,0.6)',
                fontWeight: currency === c.code ? 600 : 400,
                transition: 'all .2s ease',
              }}
            >
              {c.code}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto 20px',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            textAlign: 'center',
            background:
              message.type === 'ok'
                ? 'rgba(16, 185, 129, 0.1)'
                : message.type === 'info'
                ? 'rgba(251, 191, 36, 0.08)'
                : 'rgba(239, 68, 68, 0.1)',
            color:
              message.type === 'ok'
                ? '#6ee7b7'
                : message.type === 'info'
                ? '#fcd34d'
                : '#fca5a5',
            border:
              message.type === 'ok'
                ? '1px solid rgba(16, 185, 129, 0.25)'
                : message.type === 'info'
                ? '1px solid rgba(251, 191, 36, 0.2)'
                : '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          {message.text}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 18,
          maxWidth: 920,
          margin: '0 auto',
        }}
      >
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id
          const isLoading = busy === plan.id
          const featureList = tLocalArr(plan.featuresKey)

          return (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                padding: 26,
                borderRadius: 18,
                background: plan.highlight
                  ? 'linear-gradient(180deg, rgba(251,191,36,0.10), rgba(251,191,36,0) 70%)'
                  : 'rgba(255,255,255,0.02)',
                border: plan.highlight
                  ? '1px solid rgba(251,191,36,0.35)'
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: plan.highlight
                  ? '0 0 60px -20px rgba(251,191,36,0.35)'
                  : 'none',
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '4px 12px',
                    background: '#fbbf24',
                    color: '#000',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderRadius: 999,
                  }}
                >
                  {tLocal('pricing.mostPopular')}
                </div>
              )}

              <h3
                style={{
                  fontFamily: 'var(--font-serif, Georgia, serif)',
                  fontSize: '1.4rem',
                  margin: '0 0 4px',
                  color: '#fff',
                }}
              >
                {tLocal(plan.nameKey)}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '0 0 20px' }}>
                {tLocalInterp('pricing.upTo', { count: plan.employees })}
              </p>

              <div style={{ marginBottom: 20 }}>
                <span
                  style={{
                    fontSize: '2.2rem',
                    fontFamily: 'var(--font-serif, Georgia, serif)',
                    color: '#fff',
                  }}
                >
                  {curMeta.symbol}
                  {fmt(plan[curMeta.key])}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginLeft: 4 }}>
                  /{tLocal('pricing.month')} {curMeta.code}
                </span>
              </div>

              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 24px',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {featureList.map((f) => (
                  <li key={f} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#fbbf24' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading || isCurrent || readOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isLoading || isCurrent || readOnly ? 'not-allowed' : 'pointer',
                  background: isCurrent
                    ? 'rgba(255,255,255,0.04)'
                    : readOnly
                    ? 'rgba(255,255,255,0.05)'
                    : plan.highlight
                    ? '#fbbf24'
                    : 'rgba(255,255,255,0.1)',
                  color: isCurrent
                    ? 'rgba(255,255,255,0.4)'
                    : readOnly
                    ? 'rgba(255,255,255,0.4)'
                    : plan.highlight
                    ? '#000'
                    : '#fff',
                  opacity: isLoading ? 0.6 : 1,
                  transition: 'all .2s ease',
                }}
              >
                {isCurrent
                  ? tLocal('pricing.currentPlan')
                  : isLoading
                  ? tLocal('pricing.processing')
                  : readOnly
                  ? tLocal('pricing.askOwner')
                  : token && user?.role === 'owner'
                  ? tLocalInterp('pricing.subscribeTo', { plan: tLocal(plan.nameKey) })
                  : tLocal('pricing.startFree')}
              </button>
            </div>
          )
        })}
      </div>

      <p
        style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 12,
          marginTop: 28,
          lineHeight: 1.5,
        }}
      >
        {tLocal('pricing.mockNotice')}
      </p>
    </div>
  )
}
