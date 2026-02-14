'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { PLANS, getEffectivePlan } from '@/lib/plans'
import { useToast, useConfirm } from '@/app/components/Toast'

export default function Settings() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ full_name: '', company_name: '', phone: '' })
  const [saved, setSaved] = useState(false)
  const searchParams = useSearchParams()
  const fromPortal = searchParams.get('from') === 'portal'
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    if (fromPortal) {
      setTimeout(() => loadProfile(), 2000)
    } else {
      loadProfile()
    }
  }, [])

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
    if (!error) {
      setSaved(true)
      toast?.success('Settings saved')
    }
  }

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe-portal', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        toast?.error(data.error)
        setPortalLoading(false)
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      toast?.error('Something went wrong. Please try again.')
      setPortalLoading(false)
    }
  }

  async function handleDeleteAccount() {
    const ok = await confirm('This will permanently delete your account, all properties, units, billing history, invoices, and cancel your subscription. This cannot be undone.', {
      title: 'Delete Your Account',
      confirmText: 'Delete My Account',
      danger: true,
    })
    if (!ok) return

    // Double confirm
    const reallyOk = await confirm('Are you absolutely sure? All your data will be permanently lost.', {
      title: 'Final Confirmation',
      confirmText: 'Yes, Delete Everything',
      danger: true,
    })
    if (!reallyOk) return

    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        toast?.error(data.error)
        setDeleting(false)
        return
      }
      // Sign out and redirect
      await supabase.auth.signOut()
      router.push('/?deleted=true')
    } catch {
      toast?.error('Something went wrong. Please try again.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        {fromPortal ? 'Updating your subscription...' : 'Loading...'}
      </div>
    )
  }

  const effectivePlan = getEffectivePlan(profile)
  const planConfig = PLANS[effectivePlan] || PLANS.free
  const hasSub = !!profile?.stripe_subscription_id
  const endsAt = profile?.subscription_ends_at ? new Date(profile.subscription_ends_at) : null
  const endsFormatted = endsAt ? endsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''

  const isCancelling = endsAt && endsAt > new Date() && profile?.plan !== 'free'
  const wasCancelled = profile?.plan === 'free' && endsAt !== null
  const dbPlanConfig = PLANS[profile?.plan] || PLANS.free

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Manage your account and subscription</p>
      </div>

      {/* Banner: Cancelling but still active */}
      {isCancelling && (
        <div style={{ padding: '16px 20px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 2 }}>Your subscription has been cancelled</div>
            <div style={{ fontSize: 13, color: '#a16207' }}>
              You won't be charged again. Your <strong>{dbPlanConfig.name}</strong> features remain active until <strong>{endsFormatted}</strong>, then your account will switch to the Free plan.
            </div>
          </div>
          <button className="btn btn-secondary" onClick={openPortal} disabled={portalLoading} style={{ flexShrink: 0 }}>
            {portalLoading ? 'Opening...' : 'Reactivate'}
          </button>
        </div>
      )}

      {/* Banner: Already cancelled and expired */}
      {wasCancelled && (
        <div style={{ padding: '16px 20px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#166534', marginBottom: 2 }}>Your subscription has ended</div>
          <div style={{ fontSize: 13, color: '#15803d' }}>
            Your paid plan ended on <strong>{endsFormatted}</strong>. You won't be charged again. You're now on the Free plan.
            {' '}<a href="/pricing" style={{ fontWeight: 600, color: '#166534' }}>Upgrade again</a> anytime to unlock all features.
          </div>
        </div>
      )}

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
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{planConfig.name}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>
                {planConfig.price === 0 ? 'Free forever' : `$${planConfig.price}/month`}
                {isCancelling && <span style={{ color: '#d97706' }}> · Cancels {endsFormatted}</span>}
              </div>
            </div>
            <span className={`badge ${isCancelling ? 'badge-yellow' : effectivePlan === 'pro' ? 'badge-blue' : effectivePlan === 'starter' ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 13, padding: '4px 14px' }}>
              {isCancelling ? 'Cancelling' : planConfig.name}
            </span>
          </div>

          <div style={{ background: '#f8f7f6', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8, letterSpacing: '0.03em' }}>PLAN INCLUDES</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {planConfig.features.map((f, i) => (
                <div key={i} style={{ fontSize: 13, color: '#4b5563', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#16a34a' }}>✓</span>{f}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {hasSub ? (
              <button className="btn btn-secondary" onClick={openPortal} disabled={portalLoading}>
                {portalLoading ? 'Opening...' : 'Manage Subscription'}
              </button>
            ) : effectivePlan === 'free' ? (
              <a href="/pricing" className="btn btn-primary" style={{ textDecoration: 'none' }}>Upgrade Plan</a>
            ) : null}
            {hasSub && !isCancelling && (
              <p style={{ fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>
                Update payment method, view invoices, or cancel through the Stripe billing portal.
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
          <button className="btn btn-danger" onClick={handleDeleteAccount} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  )
}