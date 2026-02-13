import { createClient } from '@supabase/supabase-js'
import { sendEmail, tenantOverdueEmail } from '@/lib/email'
import { formatCurrency } from '@/lib/calculations'

// GET /api/cron/overdue-reminders
// Called daily by Vercel Cron — sends overdue notices for unpaid invoices
// Only sends once per invoice (tracks in email_log)

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const today = new Date().toISOString().split('T')[0]

    // Find sent invoices that are past due
    const { data: overdue } = await supabase.from('invoices')
      .select('id, invoice_number, amount, due_date, tenant_name, tenant_email, units(tenant_name, tenant_email), billing_periods(properties(name))')
      .eq('status', 'sent')
      .lt('due_date', today)

    let sentCount = 0

    for (const inv of (overdue || [])) {
      const email = inv.tenant_email || inv.units?.tenant_email
      if (!email) continue

      // Check if already sent overdue reminder for this invoice
      const { data: existing } = await supabase.from('email_log')
        .select('id')
        .eq('email_type', 'invoice_overdue')
        .eq('metadata->>invoice_id', inv.id)
        .single()

      if (!existing) {
        const template = tenantOverdueEmail({
          tenantName: inv.tenant_name || inv.units?.tenant_name,
          invoiceNumber: inv.invoice_number,
          amount: formatCurrency(inv.amount),
          dueDate: new Date(inv.due_date + 'T00:00:00').toLocaleDateString(),
          propertyName: inv.billing_periods?.properties?.name,
        })

        await sendEmail({ to: email, subject: template.subject, html: template.html })

        // Update invoice status to overdue
        await supabase.from('invoices').update({ status: 'overdue' }).eq('id', inv.id)

        await supabase.from('email_log').insert({
          email_type: 'invoice_overdue',
          sent_at: new Date().toISOString(),
          metadata: { invoice_id: inv.id },
        })
        sentCount++
      }
    }

    return Response.json({ success: true, emailsSent: sentCount })
  } catch (err) {
    console.error('[Cron] Overdue reminder error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}