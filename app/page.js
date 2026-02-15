'use client'

import { useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/calculations'

const UTILITY_TYPES = [
  { key: 'electric', label: 'Electricity' },
  { key: 'water', label: 'Water / Sewer' },
  { key: 'gas', label: 'Gas' },
  { key: 'trash', label: 'Trash' },
  { key: 'other', label: 'Other' },
]

const METHODS = {
  sqft: { label: 'Square Footage', desc: 'Larger units pay proportionally more' },
  occupancy: { label: 'Occupancy', desc: 'More residents = higher share' },
  weighted: { label: 'Weighted Blend', desc: 'Custom mix of sq ft + occupancy' },
}

// ─── SVG Icons (professional, 28px feature cards) ───
const FeatureIcons = {
  property: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V9l9-6 9 6v12"/><path d="M9 21V13h6v8"/>
    </svg>
  ),
  calculator: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
    </svg>
  ),
  invoice: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
    </svg>
  ),
  email: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 4 12 13 2 4"/>
    </svg>
  ),
  payments: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  cam: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"/><rect x="11" y="3" width="9" height="9" rx="1"/><path d="M4 15l5-5"/><path d="M15 4l5 5"/>
    </svg>
  ),
 
}

// ─── Logo ───
function Logo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8a635"/>
          <stop offset="100%" stopColor="#d4922a"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#logoGrad)"/>
      <text x="16" y="23.5" fontFamily="Georgia,serif" fontSize="20" fontWeight="700" fill="#1a1a2e" textAnchor="middle">B</text>
    </svg>
  )
}

function calculate(units, bills, method, sqftWeight) {
  const occupied = units.filter(u => !u.vacant)
  if (occupied.length === 0) return []
  const totalSqft = occupied.reduce((s, u) => s + (u.sqft || 0), 0)
  const totalOcc = occupied.reduce((s, u) => s + (u.occupants || 0), 0)
  return units.map(unit => {
    if (unit.vacant) return { ...unit, share: 0, amounts: {}, total: 0 }
    let share = 0
    if (method === 'sqft') share = totalSqft > 0 ? (unit.sqft || 0) / totalSqft : 0
    else if (method === 'occupancy') share = totalOcc > 0 ? (unit.occupants || 0) / totalOcc : 0
    else {
      const sw = sqftWeight / 100
      share = (sw * (totalSqft > 0 ? (unit.sqft || 0) / totalSqft : 0)) + ((1 - sw) * (totalOcc > 0 ? (unit.occupants || 0) / totalOcc : 0))
    }
    const amounts = {}; let total = 0
    for (const ut of UTILITY_TYPES) { const a = (parseFloat(bills[ut.key]) || 0) * share; amounts[ut.key] = a; total += a }
    return { ...unit, share, amounts, total: Math.round(total * 100) / 100 }
  })
}

