'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { formatCurrency } from '@/lib/calculations'

export default function Dashboard() {
  const [stats, setStats] = useState({ properties: 0, units: 0, outstanding: 0, collected: 0 })
  const [recentInvoices, setRecentInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [propRes, invRes, payRes] = await Promise.all([
      supabase.from('properties').select('id, units(id)').eq('user_id', user.id),
      supabase.from('invoices').select('*, units(unit_number), billing_periods(properties(name))').order('created_at', { ascending: false }).limit(5),
      supabase.from('payments').select('amount'),
    ])

    const properties = propRes.data || []
    const totalUnits = properties.reduce((s, p) => s + (p.units?.length || 0), 0)
    const invoices = invRes.data || []
    const totalCollected = (payRes.data || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0)

    const { data: allInvoices } = await supabase.from('invoices')
      .select('amount, status')
      .neq('status', 'cancelled')

    const totalInvoiced = (allInvoices || []).reduce((s, i) => s + parseFloat(i.amount || 0), 0)
    const outstanding = Math.max(0, totalInvoiced - totalCollected)

    setStats({ properties: properties.length, units: totalUnits, outstanding, collected: totalCollected })
    setRecentInvoices(invoices)
    setLoading(false)
  }

  if (loading) return null

  const statCards = [
    { label: 'Properties', value: stats.properties, color: '#1a1a2e' },
    { label: 'Total Units', value: stats.units, color: '#1a1a2e' },
    { label: 'Outstanding', value: formatCurrency(stats.outstanding), color: stats.outstanding > 0 ? '#d97706' : '#6b7280' },
    { label: 'Collected', value: formatCurrency(stats.collected), color: '#16a34a' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Overview of your properties and billing</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.04em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header"><h2 style={{ fontSize: 16, fontWeight: 700 }}>Quick Actions</h2></div>
        <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/properties" className="btn btn-primary" style={{ textDecoration: 'none' }}>+ Add Property</a>
          <a href="/billing" className="btn btn-secondary" style={{ textDecoration: 'none' }}>New Billing Period</a>
          <a href="/invoices" className="btn btn-secondary" style={{ textDecoration: 'none' }}>View Invoices</a>
          <a href="/payments" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Record Payment</a>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Invoices</h2>
          <a href="/invoices" style={{ fontSize: 13, color: '#3b5998', fontWeight: 500 }}>View all</a>
        </div>
        {recentInvoices.length > 0 ? (
          <table className="table">
            <thead><tr><th>Invoice</th><th>Property</th><th>Tenant</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {recentInvoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600 }}>{inv.invoice_number}</td>
                  <td style={{ fontSize: 13 }}>{inv.billing_periods?.properties?.name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{inv.tenant_name || '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{formatCurrency(inv.amount)}</td>
                  <td><span className={`badge status-${inv.status}`}>{inv.status?.charAt(0).toUpperCase() + inv.status?.slice(1)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <h3>No invoices yet</h3>
            <p>Create your first billing period to generate invoices</p>
            <a href="/billing" className="btn btn-primary" style={{ textDecoration: 'none' }}>Create Billing Period</a>
          </div>
        )}
      </div>
    </div>
  )
}