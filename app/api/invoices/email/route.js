import { createServerSupabase } from '@/lib/supabase-server'
import { sendEmail, tenantInvoiceEmail } from '@/lib/email'
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
    if (!email) return Response.json({ error: 'No email address for this tenant' }, { status: 400 })

    const prop = invoice.billing_periods?.properties
    const period = invoice.billing_periods
    const { data: profile } = await supabase.from('profiles').select('full_name, company_name, email').eq('id', user.id).single()
    const fromName = profile?.company_name || profile?.full_name || 'BillBack'

    const template = tenantInvoiceEmail({
      tenantName: invoice.tenant_name || invoice.units?.tenant_name,
      invoiceNumber: invoice.invoice_number,
      amount: formatCurrency(invoice.amount),
      dueDate: invoice.due_date ? new Date(invoice.due_date + 'T00:00:00').toLocaleDateString() : null,
      unitNumber: invoice.units?.unit_number,
      propertyName: prop?.name,
      periodStart: period?.period_start ? new Date(period.period_start + 'T00:00:00').toLocaleDateString() : '',
      periodEnd: period?.period_end ? new Date(period.period_end + 'T00:00:00').toLocaleDateString() : '',
      fromName,
    })

    const domain = process.env.RESEND_DOMAIN || 'updates.billback.app'
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      from: `${fromName} <billing@${domain}>`,
      replyTo: profile?.email || user.email,
    })

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 500 })
    }

    // Update invoice status
    await supabase.from('invoices').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    }).eq('id', invoiceId)

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}