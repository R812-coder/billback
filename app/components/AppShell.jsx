'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/properties', label: 'Properties', icon: 'P' },
  { href: '/billing', label: 'Billing', icon: 'B' },
  { href: '/invoices', label: 'Invoices', icon: 'I' },
  { href: '/payments', label: 'Payments', icon: '$' },
  { href: '/cam-reconciliation', label: 'CAM\nReconciliation', icon: 'C', pro: true },
  { href: '/settings', label: 'Settings', icon: '⚙', bottom: true },
]

export default function AppShell({ children, user, profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const plan = profile?.plan || 'free'

  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const now = new Date()
  const isOnPaidTrial = plan !== 'free' && trialEndsAt && trialEndsAt > now
  const trialDaysLeft = isOnPaidTrial ? Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)) : 0

  const planLabel = plan === 'free' ? 'Free Plan' : plan === 'starter' ? 'Starter Plan' : 'Pro Plan'
  const planSubtext = isOnPaidTrial ? `Trial · ${trialDaysLeft}d left` : null

  const mainNav = NAV_ITEMS.filter(i => !i.bottom)
  const bottomNav = NAV_ITEMS.filter(i => i.bottom)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#faf9f7' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : undefined,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700 }}>BillBack</span>
          </a>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            {planLabel}{planSubtext ? ` · ${planSubtext}` : ''}
          </div>
        </div>

        {/* Main nav items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mainNav.map(item => {
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
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: isActive ? 'white' : 'rgba(255,255,255,0.4)',
                }}>{item.icon}</span>
                <span style={{ whiteSpace: 'pre-line' }}>{item.label}</span>
                {isLocked && <span style={{ fontSize: 10, background: 'rgba(232,166,53,0.2)', color: '#e8a635', padding: '1px 6px', borderRadius: 4, marginLeft: 'auto' }}>PRO</span>}
              </a>
            )
          })}
        </nav>

        {/* Bottom nav (Settings) */}
        <div style={{ padding: '0 8px 4px' }}>
          {bottomNav.map(item => {
            const isActive = pathname.startsWith(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, fontSize: 14, fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: isActive ? 'white' : 'rgba(255,255,255,0.4)',
                }}>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            )
          })}
        </div>

        {/* Upgrade CTA */}
        {plan === 'free' && (
          <div style={{ padding: '8px 12px' }}>
            <a href="/pricing" style={{
              display: 'block', padding: '12px 16px', background: 'rgba(232,166,53,0.15)',
              border: '1px solid rgba(232,166,53,0.3)', borderRadius: 8, textAlign: 'center',
              fontSize: 13, fontWeight: 600, color: '#e8a635',
            }}>
              Upgrade Plan
            </a>
          </div>
        )}

        {/* User */}
        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>
            {profile?.full_name || user?.email?.split('@')[0]}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{user?.email}</div>
          <button onClick={handleLogout} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: 12, cursor: 'pointer', padding: 0,
          }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 240, minWidth: 0 }}>
        <div style={{ padding: '16px 24px', display: 'none' }}>
          <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>☰</button>
        </div>
        <div style={{ padding: '24px 32px 48px', maxWidth: 1100 }}>
          {children}
        </div>
      </main>
    </div>
  )
}