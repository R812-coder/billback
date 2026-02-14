'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setLoading(false) }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7', padding: 20 }}>
        <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div className="card-body">
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, marginBottom: 8 }}>Password updated</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>Your password has been reset successfully.</p>
            <a href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>Sign in</a>
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
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>Set your new password</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{error}</div>}
            <div><label className="label">New Password</label><input className="input" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /><span style={{ fontSize: 11, color: '#9ca3af' }}>Min 6 characters</span></div>
            <div><label className="label">Confirm Password</label><input className="input" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>{loading ? 'Updating...' : 'Update Password'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}