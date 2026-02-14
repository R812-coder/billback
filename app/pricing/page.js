'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { PLANS } from '@/lib/plans'

export default function Pricing() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(null) // tracks which plan is loading
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null))
  }, [])

  async function handleUpgrade(planKey) {
    if (!user) {
      window.location.href = '/signup'
      return
    }
    setError('')
    setLoading(planKey)
    try {
      const res = await fetch('/api/stripe-webhook/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setLoading(null)
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', padding: '60px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <a href="/" style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif", color: '#1a1a2e', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>BillBack</a>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Simple, transparent pricing</h1>
          <p style={{ color: '#6b7280', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>Start free, upgrade when you need more properties, invoicing, or commercial CAM reconciliation</p>
        </div>

        {error && (
          <div style={{ maxWidth: 500, margin: '0 auto 24px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {Object.entries(PLANS).map(([key, plan]) => (
            <div key={key} className="card" style={{ position: 'relative', border: plan.popular ? '2px solid #1a1a2e' : undefined }}>
              {plan.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#1a1a2e', color: 'white', padding: '2px 14px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>MOST POPULAR</div>}
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
                {plan.price === 0 ? (
                  <a href={user ? '/dashboard' : '/signup'} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                    {user ? 'Current Plan' : 'Get Started Free'}
                  </a>
                ) : (
                  <button
                    className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={loading === key}
                    onClick={() => handleUpgrade(key)}
                  >
                    {loading === key ? 'Redirecting to checkout...' : 'Start free trial'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 32 }}>All plans include the free RUBS calculator. Upgrade or cancel anytime.</p>
      </div>
    </div>
  )
}