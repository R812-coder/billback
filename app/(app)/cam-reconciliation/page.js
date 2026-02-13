'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { calculateCAMReconciliation, formatCurrency, formatPct } from '@/lib/calculations'

const CAM_CATEGORIES = ['maintenance', 'landscaping', 'insurance', 'taxes', 'utilities', 'management', 'janitorial', 'security', 'other']

export default function CAMReconciliation() {
  const [properties, setProperties] = useState([])
  const [budgets, setBudgets] = useState([])
  const [activeBudget, setActiveBudget] = useState(null)
  const [items, setItems] = useState([])
  const [estimates, setEstimates] = useState([])
  const [units, setUnits] = useState([])
  const [reconciliation, setReconciliation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ property_id: '', year: new Date().getFullYear() })
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [propRes, budgetRes] = await Promise.all([
      supabase.from('properties').select('*, units(*)').eq('user_id', user.id).in('property_type', ['commercial', 'mixed']),
      supabase.from('cam_budgets').select('*, properties(name, property_type)').order('year', { ascending: false }),
    ])
    setProperties(propRes.data || [])
    setBudgets(budgetRes.data || [])
    setLoading(false)
  }

  async function createBudget(e) {
    e.preventDefault()
    const { data } = await supabase.from('cam_budgets').insert({ property_id: newForm.property_id, year: parseInt(newForm.year) }).select().single()
    if (data) { setShowNew(false); load(); openBudget(data.id) }
  }

  async function openBudget(budgetId) {
    const [budgetRes, itemsRes, estimatesRes] = await Promise.all([
      supabase.from('cam_budgets').select('*, properties(*, units(*))').eq('id', budgetId).single(),
      supabase.from('cam_budget_items').select('*').eq('cam_budget_id', budgetId).order('category'),
      supabase.from('cam_tenant_estimates').select('*, units(unit_number, tenant_name, sqft)').eq('cam_budget_id', budgetId),
    ])
    setActiveBudget(budgetRes.data)
    setItems(itemsRes.data || [])
    setEstimates(estimatesRes.data || [])
    setUnits(budgetRes.data?.properties?.units || [])
    setReconciliation(null)
  }

  async function addItem() {
    if (!activeBudget) return
    await supabase.from('cam_budget_items').insert({ cam_budget_id: activeBudget.id, category: 'maintenance', description: '', budgeted_amount: 0, actual_amount: 0 })
    openBudget(activeBudget.id)
  }

  async function updateItem(id, field, value) {
    const numFields = ['budgeted_amount', 'actual_amount']
    await supabase.from('cam_budget_items').update({ [field]: numFields.includes(field) ? parseFloat(value) || 0 : value }).eq('id', id)
    // Update local state immediately
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: numFields.includes(field) ? parseFloat(value) || 0 : value } : i))
  }

  async function deleteItem(id) {
    await supabase.from('cam_budget_items').delete().eq('id', id)
    openBudget(activeBudget.id)
  }

  async function setupEstimates() {
    if (!activeBudget) return
    const occupiedUnits = units.filter(u => !u.is_vacant)
    const totalBudgeted = items.reduce((s, i) => s + (parseFloat(i.budgeted_amount) || 0), 0)
    const totalSqft = occupiedUnits.reduce((s, u) => s + (parseFloat(u.sqft) || 0), 0)

    // Delete existing
    await supabase.from('cam_tenant_estimates').delete().eq('cam_budget_id', activeBudget.id)

    const inserts = occupiedUnits.map(unit => {
      const share = totalSqft > 0 ? (parseFloat(unit.sqft) || 0) / totalSqft : 0
      const annualShare = totalBudgeted * share
      return { cam_budget_id: activeBudget.id, unit_id: unit.id, monthly_estimate: Math.round(annualShare / 12 * 100) / 100, total_paid: 0 }
    })
    await supabase.from('cam_tenant_estimates').insert(inserts)
    openBudget(activeBudget.id)
  }

  async function updateEstimate(id, field, value) {
    await supabase.from('cam_tenant_estimates').update({ [field]: parseFloat(value) || 0 }).eq('id', id)
    setEstimates(prev => prev.map(e => e.id === id ? { ...e, [field]: parseFloat(value) || 0 } : e))
  }

  function runReconciliation() {
    const result = calculateCAMReconciliation(items, units, estimates)
    setReconciliation(result)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>

  // ─── Active budget view ───
  if (activeBudget) {
    const totalBudgeted = items.reduce((s, i) => s + (parseFloat(i.budgeted_amount) || 0), 0)
    const totalActual = items.reduce((s, i) => s + (parseFloat(i.actual_amount) || 0), 0)

    return (
      <div>
        <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => { setActiveBudget(null); setReconciliation(null) }}>← Back</button>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700 }}>{activeBudget.properties?.name} — {activeBudget.year} CAM</h1>
        </div>

        {/* Budget items */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Expense Categories</h2>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={addItem}>+ Add Line</button>
          </div>
          {items.length > 0 ? (
            <table className="table">
              <thead><tr><th>Category</th><th>Description</th><th style={{ textAlign: 'right' }}>Budgeted</th><th style={{ textAlign: 'right' }}>Actual</th><th style={{ textAlign: 'right' }}>Variance</th><th></th></tr></thead>
              <tbody>
                {items.map(item => {
                  const variance = (parseFloat(item.actual_amount) || 0) - (parseFloat(item.budgeted_amount) || 0)
                  return (
                    <tr key={item.id}>
                      <td>
                        <select className="input" style={{ padding: '4px 8px', fontSize: 12 }} value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)}>
                          {CAM_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                      </td>
                      <td><input className="input" style={{ padding: '4px 8px', fontSize: 12 }} value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Description" /></td>
                      <td><input className="input input-mono" type="number" style={{ padding: '4px 8px', fontSize: 12, textAlign: 'right' }} value={item.budgeted_amount} onChange={e => updateItem(item.id, 'budgeted_amount', e.target.value)} /></td>
                      <td><input className="input input-mono" type="number" style={{ padding: '4px 8px', fontSize: 12, textAlign: 'right' }} value={item.actual_amount} onChange={e => updateItem(item.id, 'actual_amount', e.target.value)} /></td>
                      <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 600, color: variance > 0 ? '#dc2626' : variance < 0 ? '#16a34a' : '#6b7280' }}>{variance > 0 ? '+' : ''}{formatCurrency(variance)}</td>
                      <td><button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12 }} onClick={() => deleteItem(item.id)}>×</button></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8f7f6' }}>
                  <td colSpan={2} style={{ fontWeight: 700 }}>TOTALS</td>
                  <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{formatCurrency(totalBudgeted)}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{formatCurrency(totalActual)}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700, color: totalActual - totalBudgeted > 0 ? '#dc2626' : '#16a34a' }}>{totalActual - totalBudgeted > 0 ? '+' : ''}{formatCurrency(totalActual - totalBudgeted)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="empty-state"><p>Add expense categories to build your CAM budget</p></div>
          )}
        </div>

        {/* Tenant estimates */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Tenant Monthly Estimates</h2>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={setupEstimates}>
              {estimates.length > 0 ? '↻ Recalculate Estimates' : 'Generate Estimates'}
            </button>
          </div>
          {estimates.length > 0 ? (
            <table className="table">
              <thead><tr><th>Unit</th><th>Tenant</th><th>Sq Ft</th><th style={{ textAlign: 'right' }}>Monthly Est.</th><th style={{ textAlign: 'right' }}>Annual Est.</th><th style={{ textAlign: 'right' }}>Total Paid YTD</th></tr></thead>
              <tbody>
                {estimates.map(est => (
                  <tr key={est.id}>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{est.units?.unit_number}</td>
                    <td>{est.units?.tenant_name || '—'}</td>
                    <td style={{ fontFamily: "'DM Mono', monospace" }}>{est.units?.sqft?.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(est.monthly_estimate)}</td>
                    <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(est.monthly_estimate * 12)}</td>
                    <td><input className="input input-mono" type="number" style={{ padding: '4px 8px', fontSize: 12, textAlign: 'right', width: 120 }} value={est.total_paid} onChange={e => updateEstimate(est.id, 'total_paid', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><p>Set up budget items first, then generate tenant estimates</p></div>
          )}
        </div>

        {/* Run reconciliation */}
        {items.length > 0 && estimates.length > 0 && (
          <button className="btn btn-primary" style={{ width: '100%', padding: 14, marginBottom: 20 }} onClick={runReconciliation}>
            Run Year-End Reconciliation
          </button>
        )}

        {/* Reconciliation results */}
        {reconciliation && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, #f8fbf6, #f6f9fc)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Reconciliation Results</h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                Budget: {formatCurrency(reconciliation.total_budgeted)} → Actual: {formatCurrency(reconciliation.total_actual)} ({reconciliation.variance_pct > 0 ? '+' : ''}{reconciliation.variance_pct.toFixed(1)}%)
              </p>
            </div>
            <table className="table">
              <thead><tr><th>Unit</th><th>Tenant</th><th>Pro-Rata</th><th style={{ textAlign: 'right' }}>Actual Share</th><th style={{ textAlign: 'right' }}>Paid</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
              <tbody>
                {reconciliation.tenants.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{t.unit_number}</td>
                    <td>{t.tenant_name || '—'}</td>
                    <td style={{ fontFamily: "'DM Mono', monospace", color: '#6b7280' }}>{formatPct(t.pro_rata_share)}</td>
                    <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(t.actual_share)}</td>
                    <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(t.total_paid)}</td>
                    <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700, color: t.reconciliation_amount > 0 ? '#dc2626' : '#16a34a' }}>
                      {t.reconciliation_amount > 0 ? 'Owes ' : 'Credit '}{formatCurrency(Math.abs(t.reconciliation_amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f0f4ff' }}>
                  <td colSpan={3} style={{ fontWeight: 700 }}>TOTALS</td>
                  <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{formatCurrency(reconciliation.total_actual)}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{formatCurrency(reconciliation.tenants.reduce((s, t) => s + t.total_paid, 0))}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: '#dc2626' }}>Owed: {formatCurrency(reconciliation.total_owed)}</span>
                    {reconciliation.total_credits > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: '#16a34a', marginLeft: 8 }}>Credits: {formatCurrency(reconciliation.total_credits)}</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ─── Budget list ───
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>CAM Reconciliation</h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Annual common area maintenance reconciliation for commercial properties</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)} disabled={properties.length === 0}>+ New CAM Budget</button>
      </div>

      {properties.length === 0 && (
        <div className="card"><div className="empty-state">
          <h3>No commercial properties</h3>
          <p>Add a commercial or mixed-use property first to use CAM reconciliation</p>
          <a href="/properties" className="btn btn-primary">Go to Properties →</a>
        </div></div>
      )}

      {showNew && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={createBudget} className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Property</label>
              <select className="input" required value={newForm.property_id} onChange={e => setNewForm({...newForm, property_id: e.target.value})}>
                <option value="">Select property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ width: 120 }}>
              <label className="label">Year</label>
              <input className="input input-mono" type="number" value={newForm.year} onChange={e => setNewForm({...newForm, year: e.target.value})} />
            </div>
            <button type="submit" className="btn btn-primary">Create</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
          </form>
        </div>
      )}

      {budgets.length > 0 && (
        <div className="card">
          <table className="table">
            <thead><tr><th>Property</th><th>Year</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {budgets.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => openBudget(b.id)}>
                  <td style={{ fontWeight: 600 }}>{b.properties?.name}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace" }}>{b.year}</td>
                  <td><span className={`badge ${b.status === 'reconciled' ? 'badge-green' : 'badge-blue'}`}>{b.status}</span></td>
                  <td style={{ textAlign: 'right' }}>Open →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
