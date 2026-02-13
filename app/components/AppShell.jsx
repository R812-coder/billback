'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ToastProvider } from './Toast'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', letter: 'D' },
  { href: '/properties', label: 'Properties', letter: 'P' },
  { href: '/billing', label: 'Billing', letter: 'B' },
  { href: '/invoices', label: 'Invoices', letter: 'I' },
  { href: '/payments', label: 'Payments', letter: '$' },
  { href: '/cam-reconciliation', label: 'CAM Reconciliation', letter: 'C', pro: true },
]

export default function AppShell({ children, user, profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)
  const prevPathRef = useRef(pathname)
  const supabase = createClient()

  // Smooth page transition: fade out old → swap → fade in new
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setTransitioning(true)
      // Short fade out, then swap content
      const timer = setTimeout(() => {
        setDisplayChildren(children)
        setTransitioning(false)
      }, 120)
      prevPathRef.current = pathname
      return () => clearTimeout(timer)
    } else {
      setDisplayChildren(children)
    }
  }, [children, pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const plan = profile?.plan || 'free'
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const now = new Date()
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - now) / 86400000)) : 14
  const trialExpired = plan === 'free' && trialEndsAt && now > trialEndsAt

  // If trial expired, show blocking screen
  if (trialExpired) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Your free trial has ended</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Upgrade to continue using BillBack and keep your data.</p>
          <a href="/pricing" style={{ display: 'inline-block', padding: '12px 28px', background: '#1a1a2e', color: 'white', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none', marginBottom: 12 }}>View Plans & Upgrade</a>
          <br />
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>Sign out</button>
        </div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#faf9f7' }}>
        {/* Sidebar */}
        <aside style={{
          width: 240, background: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        }}>
          {/* Logo + plan */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'white' }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700 }}>BillBack</span>
            </a>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {plan === 'free' ? `Free Plan · ${trialDaysLeft}d left` : plan === 'starter' ? 'Starter Plan' : 'Pro Plan'}
            </div>
          </div>

          {/* Trial warning banner */}
          {plan === 'free' && trialDaysLeft <= 5 && trialDaysLeft > 0 && (
            <div style={{ padding: '10px 16px', background: 'rgba(220,38,38,0.15)', borderBottom: '1px solid rgba(220,38,38,0.2)', fontSize: 12, color: '#fca5a5' }}>
              {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in your trial.{' '}
              <a href="/pricing" style={{ color: '#fca5a5', fontWeight: 600, textDecoration: 'underline' }}>Upgrade</a>
            </div>
          )}

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map(item => {
              const isActive = pathname.startsWith(item.href)
              const isLocked = item.pro && plan !== 'pro'
              return (
                <a
                  key={item.href}
                  href={isLocked ? '/pricing' : item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 8, fontSize: 14, fontWeight: isActive ? 600 : 400,
                    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.15s', opacity: isLocked ? 0.5 : 1,
                    textDecoration: 'none',
                  }}
                >
                  <span style={{
                    width: 26, height: 26, borderRadius: 6,
                    background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace",
                    flexShrink: 0,
                  }}>{item.letter}</span>
                  <span>{item.label}</span>
                  {isLocked && <span style={{ fontSize: 10, background: 'rgba(232,166,53,0.2)', color: '#e8a635', padding: '1px 6px', borderRadius: 4, marginLeft: 'auto' }}>PRO</span>}
                </a>
              )
            })}
          </nav>

          {/* Upgrade CTA */}
          {plan === 'free' && (
            <div style={{ padding: '12px 12px 8px' }}>
              <a href="/pricing" style={{
                display: 'block', padding: '12px 16px', background: 'rgba(232,166,53,0.15)',
                border: '1px solid rgba(232,166,53,0.3)', borderRadius: 8, textAlign: 'center',
                fontSize: 13, fontWeight: 600, color: '#e8a635', textDecoration: 'none',
              }}>
                Upgrade Plan
              </a>
            </div>
          )}

          {/* User */}
          <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
                {profile?.full_name || user?.email?.split('@')[0]}
              </div>
            </div>
            <button onClick={handleLogout} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              fontSize: 12, cursor: 'pointer', padding: 0,
            }}>
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content with transition */}
        <main style={{ flex: 1, marginLeft: 240, minWidth: 0 }}>
          <div style={{
            padding: '24px 32px 48px', maxWidth: 1100,
            opacity: transitioning ? 0 : 1,
            transform: transitioning ? 'translateY(4px)' : 'translateY(0)',
            transition: 'opacity 0.15s ease, transform 0.15s ease',
          }}>
            {displayChildren}
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}