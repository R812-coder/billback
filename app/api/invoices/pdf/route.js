import { createServerSupabase } from '@/lib/supabase-server'
import { formatCurrency } from '@/lib/calculations'

export async function POST(request) {
  try {
    const { invoiceId } = await request.json()
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: invoice } = await supabase.from('invoices')
      .select('*, units(unit_number, tenant_name, tenant_email, sqft, occupants), tenant_charges(share_percentage, electric_amount, water_amount, gas_amount, trash_amount, sewer_amount, other_amount), billing_periods(period_start, period_end, allocation_method, properties(name, address, city, state, zip))')
      .eq('id', invoiceId).single()

    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 })

    const prop = invoice.billing_periods?.properties
    const charge = invoice.tenant_charges
    const period = invoice.billing_periods

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invoice ${invoice.invoice_number}</title><style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; margin: 40px; font-size: 13px; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; margin-bottom: 32px; border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; }
  .header h1 { font-size: 28px; color: #1a1a2e; margin: 0; }
  .invoice-number { font-size: 14px; color: #6b7280; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .info-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin: 0 0 8px; }
  .info-box p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th { background: #f8f7f6; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; border-bottom: 1px solid #e5e2de; }
  td { padding: 10px 12px; border-bottom: 1px solid #f0eeeb; }
  .text-right { text-align: right; }
  .text-mono { font-family: 'Courier New', monospace; }
  .total-row { background: #f0f4ff; font-weight: 700; }
  .total-row td { font-size: 15px; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e2de; font-size: 11px; color: #9ca3af; text-align: center; }
  .method-note { background: #f8f7f6; padding: 12px; border-radius: 6px; font-size: 12px; color: #6b7280; margin: 16px 0; }
  .print-hint { background: #fffbeb; border: 1px solid #fde68a; padding: 10px 14px; border-radius: 6px; font-size: 12px; color: #92400e; margin-bottom: 24px; }
  @media print { .print-hint { display: none; } }
</style></head>
<body>
  <div class="print-hint">To save as PDF: Press <strong>Ctrl+P</strong> (Windows) or <strong>Cmd+P</strong> (Mac), then select "Save as PDF" as the destination.</div>

  <div class="header">
    <div>
      <h1>UTILITY INVOICE</h1>
      <div class="invoice-number">${invoice.invoice_number}</div>
    </div>
    <div style="text-align: right;">
      <strong>${prop?.name || ''}</strong><br>
      ${prop?.address || ''}<br>
      ${prop?.city || ''}${prop?.state ? ', ' + prop.state : ''} ${prop?.zip || ''}
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Bill To</h3>
      <p><strong>${invoice.tenant_name || invoice.units?.tenant_name || 'Tenant'}</strong></p>
      <p>Unit ${invoice.units?.unit_number || ''}</p>
      ${invoice.tenant_email || invoice.units?.tenant_email ? `<p>${invoice.tenant_email || invoice.units?.tenant_email}</p>` : ''}
    </div>
    <div class="info-box" style="text-align: right;">
      <h3>Invoice Details</h3>
      <p>Period: ${period?.period_start ? new Date(period.period_start + 'T12:00:00').toLocaleDateString() : ''} — ${period?.period_end ? new Date(period.period_end + 'T12:00:00').toLocaleDateString() : ''}</p>
      <p>Issue Date: ${new Date().toLocaleDateString()}</p>
      ${invoice.due_date ? `<p>Due Date: <strong>${new Date(invoice.due_date + 'T12:00:00').toLocaleDateString()}</strong></p>` : ''}
    </div>
  </div>

  <table>
    <thead><tr><th>Utility</th><th class="text-right">Amount</th></tr></thead>
    <tbody>
      ${charge?.electric_amount > 0 ? `<tr><td>Electricity</td><td class="text-right text-mono">${formatCurrency(charge.electric_amount)}</td></tr>` : ''}
      ${charge?.water_amount > 0 ? `<tr><td>Water / Sewer</td><td class="text-right text-mono">${formatCurrency(charge.water_amount)}</td></tr>` : ''}
      ${charge?.gas_amount > 0 ? `<tr><td>Gas</td><td class="text-right text-mono">${formatCurrency(charge.gas_amount)}</td></tr>` : ''}
      ${charge?.trash_amount > 0 ? `<tr><td>Trash</td><td class="text-right text-mono">${formatCurrency(charge.trash_amount)}</td></tr>` : ''}
      ${charge?.sewer_amount > 0 ? `<tr><td>Sewer</td><td class="text-right text-mono">${formatCurrency(charge.sewer_amount)}</td></tr>` : ''}
      ${charge?.other_amount > 0 ? `<tr><td>Other</td><td class="text-right text-mono">${formatCurrency(charge.other_amount)}</td></tr>` : ''}
      <tr class="total-row"><td>TOTAL DUE</td><td class="text-right text-mono">${formatCurrency(invoice.amount)}</td></tr>
    </tbody>
  </table>

  <div class="method-note">
    Allocation method: ${period?.allocation_method === 'sqft' ? 'Square footage' : period?.allocation_method === 'occupancy' ? 'Occupancy' : period?.allocation_method === 'weighted' ? 'Weighted blend' : period?.allocation_method || 'Standard'}
    — Your unit's share: ${charge?.share_percentage ? (charge.share_percentage * 100).toFixed(1) + '%' : 'N/A'}
    ${invoice.units?.sqft ? ` (${invoice.units.sqft.toLocaleString()} sq ft)` : ''}
  </div>

  ${invoice.notes ? `<p style="margin-top: 16px;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}

  <div class="footer">
    <p>Generated by BillBack — Utility Bill-Back Platform for Landlords</p>
    <p>This invoice was calculated using the RUBS (Ratio Utility Billing System) method.</p>
  </div>
</body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}