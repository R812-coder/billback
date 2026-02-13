'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams.get('verified') === 'true'
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Fraunces', serif", color: '#1a1a2e', textDecoration: 'none' }}>
            BillBack
          </a>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>Sign in to your account</p>
        </div>

        {verified && (
          <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#15803d' }}>Email verified</div>
              <div style={{ fontSize: 13, color: '#166534' }}>Your account is ready. Sign in below to get started.</div>
            </div>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{error}</div>}
            <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><label className="label">Password</label><input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 16 }}>Don't have an account? <a href="/signup" style={{ color: '#1a1a2e', fontWeight: 600 }}>Sign up</a></p>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
