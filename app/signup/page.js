'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function Signup() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } },
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setLoading(false) }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7', padding: 20 }}>
        <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div className="card-body">
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your account.</p>
            <p style={{ color: '#9ca3af', fontSize: 12, background: '#f9fafb', padding: '10px 14px', borderRadius: 8 }}>Don't see it? Check your <strong>spam or junk folder</strong>. The email may take a minute to arrive.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Fraunces', serif", color: '#1a1a2e', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            BillBack
          </a>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>Create your free account</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{error}</div>}
            <div><label className="label">Full Name</label><input className="input" required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
            <div><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><label className="label">Password</label><input className="input" type="password" required minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} /><span style={{ fontSize: 11, color: '#9ca3af' }}>Min 6 characters</span></div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>{loading ? 'Creating account...' : 'Create Free Account'}</button>
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>Free plan includes 1 property, 5 units, and 3 months of billing history</p>
          </form>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 16 }}>Already have an account? <a href="/login" style={{ color: '#1a1a2e', fontWeight: 600 }}>Sign in</a></p>
      </div>
    </div>
  )
}