export default function Home() {
  const [units, setUnits] = useState([
    { id: 1, name: '101', sqft: 800, occupants: 2, tenant: '', vacant: false },
    { id: 2, name: '102', sqft: 1000, occupants: 3, tenant: '', vacant: false },
    { id: 3, name: '103', sqft: 650, occupants: 1, tenant: '', vacant: false },
  ])
  const [bills, setBills] = useState({ electric: '', water: '', gas: '', trash: '', other: '' })
  const [method, setMethod] = useState('sqft')
  const [sqftWeight, setSqftWeight] = useState(70)
  const [calculated, setCalculated] = useState(false)
  const [results, setResults] = useState([])
  const [email, setEmail] = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [showHow, setShowHow] = useState(false)
  const [nextId, setNextId] = useState(4)

  const addUnit = () => { setUnits(p => [...p, { id: nextId, name: String(100 + p.length + 1), sqft: 0, occupants: 1, tenant: '', vacant: false }]); setNextId(n => n + 1); setCalculated(false) }
  const removeUnit = (id) => { setUnits(p => p.filter(u => u.id !== id)); setCalculated(false) }
  const updateUnit = (id, f, v) => { setUnits(p => p.map(u => u.id === id ? { ...u, [f]: f === 'sqft' || f === 'occupants' ? parseInt(v) || 0 : f === 'vacant' ? !u.vacant : v } : u)); setCalculated(false) }
  const updateBill = (k, v) => { setBills(p => ({ ...p, [k]: v })); setCalculated(false) }
  const doCalc = () => { setResults(calculate(units, bills, method, sqftWeight)); setCalculated(true) }

  const totalBills = Object.values(bills).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const occupiedUnits = units.filter(u => !u.vacant)
  const totalSqft = occupiedUnits.reduce((s, u) => s + (u.sqft || 0), 0)
  const totalOcc = occupiedUnits.reduce((s, u) => s + (u.occupants || 0), 0)

  async function submitEmail() {
    if (!email.includes('@')) return
    try { await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }) } catch {}
    setEmailSubmitted(true)
  }

  const FEATURES = [
    { icon: FeatureIcons.property, title: 'Property & Unit Management', desc: 'Save all your properties, units, tenants, and lease info in one place.' },
    { icon: FeatureIcons.calculator, title: 'Automatic RUBS Calculations', desc: 'Enter your utility bills, choose allocation method, get instant per-tenant charges.' },
    { icon: FeatureIcons.invoice, title: 'Professional PDF Invoices', desc: 'Generate clean invoices showing the breakdown. Download or email directly to tenants.' },
    { icon: FeatureIcons.email, title: 'Email Invoices to Tenants', desc: 'Send invoices to tenants with one click. Branded emails with amount due and deadline.' },
    { icon: FeatureIcons.payments, title: 'Payment Tracking', desc: 'Record payments by cash, check, Venmo, Zelle. See outstanding balances at a glance.' },
    { icon: FeatureIcons.cam, title: 'CAM Reconciliation', desc: 'Year-end common area maintenance reconciliation for commercial properties.' },
  ]

  const S = {
    section: { maxWidth: 800, margin: '0 auto', padding: '0 16px' },
    card: { background: 'white', borderRadius: 12, border: '1px solid #e5e2de', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' },
    cardHead: { padding: '20px 24px 16px', borderBottom: '1px solid #f0eeeb' },
    stepNum: { width: 28, height: 28, borderRadius: '50%', background: '#1a1a2e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" },
    input: { background: '#f8f7f6', border: '1.5px solid #e5e2de', borderRadius: 8, padding: '7px 8px', fontSize: 13, fontFamily: "'DM Mono', monospace", color: '#1f2937', outline: 'none', width: '100%', minWidth: 0 },
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#faf9f7', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet" />

{/* Right after the <link> for fonts */}
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What is RUBS?", "acceptedAnswer": { "@type": "Answer", "text": "RUBS (Ratio Utility Billing System) is a method for dividing a building's total utility costs among tenants based on predetermined factors like unit size, number of occupants, or a combination of both. It's commonly used in multifamily and commercial properties where individual metering isn't feasible or cost-effective." }},
    { "@type": "Question", "name": "How does RUBS allocation work?", "acceptedAnswer": { "@type": "Answer", "text": "The property owner receives the total utility bill, then divides it proportionally among occupied units. With square footage allocation, a 1,000 sq ft unit in a 10,000 sq ft building pays 10% of each bill. With occupancy-based allocation, a unit with 3 residents in a building with 30 total residents pays 10%." }},
    { "@type": "Question", "name": "Is RUBS legal?", "acceptedAnswer": { "@type": "Answer", "text": "RUBS legality varies significantly by state, county, and city. Some areas permit it broadly, others restrict it in rent-controlled units, and some require specific disclosure procedures. Always verify with your local housing authority or attorney." }}
  ]
}) }} />
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "BillBack RUBS Calculator",
  "description": "Free RUBS utility bill-back calculator for landlords.",
  "url": "https://www.bizstackguide.com",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}) }} />

      {/* ─── Nav ─── */}
      <nav style={{ maxWidth: 1000, margin: '0 auto', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={28} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>BillBack</span>
        </a>
        <div style={{ display: 'flex', gap: 25, alignItems: 'center' }}>
         <a href="/blog" style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Blog</a>
          <a href="/pricing" style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Pricing</a>
          <a href="/login" style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Sign In</a>
          <a href="/signup" style={{ fontSize: 14, padding: '8px 18px', background: '#1a1a2e', color: 'white', borderRadius: 8, fontWeight: 600 }}>Get Started Free</a>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', color: 'white', padding: '56px 24px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 30% 20%, rgba(232,121,53,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(53,121,232,0.08) 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(232,166,53,0.15)', border: '1px solid rgba(232,166,53,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: '#e8a635', marginBottom: 16 }}>FREE CALCULATOR BELOW — NO SIGNUP REQUIRED</div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, lineHeight: 1.15, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Stop Doing Utility<br />Math in Excel</h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.5 }}>Calculate each tenant's share of utility costs, generate professional invoices, and track payments — all in one place.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/signup" style={{ padding: '14px 32px', background: '#e8a635', color: '#1a1a2e', borderRadius: 10, fontWeight: 700, fontSize: 15 }}>Start Free — No Credit Card</a>
            <a href="#calculator" style={{ padding: '14px 32px', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10, fontWeight: 600, fontSize: 15, color: 'white' }}>Try the Calculator ↓</a>
          </div>
        </div>
      </div>

      {/* ─── Social proof strip ─── */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e2de', padding: '16px 20px', textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
        Built for landlords and property managers who bill tenants for utilities using <strong style={{ color: '#1f2937' }}>RUBS</strong> (Ratio Utility Billing System)
      </div>

      {/* ─── Features ─── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '56px 20px 40px' }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>Everything you need for utility bill-backs</h2>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 15, marginBottom: 40 }}>Replace your spreadsheets with a purpose-built tool</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ ...S.card, padding: '24px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── FREE CALCULATOR ─── */}
      <div id="calculator" style={{ scrollMarginTop: 20 }}>
        <div style={{ ...S.section, paddingTop: 32, paddingBottom: 56 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-block', background: 'rgba(232,166,53,0.12)', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600, color: '#d97706', marginBottom: 8 }}>FREE TOOL</div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>RUBS Utility Bill-Back Calculator</h2>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Calculate each tenant's share instantly — no signup required</p>
          </div>

          {/* Step 1: Units */}
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={S.cardHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={S.stepNum}>1</div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Your Units</h3>
              </div>
              <p style={{ margin: '6px 0 0 38px', fontSize: 13, color: '#9ca3af' }}>Add each unit. Mark vacant units to exclude them.</p>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 80px 80px 64px 36px', gap: 8, padding: '0 4px 8px', fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.04em' }}>
                <div>UNIT #</div><div>TENANT</div><div>SQ FT</div><div>PEOPLE</div><div>VACANT</div><div></div>
              </div>
              {units.map(unit => (
                <div key={unit.id} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 80px 80px 64px 36px', gap: 8, padding: 4, marginBottom: 6, opacity: unit.vacant ? 0.5 : 1 }}>
                  <input value={unit.name} onChange={e => updateUnit(unit.id, 'name', e.target.value)} style={S.input} />
                  <input value={unit.tenant} onChange={e => updateUnit(unit.id, 'tenant', e.target.value)} placeholder="Tenant name" style={{ ...S.input, fontFamily: "'DM Sans', sans-serif" }} />
                  <input type="number" value={unit.sqft || ''} onChange={e => updateUnit(unit.id, 'sqft', e.target.value)} style={{ ...S.input, textAlign: 'right' }} />
                  <input type="number" value={unit.occupants || ''} onChange={e => updateUnit(unit.id, 'occupants', e.target.value)} style={{ ...S.input, textAlign: 'right' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button onClick={() => updateUnit(unit.id, 'vacant')} style={{ width: 22, height: 22, borderRadius: 6, border: unit.vacant ? 'none' : '2px solid #d1d5db', background: unit.vacant ? '#1a1a2e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>{unit.vacant ? '✓' : ''}</button>
                  </div>
                  <button onClick={() => removeUnit(unit.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16 }}>×</button>
                </div>
              ))}
              <button onClick={addUnit} style={{ background: 'none', border: '1.5px dashed #d1d5db', borderRadius: 8, padding: '10px 0', width: '100%', cursor: 'pointer', fontSize: 13, color: '#6b7280', fontWeight: 500, marginTop: 4 }}>+ Add Unit</button>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, padding: '10px 12px', background: '#f8f7f6', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
                <span><strong style={{ color: '#1f2937' }}>{occupiedUnits.length}</strong> occupied</span>
                <span><strong style={{ color: '#1f2937' }}>{totalSqft.toLocaleString()}</strong> total sq ft</span>
                <span><strong style={{ color: '#1f2937' }}>{totalOcc}</strong> total residents</span>
              </div>
            </div>
          </div>

          {/* Step 2: Bills */}
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={S.cardHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={S.stepNum}>2</div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Utility Bills</h3>
              </div>
            </div>
            <div style={{ padding: '16px 16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {UTILITY_TYPES.map(ut => (
                <div key={ut.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{ut.label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8f7f6', border: '1.5px solid #e5e2de', borderRadius: 8 }}>
                    <span style={{ padding: '8px 0 8px 10px', color: '#9ca3af', fontFamily: "'DM Mono', monospace" }}>$</span>
                    <input type="number" value={bills[ut.key]} onChange={e => updateBill(ut.key, e.target.value)} placeholder="0.00" style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 10px 8px 4px', fontSize: 14, fontFamily: "'DM Mono', monospace", outline: 'none', color: '#1f2937', minWidth: 0 }} />
                  </div>
                </div>
              ))}
            </div>
            {totalBills > 0 && <div style={{ margin: '0 16px 16px', padding: '10px 12px', background: '#f0f7ed', borderRadius: 8, fontSize: 13, color: '#3d6b32', fontWeight: 500 }}>Total: <strong style={{ fontFamily: "'DM Mono', monospace" }}>{formatCurrency(totalBills)}</strong></div>}
          </div>

          {/* Step 3: Method */}
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={S.cardHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={S.stepNum}>3</div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Allocation Method</h3>
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(METHODS).map(([key, val]) => (
                <button key={key} onClick={() => { setMethod(key); setCalculated(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: method === key ? '#f0f4ff' : '#f8f7f6', border: method === key ? '1.5px solid #3b5998' : '1.5px solid #e5e2de', borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: method === key ? '5px solid #1a1a2e' : '2px solid #d1d5db', background: 'white', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{val.label}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{val.desc}</div>
                  </div>
                </button>
              ))}
              {method === 'weighted' && (
                <div style={{ padding: '12px 16px', background: '#f8f7f6', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>
                    <span>Sq ft: <strong>{sqftWeight}%</strong></span><span>Occupancy: <strong>{100 - sqftWeight}%</strong></span>
                  </div>
                  <input type="range" min={10} max={90} value={sqftWeight} onChange={e => { setSqftWeight(parseInt(e.target.value)); setCalculated(false) }} style={{ width: '100%', accentColor: '#1a1a2e' }} />
                </div>
              )}
            </div>
          </div>

          {/* Calculate */}
          <button onClick={doCalc} disabled={totalBills === 0 || occupiedUnits.length === 0} style={{ width: '100%', padding: 16, background: totalBills === 0 ? '#d1d5db' : 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: totalBills === 0 ? 'not-allowed' : 'pointer', boxShadow: '0 2px 12px rgba(26,26,46,0.25)' }}>
            {calculated ? '↻ Recalculate' : 'Calculate Tenant Shares →'}
          </button>

          {/* Results */}
          {calculated && results.length > 0 && (
            <div style={{ ...S.card, marginTop: 24 }}>
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0eeeb', background: 'linear-gradient(135deg, #f8fbf6, #f6f9fc)' }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Results</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{formatCurrency(totalBills)} total across {occupiedUnits.length} occupied units</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8f7f6' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11, letterSpacing: '0.04em', borderBottom: '1px solid #e5e2de' }}>UNIT</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11, borderBottom: '1px solid #e5e2de' }}>TENANT</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, borderBottom: '1px solid #e5e2de' }}>SHARE</th>
                      {UTILITY_TYPES.filter(ut => parseFloat(bills[ut.key]) > 0).map(ut => (
                        <th key={ut.key} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, borderBottom: '1px solid #e5e2de' }}>{ut.label.toUpperCase()}</th>
                      ))}
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e5e2de' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.id} style={{ background: r.vacant ? '#fafafa' : i % 2 === 0 ? 'white' : '#fcfcfb', opacity: r.vacant ? 0.4 : 1 }}>
                        <td style={{ padding: '10px 16px', fontFamily: "'DM Mono', monospace", fontWeight: 500, borderBottom: '1px solid #f0eeeb' }}>{r.name}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f0eeeb' }}>{r.vacant ? 'Vacant' : r.tenant || '—'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'DM Mono', monospace", color: '#6b7280', borderBottom: '1px solid #f0eeeb' }}>{r.vacant ? '—' : (r.share * 100).toFixed(1) + '%'}</td>
                        {UTILITY_TYPES.filter(ut => parseFloat(bills[ut.key]) > 0).map(ut => (
                          <td key={ut.key} style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'DM Mono', monospace", borderBottom: '1px solid #f0eeeb' }}>{r.vacant ? '—' : formatCurrency(r.amounts[ut.key])}</td>
                        ))}
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700, color: r.vacant ? '#9ca3af' : '#1a1a2e', borderBottom: '1px solid #f0eeeb' }}>{r.vacant ? '—' : formatCurrency(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0f4ff' }}>
                      <td colSpan={3} style={{ padding: '12px 16px', fontWeight: 700 }}>TOTALS</td>
                      {UTILITY_TYPES.filter(ut => parseFloat(bills[ut.key]) > 0).map(ut => (
                        <td key={ut.key} style={{ padding: '12px 12px', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                          {formatCurrency(results.filter(r => !r.vacant).reduce((s, r) => s + (r.amounts[ut.key] || 0), 0))}
                        </td>
                      ))}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 15 }}>
                        {formatCurrency(results.filter(r => !r.vacant).reduce((s, r) => s + r.total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f0eeeb' }}>
                <button onClick={() => setShowHow(!showHow)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#3b5998', fontWeight: 600, padding: 0 }}>
                  {showHow ? '▾ Hide' : '▸ Show'} calculation breakdown
                </button>
                {showHow && (
                  <div style={{ marginTop: 12, padding: 16, background: '#f8f7f6', borderRadius: 8, fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#4b5563', lineHeight: 1.8 }}>
                    {results.filter(r => !r.vacant).map(r => (
                      <div key={r.id}>Unit {r.name}: {method === 'sqft' ? `${r.sqft}/${totalSqft} sq ft` : method === 'occupancy' ? `${r.occupants}/${totalOcc} people` : `${sqftWeight}%×${r.sqft}/${totalSqft} + ${100 - sqftWeight}%×${r.occupants}/${totalOcc}`} = {(r.share * 100).toFixed(1)}% → {formatCurrency(r.total)}</div>
                    ))}
                    <div style={{ marginTop: 8, color: '#9ca3af', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>Vacant units excluded. Their share is absorbed by the property owner.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA after results */}
          {calculated && (
            <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)', borderRadius: 12, padding: '32px 28px', marginTop: 28, color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 80% 20%, rgba(232,166,53,0.1) 0%, transparent 50%)' }} />
              <div style={{ position: 'relative' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Want to do this every month in 30 seconds?</h3>
                <p style={{ margin: '0 0 20px', fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>Save your properties, auto-generate invoices, email them to tenants, and track payments. Free plan available.</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a href="/signup" style={{ padding: '12px 28px', background: '#e8a635', color: '#1a1a2e', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>Create Free Account →</a>
                  <a href="/pricing" style={{ padding: '12px 28px', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'white' }}>See Pricing</a>
                </div>
              </div>
            </div>
          )}

          {/* ─── SEO Content ─── */}
          <div style={{ margin: '48px 0', padding: '0 4px' }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>What is RUBS?</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: '#4b5563', marginBottom: 16 }}>RUBS (Ratio Utility Billing System) is a method for dividing a building's total utility costs among tenants based on predetermined factors like unit size, number of occupants, or a combination of both. It's commonly used in multifamily and commercial properties where individual metering isn't feasible or cost-effective.</p>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, marginBottom: 6, marginTop: 24 }}>How RUBS allocation works</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: '#4b5563', marginBottom: 12 }}>The property owner receives the total utility bill, then divides it proportionally. With square footage allocation, a 1,000 sq ft unit in a 10,000 sq ft building pays 10% of each bill. With occupancy-based allocation, a unit with 3 residents in a building with 30 total residents pays 10%. Many landlords use a weighted combination for the fairest distribution.</p>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, marginBottom: 6, marginTop: 24 }}>Is RUBS legal?</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: '#4b5563', marginBottom: 4 }}>RUBS legality varies significantly by state, county, and city. Some areas permit it broadly, others restrict it in rent-controlled units, and some require specific disclosure procedures.</p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#9ca3af', fontStyle: 'italic', padding: '12px 16px', background: '#f8f7f6', borderRadius: 8, borderLeft: '3px solid #e8a635' }}>This calculator provides mathematical estimates only — not legal advice. Landlord-tenant utility billing laws are hyper-local and change frequently. Always verify current requirements with your local housing authority or a qualified attorney before implementing RUBS.</p>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div style={{ borderTop: '1px solid #e5e2de', padding: '24px 20px 40px', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
        <div style={{ marginBottom: 8 }}>
          <a href="/pricing" style={{ marginRight: 16 }}>Pricing</a>
          <a href="/login" style={{ marginRight: 16 }}>Sign In</a>
          <a href="/signup" style={{ marginRight: 16 }}>Create Account</a>
          <a href="/privacy" style={{ marginRight: 16 }}>Privacy</a>
          <a href="/terms" style={{ marginRight: 16 }}>Terms</a>
          <a href="/blog" style={{ marginRight: 16 }}>Blog</a>
        </div>
        <p>BillBack — Utility Bill-Back Platform for Landlords & Property Managers</p>
      </div>
    </div>
  )
}