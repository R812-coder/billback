'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { formatCurrency, PAYMENT_METHODS } from '@/lib/calculations'
import { useToast, useConfirm } from '@/app/components/Toast'

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [unpaidInvoices, setUnpaidInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ invoice_id: '', amount: '', payment_method: 'check', payment_date: new Date().toISOString().slice(0, 10), reference_number: '', notes: '' })
  const supabase = createClient()
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => { load() }, [])

  async function load() {
    const [payRes, invRes] = await Promise.all([
      supabase.from('payments').select('*, invoices(invoice_number, tenant_name, amount, status, units(unit_number), billing_periods(properties(name)))').order('payment_date', { ascending: false }),
      supabase.from('invoices').select('*, units(unit_number, tenant_name), billing_periods(properties(name))').in('status', ['draft', 'sent', 'overdue']).order('created_at', { ascending: false }),
    ])
    setPayments(payRes.data || [])
    setUnpaidInvoices(invRes.data || [])
    setLoading(false)
  }

  async function recordPayment(e) {
    e.preventDefault()
    setSaving(true)
    const invoice = unpaidInvoices.find(i => i.id === form.invoice_id)
    if (!invoice) { setSaving(false); return }

    const paymentAmount = parseFloat(form.amount) || 0

    const { error } = await supabase.from('payments').insert({
      invoice_id: form.invoice_id,
      amount: paymentAmount,
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
    })

    if (error) {
      console.error('Payment error:', error)
      toast?.error('Error recording payment: ' + error.message)
      setSaving(false)
      return
    }

    // Only mark as paid if total payments >= invoice amount
    const { data: allPayments } = await supabase.from('payments')
      .select('amount')
      .eq('invoice_id', form.invoice_id)

    const totalPaid = (allPayments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const invoiceAmount = parseFloat(invoice.amount) || 0

    if (totalPaid >= invoiceAmount) {
      await supabase.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString()
      }).eq('id', form.invoice_id)
      toast?.success(`Payment recorded — invoice fully paid`)
    } else {
      const remaining = invoiceAmount - totalPaid
      toast?.success(`Payment recorded — ${formatCurrency(remaining)} remaining on this invoice`)
    }

    setSaving(false)
    setShowForm(false)
    setForm({ invoice_id: '', amount: '', payment_method: 'check', payment_date: new Date().toISOString().slice(0, 10), reference_number: '', notes: '' })
    load()
  }

  async function deletePayment(payment) {
    const confirmed = await confirm('Delete this payment record? The invoice status will be updated accordingly.', {
      title: 'Delete Payment',
      confirmText: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    const { data: remainingPayments } = await supabase.from('payments')
      .select('amount')
      .eq('invoice_id', payment.invoice_id)
      .neq('id', payment.id)

    const remainingTotal = (remainingPayments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

    await supabase.from('payments').delete().eq('id', payment.id)

    // If this deletion drops total below invoice amount, revert to sent
    const invAmount = parseFloat(payment.invoices?.amount || 0)
    if (remainingTotal < invAmount && payment.invoices?.status === 'paid') {
      await supabase.from('invoices').update({ status: 'sent', paid_at: null }).eq('id', payment.invoice_id)
    }

    toast?.success('Payment deleted')
    load()
  }

  // FIX: Outstanding = sum of unpaid invoice amounts MINUS partial payments already made on them
  // For each unpaid invoice, subtract any payments already recorded
  const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  // Calculate true outstanding: for each unpaid invoice, get how much is actually still owed
  const invoicePayments = {}
  payments.forEach(p => {
    if (p.invoice_id) {
      invoicePayments[p.invoice_id] = (invoicePayments[p.invoice_id] || 0) + parseFloat(p.amount || 0)
    }
  })
  const totalOutstanding = unpaidInvoices.reduce((s, inv) => {
    const paid = invoicePayments[inv.id] || 0
    const remaining = Math.max(0, parseFloat(inv.amount || 0) - paid)
    return s + remaining
  }, 0)

  if (loading) return null // No "Loading..." flash — just mount clean

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Payments</h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Track tenant payments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} disabled={unpaidInvoices.length === 0}>+ Record Payment</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>TOTAL COLLECTED</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: '#16a34a' }}>{formatCurrency(totalCollected)}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>OUTSTANDING</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: totalOutstanding > 0 ? '#d97706' : '#6b7280' }}>{formatCurrency(totalOutstanding)}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>UNPAID INVOICES</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{unpaidInvoices.length}</div>
        </div>
      </div>

      {/* Record payment form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2 style={{ fontSize: 16, fontWeight: 700 }}>Record Payment</h2></div>
          <form onSubmit={recordPayment} className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Invoice</label>
              <select className="input" required value={form.invoice_id} onChange={e => {
                const inv = unpaidInvoices.find(i => i.id === e.target.value)
                setForm({ ...form, invoice_id: e.target.value, amount: inv?.amount?.toString() || '' })
              }}>
                <option value="">Select invoice...</option>
                {unpaidInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.tenant_name || inv.units?.tenant_name || 'Unknown'} — {formatCurrency(inv.amount)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Amount</label>
              <input className="input input-mono" type="number" step="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            </div>
            <div>
              <label className="label">Method</label>
              <select className="input" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} />
            </div>
            <div>
              <label className="label">Reference #</label>
              <input className="input" value={form.reference_number} onChange={e => setForm({...form, reference_number: e.target.value})} placeholder="Check #, txn ID" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes about this payment" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Payments history */}
      {payments.length > 0 ? (
        <div className="card">
          <div className="card-header"><h2 style={{ fontSize: 16, fontWeight: 700 }}>Payment History</h2></div>
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Invoice</th><th>Property</th><th>Tenant</th><th>Amount</th><th>Method</th><th>Ref #</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={{ fontSize: 13 }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{p.invoices?.invoice_number}</td>
                  <td style={{ fontSize: 13 }}>{p.invoices?.billing_periods?.properties?.name || '—'}</td>
                  <td>{p.invoices?.tenant_name || '—'}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#16a34a' }}>{formatCurrency(p.amount)}</td>
                  <td><span className="badge badge-gray">{PAYMENT_METHODS.find(m => m.value === p.payment_method)?.label || p.payment_method}</span></td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{p.reference_number || '—'}</td>
                  <td style={{ fontSize: 12, color: '#6b7280', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                  <td><button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12 }} onClick={() => deletePayment(p)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card"><div className="empty-state">
          <h3>No payments recorded yet</h3>
          <p>Record payments as tenants pay their utility bills</p>
        </div></div>
      )}
    </div>
  )
}