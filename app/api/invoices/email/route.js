import { createServerSupabase } from '@/lib/supabase-server'
import { formatCurrency } from '@/lib/calculations'

export async function POST(request) {
  try {
    const { invoiceId } = await request.json()
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: invoice } = await supabase.from('invoices')
      .select('*, units(unit_number, tenant_name, tenant_email), billing_periods(period_start, period_end, properties(name, address))')
      .eq('id', invoiceId).single()

    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 })

    const email = invoice.tenant_email || invoice.units?.tenant_email
    if (!email) return Response.json({ error: 'No email for tenant' }, { status: 400 })

    const prop = invoice.billing_periods?.properties
    const period = invoice.billing_periods

    // Get sender profile
    const { data: profile } = await supabase.from('profiles').select('full_name, company_name, email').eq('id', user.id).single()

    const fromName = profile?.company_name || profile?.full_name || 'BillBack'

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <billing@${process.env.RESEND_DOMAIN || 'updates.billback.app'}>`,
        to: [email],
        subject: `Utility Invoice ${invoice.invoice_number} — ${formatCurrency(invoice.amount)} due`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1f2937;">
            <div style="background: #1a1a2e; color: white; padding: 24px 32px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">Utility Invoice</h1>
              <p style="margin: 4px 0 0; opacity: 0.7; font-size: 14px;">${prop?.name || ''}</p>
            </div>
            <div style="background: white; padding: 32px; border: 1px solid #e5e2de; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Hi ${invoice.tenant_name || invoice.units?.tenant_name || 'Tenant'},</p>
              <p>Your utility bill for <strong>${period?.period_start ? new Date(period.period_start).toLocaleDateString() : ''} — ${period?.period_end ? new Date(period.period_end).toLocaleDateString() : ''}</strong> is ready.</p>
              
              <div style="background: #f8f7f6; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">AMOUNT DUE</div>
                <div style="font-size: 32px; font-weight: 700; color: #1a1a2e;">${formatCurrency(invoice.amount)}</div>
                ${invoice.due_date ? `<div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Due by ${new Date(invoice.due_date).toLocaleDateString()}</div>` : ''}
              </div>

              <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #6b7280;">Invoice #</td><td style="padding: 6px 0; text-align: right; font-family: monospace;">${invoice.invoice_number}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Unit</td><td style="padding: 6px 0; text-align: right;">${invoice.units?.unit_number || ''}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Property</td><td style="padding: 6px 0; text-align: right;">${prop?.name || ''}</td></tr>
              </table>

              <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">Please contact your property manager if you have questions about this bill.</p>
              
              <hr style="border: none; border-top: 1px solid #e5e2de; margin: 24px 0;">
              <p style="font-size: 11px; color: #9ca3af; text-align: center;">
                Sent via BillBack — Utility billing for landlords and property managers
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return Response.json({ error: err.message || 'Email send failed' }, { status: 500 })
    }

    // Update invoice status
    await supabase.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invoiceId)

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
