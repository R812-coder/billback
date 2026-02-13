'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { formatCurrency } from '@/lib/calculations'
import { useToast, useConfirm } from '@/app/components/Toast'

const STATUS_OPTIONS = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sending, setSending] = useState(null)
  const supabase = createClient()
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('invoices')
      .select('*, units(unit_number, tenant_name, tenant_email), billing_periods(period_start, period_end, properties(name))')
      .order('created_at', { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    const updates = { status }
    if (status === 'paid') updates.paid_at = new Date().toISOString()
    if (status === 'sent') updates.sent_at = new Date().toISOString()
    await supabase.from('invoices').update(updates).eq('id', id)
    toast?.success(`Invoice marked as ${status}`)
    load()
  }

  async function downloadPDF(invoice) {
    try {
      const res = await fetch('/api/invoices/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      })
      if (!res.ok) throw new Error('Invoice generation failed')
      const html = await res.text()
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        win.document.title = `Invoice ${invoice.invoice_number}`
      } else {
        toast?.warning('Please allow popups to view the invoice.')
      }
    } catch (err) {
      toast?.error('Error generating invoice: ' + err.message)
    }
  }

  async function emailInvoice(invoice) {
    if (!invoice.tenant_email && !invoice.units?.tenant_email) {
      toast?.warning('No email address on file for this tenant. Add their email in Properties.')
      return
    }
    setSending(invoice.id)
    try {
      const res = await fetch('/api/invoices/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      })
      if (!res.ok) throw new Error('Email failed')
      await updateStatus(invoice.id, 'sent')
      toast?.success('Invoice emailed successfully')
    } catch (err) {
      toast?.error('Error sending email: ' + err.message)
    }
    setSending(null)
  }

  async function emailAll() {
    const drafts = filtered.filter(i => i.status === 'draft' && (i.tenant_email || i.units?.tenant_email))
    if (drafts.length === 0) { toast?.warning('No draft invoices with tenant emails to send.'); return }
    const ok = await confirm(`Send ${drafts.length} invoices by email?`, {
      title: 'Email Invoices',
      confirmText: `Send ${drafts.length} Emails`,
    })
    if (!ok) return
    setSending('all')
    let sent = 0
    for (const inv of drafts) {
      try {
        await fetch('/api/invoices/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceId: inv.id }) })
        await supabase.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', inv.id)
        sent++
      } catch {}
    }
    setSending(null)
    toast?.success(`${sent} invoice${sent !== 1 ? 's' : ''} emailed`)
    load()
  }

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)
  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: invoices.filter(i => i.status === s).length }), {})

  if (loading) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Invoices</h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>{invoices.length} total invoices</p>
        </div>
        {filtered.some(i => i.status === 'draft') && (
          <button className="btn btn-primary" onClick={emailAll} disabled={sending === 'all'}>
            {sending === 'all' ? 'Sending...' : `Email All Drafts (${statusCounts.draft})`}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {['all', ...STATUS_OPTIONS].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: filter === s ? '#1a1a2e' : '#f3f4f6', color: filter === s ? 'white' : '#6b7280',
            transition: 'all 0.15s',
          }}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} {s === 'all' ? `(${invoices.length})` : statusCounts[s] > 0 ? `(${statusCounts[s]})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <h3>No invoices{filter !== 'all' ? ` with status "${filter}"` : ''}</h3>
          <p>Invoices are generated from the Billing workflow</p>
          <a href="/billing" className="btn btn-primary" style={{ textDecoration: 'none' }}>Go to Billing</a>
        </div></div>
      ) : (
        <div className="card">
          <table className="table">
            <thead><tr><th>Invoice #</th><th>Property</th><th>Unit</th><th>Tenant</th><th>Amount</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 12 }}>{inv.invoice_number}</td>
                  <td style={{ fontSize: 13 }}>{inv.billing_periods?.properties?.name || '—'}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace" }}>{inv.units?.unit_number || '—'}</td>
                  <td>
                    <div style={{ fontSize: 13 }}>{inv.tenant_name || inv.units?.tenant_name || '—'}</div>
                    {(inv.tenant_email || inv.units?.tenant_email) && <div style={{ fontSize: 11, color: '#9ca3af' }}>{inv.tenant_email || inv.units?.tenant_email}</div>}
                  </td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{formatCurrency(inv.amount)}</td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{inv.due_date ? new Date(inv.due_date + 'T12:00:00').toLocaleDateString() : '—'}</td>
                  <td>
                    <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)}
                      className={`badge status-${inv.status}`}
                      style={{ border: 'none', cursor: 'pointer', fontSize: 11, padding: '3px 8px', borderRadius: 10 }}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => downloadPDF(inv)}>PDF</button>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => emailInvoice(inv)} disabled={sending === inv.id}>
                        {sending === inv.id ? '...' : 'Email'}
                      </button>
                      {inv.status !== 'paid' && (
                        <button className="btn btn-success" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => updateStatus(inv.id, 'paid')}>Paid</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}