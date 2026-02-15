'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { getEffectivePlan } from '@/lib/plans'

// ─── SVG Icons (clean, minimal, 20x20) ───
const Icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  properties: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V9l9-6 9 6v12"/><path d="M9 21V13h6v8"/>
    </svg>
  ),
  billing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 16h4"/><path d="M14 16h4"/>
    </svg>
  ),
  invoices: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
    </svg>
  ),
  payments: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  cam: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"/><rect x="11" y="3" width="9" height="9" rx="1"/><path d="M4 15l5-5"/><path d="M15 4l5 5"/>
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
}

// ─── Logo SVG ───
function Logo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8a635"/>
          <stop offset="100%" stopColor="#d4922a"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#logoBg)"/>
      <text x="16" y="23.5" fontFamily="Georgia,serif" fontSize="20" fontWeight="700" fill="#1a1a2e" textAnchor="middle">B</text>
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/properties', label: 'Properties', icon: 'properties' },
  { href: '/billing', label: 'Billing', icon: 'billing' },
  { href: '/invoices', label: 'Invoices', icon: 'invoices' },
  { href: '/payments', label: 'Payments', icon: 'payments' },
  { href: '/cam-reconciliation', label: 'CAM Reconciliation', icon: 'cam', pro: true },
  { href: '/settings', label: 'Settings', icon: 'settings', bottom: true },
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

  const plan = getEffectivePlan(profile)
  const isCancelling = profile?.subscription_ends_at && plan !== 'free' && new Date(profile.subscription_ends_at) > new Date()
  const planLabel = plan === 'free' ? 'Free Plan' : plan === 'starter' ? 'Starter Plan' : 'Pro Plan'

  const mainNav = NAV_ITEMS.filter(i => !i.bottom)
  const bottomNav = NAV_ITEMS.filter(i => i.bottom)

  function renderNavItem(item) {
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
          width: 30, height: 30, borderRadius: 7,
          background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isActive ? 'white' : 'rgba(255,255,255,0.45)',
          flexShrink: 0,
        }}>{Icons[item.icon]}</span>
        <span>{item.label}</span>
        {isLocked && <span style={{ fontSize: 10, background: 'rgba(232,166,53,0.2)', color: '#e8a635', padding: '1px 6px', borderRadius: 4, marginLeft: 'auto' }}>PRO</span>}
      </a>
    )
  }

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
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={28} />
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700 }}>BillBack</span>
          </a>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6, marginLeft: 38 }}>
            {planLabel}{isCancelling ? ' · Cancelling' : ''}
          </div>
        </div>

        {/* Main nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mainNav.map(renderNavItem)}
        </nav>

        {/* Bottom nav (Settings) */}
        <div style={{ padding: '0 8px 4px' }}>
          {bottomNav.map(renderNavItem)}
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