'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setResetSent(true); setLoading(false) }
  }

  if (resetSent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, marginBottom: 8 }}>Check your email</h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>We sent a password reset link to <strong>{email}</strong>.</p>
              <p style={{ color: '#9ca3af', fontSize: 12, background: '#f9fafb', padding: '10px 14px', borderRadius: 8 }}>Don't see it? Check your <strong>spam or junk folder</strong>. The email may take a minute to arrive.</p>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 16 }}>
            <button onClick={() => { setResetMode(false); setResetSent(false) }} style={{ background: 'none', border: 'none', color: '#1a1a2e', fontWeight: 600, cursor: 'pointer' }}>Back to sign in</button>
          </p>
        </div>
      </div>
    )
  }

  if (resetMode) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <a href="/" style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Fraunces', serif", color: '#1a1a2e', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              BillBack
            </a>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>Reset your password</p>
          </div>
          <div className="card">
            <form onSubmit={handleResetPassword} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{error}</div>}
              <p style={{ color: '#6b7280', fontSize: 13 }}>Enter your email and we'll send you a link to reset your password.</p>
              <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
            </form>
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 16 }}>
            <button onClick={() => setResetMode(false)} style={{ background: 'none', border: 'none', color: '#1a1a2e', fontWeight: 600, cursor: 'pointer' }}>Back to sign in</button>
          </p>
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
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>Sign in to your account</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{error}</div>}
            <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="label">Password</label>
                <button type="button" onClick={() => setResetMode(true)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', padding: 0 }}>Forgot password?</button>
              </div>
              <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 16 }}>Don't have an account? <a href="/signup" style={{ color: '#1a1a2e', fontWeight: 600 }}>Sign up</a></p>
      </div>
    </div>
  )
}