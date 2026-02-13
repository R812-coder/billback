'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { calculateRUBS, UTILITY_TYPES, formatCurrency, formatPct, generateInvoiceNumber } from '@/lib/calculations'
import { useToast, useConfirm } from '@/app/components/Toast'

const STATUS_LABELS = { draft: 'Draft', calculated: 'Calculated', invoiced: 'Invoiced', closed: 'Closed' }

// Timezone-safe date display: "2025-01-01" → "1/1/2025" without UTC shift
function safeDate(dateStr) {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).toLocaleDateString()
  }
  return new Date(dateStr + 'T12:00:00').toLocaleDateString()
}

// Timezone-safe due date calculation: add days to YYYY-MM-DD string
function addDays(dateStr, days) {
  const parts = dateStr.split('-')
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function Billing() {
  const [properties, setProperties] = useState([])
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [activePeriod, setActivePeriod] = useState(null)
  const [bills, setBills] = useState({})
  const [results, setResults] = useState(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const toast = useToast()
  const confirm = useConfirm()

  const now = new Date()
  const [newForm, setNewForm] = useState({
    property_id: '',
    period_start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const propRes = await supabase.from('properties').select('*, units(*)').eq('user_id', user.id).order('name')
    if (propRes.error) console.error('Load properties error:', propRes.error)
    setProperties(propRes.data || [])

    const periodRes = await supabase.from('billing_periods').select('*, properties(name, default_allocation_method, sqft_weight), utility_bills(*), tenant_charges(*, units(unit_number, tenant_name))').order('period_start', { ascending: false })
    if (periodRes.error) console.error('Load periods error:', periodRes.error)
    setPeriods(periodRes.data || [])

    setLoading(false)
  }

  async function createPeriod(e) {
    e.preventDefault()
    const prop = properties.find(p => p.id === newForm.property_id)
    if (!prop) return
    const { data, error } = await supabase.from('billing_periods').insert({
      property_id: newForm.property_id,
      period_start: newForm.period_start,
      period_end: newForm.period_end,
      allocation_method: prop.default_allocation_method,
      sqft_weight: prop.sqft_weight || 70,
      status: 'draft',
    }).select().single()
    if (error) { toast?.error('Error creating period: ' + error.message); return }
    if (data) {
      toast?.success('Billing period created')
      setShowNew(false)
      load()
      openPeriod(data.id)
    }
  }

  async function openPeriod(periodId) {
    const { data: period } = await supabase.from('billing_periods')
      .select('*, properties(id, name, default_allocation_method, sqft_weight, units(*)), utility_bills(*), tenant_charges(*, units(unit_number, tenant_name, tenant_email))')
      .eq('id', periodId).single()
    if (!period) return

    const billMap = {}
    for (const b of (period.utility_bills || [])) {
      billMap[b.utility_type] = b.amount?.toString() || ''
    }
    setBills(billMap)
    setActivePeriod(period)

    if (period.tenant_charges?.length > 0) {
      setResults(period.tenant_charges)
    } else {
      setResults(null)
    }
  }

  async function calculateAndSave() {
    if (!activePeriod) return
    setSaving(true)
    const prop = activePeriod.properties
    const units = prop.units || []

    await supabase.from('utility_bills').delete().eq('billing_period_id', activePeriod.id)
    const billInserts = Object.entries(bills).filter(([, v]) => parseFloat(v) > 0).map(([type, amount]) => ({
      billing_period_id: activePeriod.id, utility_type: type, amount: parseFloat(amount),
    }))
    if (billInserts.length > 0) {
      await supabase.from('utility_bills').insert(billInserts)
    }

    const billObj = {}
    for (const ut of UTILITY_TYPES) { billObj[ut.key] = parseFloat(bills[ut.key]) || 0 }
    const calculated = calculateRUBS(units, billObj, activePeriod.allocation_method, activePeriod.sqft_weight)

    await supabase.from('tenant_charges').delete().eq('billing_period_id', activePeriod.id)
    const chargeInserts = calculated.filter(u => !u.is_vacant).map(u => ({
      billing_period_id: activePeriod.id,
      unit_id: u.id,
      share_percentage: u.share,
      electric_amount: u.amounts.electric || 0,
      water_amount: u.amounts.water || 0,
      gas_amount: u.amounts.gas || 0,
      trash_amount: u.amounts.trash || 0,
      sewer_amount: u.amounts.sewer || 0,
      other_amount: u.amounts.other || 0,
      total_amount: u.total,
    }))
    if (chargeInserts.length > 0) {
      await supabase.from('tenant_charges').insert(chargeInserts)
    }

    await supabase.from('billing_periods').update({ status: 'calculated' }).eq('id', activePeriod.id)

    toast?.success('Tenant shares calculated')
    setSaving(false)
    openPeriod(activePeriod.id)
    load()
  }

  async function generateInvoices() {
    if (!activePeriod || !results) return
    setSaving(true)
    const prop = activePeriod.properties

    await supabase.from('invoices').delete().eq('billing_period_id', activePeriod.id)

    const invoiceInserts = results.map(charge => ({
      tenant_charge_id: charge.id,
      billing_period_id: activePeriod.id,
      unit_id: charge.unit_id,
      invoice_number: generateInvoiceNumber(prop.name, activePeriod.period_start, charge.units?.unit_number || ''),
      tenant_name: charge.units?.tenant_name || '',
      tenant_email: charge.units?.tenant_email || '',
      amount: charge.total_amount,
      status: 'draft',
      due_date: addDays(activePeriod.period_end, 15),
    }))

    await supabase.from('invoices').insert(invoiceInserts)
    await supabase.from('billing_periods').update({ status: 'invoiced' }).eq('id', activePeriod.id)

    toast?.success(`${invoiceInserts.length} invoices generated`)
    setSaving(false)
    load()
    setActivePeriod(null)
    setResults(null)
  }

  async function deletePeriod(id) {
    const ok = await confirm('This will permanently delete the billing period, all calculated charges, and any generated invoices.', {
      title: 'Delete Billing Period',
      confirmText: 'Delete Everything',
      danger: true,
    })
    if (!ok) return
    await supabase.from('billing_periods').delete().eq('id', id)
    if (activePeriod?.id === id) { setActivePeriod(null); setResults(null) }
    toast?.success('Billing period deleted')
    load()
  }

  const totalBills = Object.values(bills).reduce((s, v) => s + (parseFloat(v) || 0), 0)

  if (loading) return null

  // ─── Active period detail view ───
  if (activePeriod) {
    const prop = activePeriod.properties
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => { setActivePeriod(null); setResults(null) }} style={{ marginBottom: 16 }}>
          ← Back to Billing
        </button>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700 }}>{prop?.name}</h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>{safeDate(activePeriod.period_start)} — {safeDate(activePeriod.period_end)}</p>
          <span className={`badge status-${activePeriod.status}`}>{STATUS_LABELS[activePeriod.status]}</span>
        </div>

        {/* Bill entry */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2 style={{ fontSize: 16, fontWeight: 700 }}>Utility Bills</h2></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {UTILITY_TYPES.map(ut => (
              <div key={ut.key}>
                <label className="label">{ut.label}</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8f7f6', border: '1.5px solid #e5e2de', borderRadius: 8, overflow: 'hidden' }}>
                  <span style={{ padding: '8px 0 8px 10px', color: '#9ca3af', fontFamily: "'DM Mono', monospace" }}>$</span>
                  <input type="number" value={bills[ut.key] || ''} onChange={e => setBills({ ...bills, [ut.key]: e.target.value })}
                    disabled={activePeriod.status === 'invoiced' || activePeriod.status === 'closed'}
                    placeholder="0.00" style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 10px 8px 4px', fontSize: 14, fontFamily: "'DM Mono', monospace", outline: 'none', color: '#1f2937' }} />
                </div>
              </div>
            ))}
          </div>
          {totalBills > 0 && (
            <div style={{ margin: '0 24px 20px', padding: '10px 12px', background: '#f0f7ed', borderRadius: 8, fontSize: 13, color: '#3d6b32', fontWeight: 500 }}>
              Total: <strong style={{ fontFamily: "'DM Mono', monospace" }}>{formatCurrency(totalBills)}</strong> across {UTILITY_TYPES.filter(ut => parseFloat(bills[ut.key]) > 0).length} utilities
            </div>
          )}
        </div>

        {/* Calculate / Results */}
        {activePeriod.status !== 'invoiced' && activePeriod.status !== 'closed' && (
          <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginBottom: 20 }}
            disabled={totalBills === 0 || saving} onClick={calculateAndSave}>
            {saving ? 'Calculating...' : results ? 'Recalculate' : 'Calculate Tenant Shares'}
          </button>
        )}

        {results && results.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, #f8fbf6, #f6f9fc)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Tenant Charges</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Unit</th><th>Tenant</th><th>Share</th>
                    {UTILITY_TYPES.filter(ut => parseFloat(bills[ut.key]) > 0).map(ut => <th key={ut.key} style={{ textAlign: 'right' }}>{ut.label}</th>)}
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id || r.unit_id}>
                      <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{r.units?.unit_number || r.unit_number}</td>
                      <td>{r.units?.tenant_name || r.tenant_name || '—'}</td>
                      <td style={{ fontFamily: "'DM Mono', monospace", color: '#6b7280' }}>{formatPct(r.share_percentage ?? r.share)}</td>
                      {UTILITY_TYPES.filter(ut => parseFloat(bills[ut.key]) > 0).map(ut => (
                        <td key={ut.key} style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>
                          {formatCurrency(r[`${ut.key}_amount`] ?? r.amounts?.[ut.key] ?? 0)}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{formatCurrency(r.total_amount ?? r.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f0f4ff' }}>
                    <td colSpan={3} style={{ fontWeight: 700 }}>TOTAL</td>
                    {UTILITY_TYPES.filter(ut => parseFloat(bills[ut.key]) > 0).map(ut => (
                      <td key={ut.key} style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                        {formatCurrency(results.reduce((s, r) => s + parseFloat(r[`${ut.key}_amount`] ?? r.amounts?.[ut.key] ?? 0), 0))}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 15 }}>
                      {formatCurrency(results.reduce((s, r) => s + parseFloat(r.total_amount ?? r.total ?? 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {activePeriod.status === 'calculated' && (
              <div className="card-body" style={{ borderTop: '1px solid #f0eeeb' }}>
                <button className="btn btn-primary" onClick={generateInvoices} disabled={saving} style={{ width: '100%', padding: 14 }}>
                  {saving ? 'Generating...' : 'Generate Invoices for All Tenants'}
                </button>
                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
                  This creates draft invoices you can review, download as PDF, and email to tenants
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── Billing periods list ───
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Billing</h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Monthly utility billing workflow</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)} disabled={properties.length === 0}>+ New Billing Period</button>
      </div>

      {properties.length === 0 && (
        <div className="card"><div className="empty-state">
          <h3>Add a property first</h3>
          <p>You need at least one property with units before creating a billing period</p>
          <a href="/properties" className="btn btn-primary" style={{ textDecoration: 'none' }}>Go to Properties</a>
        </div></div>
      )}

      {showNew && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={createPeriod} className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="label">Property</label>
              <select className="input" required value={newForm.property_id} onChange={e => setNewForm({...newForm, property_id: e.target.value})}>
                <option value="">Select property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name} ({p.units?.length || 0} units)</option>)}
              </select>
            </div>
            <div style={{ flex: '0 1 160px' }}>
              <label className="label">Period Start</label>
              <input className="input" type="date" value={newForm.period_start} onChange={e => setNewForm({...newForm, period_start: e.target.value})} />
            </div>
            <div style={{ flex: '0 1 160px' }}>
              <label className="label">Period End</label>
              <input className="input" type="date" value={newForm.period_end} onChange={e => setNewForm({...newForm, period_end: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {periods.length > 0 ? (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Property</th><th>Period</th><th>Utilities</th><th>Total</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {periods.map(p => {
                const total = (p.utility_bills || []).reduce((s, b) => s + parseFloat(b.amount || 0), 0)
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openPeriod(p.id)}>
                    <td style={{ fontWeight: 600 }}>{p.properties?.name}</td>
                    <td style={{ fontSize: 13, color: '#6b7280' }}>{safeDate(p.period_start)} — {safeDate(p.period_end)}</td>
                    <td style={{ fontFamily: "'DM Mono', monospace" }}>{(p.utility_bills || []).length} bills</td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{formatCurrency(total)}</td>
                    <td><span className={`badge status-${p.status}`}>{STATUS_LABELS[p.status]}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 11 }} onClick={e => { e.stopPropagation(); deletePeriod(p.id) }}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : properties.length > 0 ? (
        <div className="card"><div className="empty-state">
          <h3>No billing periods yet</h3>
          <p>Create your first billing period to start calculating tenant utility charges</p>
        </div></div>
      ) : null}
    </div>
  )
}