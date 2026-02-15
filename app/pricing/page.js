'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { PLANS } from '@/lib/plans'

function Logo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8a635"/>
          <stop offset="100%" stopColor="#d4922a"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#pLogoGrad)"/>
      <text x="16" y="23.5" fontFamily="Georgia,serif" fontSize="20" fontWeight="700" fill="#1a1a2e" textAnchor="middle">B</text>
    </svg>
  )
}

export default function Pricing() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
        if (data) setProfile(data)
      }
    }
    load()
  }, [])

  async function handleSubscribe(planKey) {
    const plan = PLANS[planKey]
    if (!plan?.stripe_price_id) return

    if (!user) {
      router.push('/signup')
      return
    }

    setLoadingPlan(planKey)
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.stripe_price_id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setLoadingPlan(null)
    } catch {
      setLoadingPlan(null)
    }
  }

  const currentPlan = profile?.plan || 'free'

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', padding: '0 20px 60px' }}>
      {/* Header */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 0 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <Logo size={28} />
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif", color: '#1a1a2e' }}>BillBack</span>
          </a>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Simple, transparent pricing</h1>
          <p style={{ color: '#6b7280', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>Start free, upgrade when you need more properties, invoicing, or commercial CAM reconciliation</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {Object.entries(PLANS).map(([key, plan]) => {
            const isCurrent = currentPlan === key
            const isDowngrade = key === 'free' && currentPlan !== 'free'
            const isUpgrade = plan.price > 0 && (currentPlan === 'free' || (key === 'pro' && currentPlan === 'starter'))

            return (
              <div key={key} className="card" style={{ position: 'relative', border: plan.popular ? '2px solid #1a1a2e' : undefined, overflow: 'visible' }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    background: '#1a1a2e', color: 'white', padding: '4px 16px', borderRadius: 12,
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', whiteSpace: 'nowrap',
                    zIndex: 1,
                  }}>
                    RECOMMENDED
                  </div>
                )}
                <div className="card-body" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>{plan.description}</p>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: 36, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{plan.price === 0 ? 'Free' : `$${plan.price}`}</span>
                    {plan.price > 0 && <span style={{ color: '#6b7280', fontSize: 14 }}>/month</span>}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {plan.features.map((f, i) => <li key={i} style={{ fontSize: 13, color: '#4b5563', display: 'flex', gap: 8 }}><span style={{ color: '#16a34a' }}>✓</span>{f}</li>)}
                  </ul>

                  {isCurrent ? (
                    <div style={{
                      width: '100%', padding: '10px 0', textAlign: 'center',
                      border: '1.5px solid #e5e2de', borderRadius: 8,
                      fontSize: 14, fontWeight: 600, color: '#6b7280',
                    }}>
                      Current Plan
                    </div>
                  ) : key === 'free' ? (
                    <a href={user ? '/dashboard' : '/signup'} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                      {user ? 'Go to Dashboard' : 'Get Started Free'}
                    </a>
                  ) : (
                    <button
                      className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => handleSubscribe(key)}
                      disabled={loadingPlan === key}
                    >
                      {loadingPlan === key ? 'Redirecting to checkout...' : isUpgrade ? `Subscribe — $${plan.price}/mo` : `Subscribe — $${plan.price}/mo`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 32 }}>All plans include the free RUBS calculator. Upgrade or cancel anytime.</p>
      </div>
    </div>
  )
}