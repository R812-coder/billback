'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { PLANS } from '@/lib/plans'

export default function Settings() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [form, setForm] = useState({ full_name: '', company_name: '', phone: '' })
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setForm({
        full_name: data.full_name || '',
        company_name: data.company_name || '',
        phone: data.phone || '',
      })
    }
    setLoading(false)
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name || null,
      company_name: form.company_name || null,
      phone: form.phone || null,
    }).eq('id', profile.id)
    setSaving(false)
    if (!error) setSaved(true)
  }

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe-portal', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
        setPortalLoading(false)
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      alert('Something went wrong. Please try again.')
      setPortalLoading(false)
    }
  }

  if (loading) return null

  const plan = PLANS[profile?.plan] || PLANS.free
  const hasSub = !!profile?.stripe_subscription_id

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Manage your account and subscription</p>
      </div>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Account Details</h2>
        </div>
        <form onSubmit={saveProfile} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Company Name</label>
              <input className="input" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Shown on invoices" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Email</label>
              <input className="input" value={profile?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            {saved && <span style={{ color: '#16a34a', fontSize: 13 }}>Saved</span>}
          </div>
        </form>
      </div>

      {/* Subscription */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Subscription</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{plan.name}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>
                {plan.price === 0 ? 'Free forever' : `$${plan.price}/month`}
              </div>
            </div>
            <span className={`badge ${profile?.plan === 'pro' ? 'badge-blue' : profile?.plan === 'starter' ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 13, padding: '4px 14px' }}>
              {plan.name}
            </span>
          </div>

          {/* Plan limits summary */}
          <div style={{ background: '#f8f7f6', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8, letterSpacing: '0.03em' }}>PLAN INCLUDES</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {plan.features.map((f, i) => (
                <div key={i} style={{ fontSize: 13, color: '#4b5563', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#16a34a' }}>✓</span>{f}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {hasSub ? (
              <button className="btn btn-secondary" onClick={openPortal} disabled={portalLoading}>
                {portalLoading ? 'Opening...' : 'Manage Subscription'}
              </button>
            ) : profile?.plan === 'free' ? (
              <a href="/pricing" className="btn btn-primary" style={{ textDecoration: 'none' }}>Upgrade Plan</a>
            ) : null}
            {hasSub && (
              <p style={{ fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>
                Update payment method, view invoices, or cancel your subscription through the Stripe portal.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card">
        <div className="card-header">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>Danger Zone</h2>
        </div>
        <div className="card-body">
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
            Deleting your account will permanently remove all your properties, billing history, invoices, and data. This action cannot be undone.
          </p>
          <button className="btn btn-danger" onClick={() => alert('Contact support at support@bizstackguide.com to delete your account.')}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}