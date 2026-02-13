import { createClient } from '@supabase/supabase-js'
import { sendEmail, trialExpiringSoonEmail, trialExpiredEmail } from '@/lib/email'

// GET /api/cron/trial-reminders
// Called daily by Vercel Cron (see vercel.json)
// Sends trial expiring (3 days left) and trial expired emails

export async function GET(request) {
  try {
    // Verify cron secret (Vercel sends this header)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role to access all users
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // ─── Trial expiring in 3 days ───
    const threeDaysFromNow = new Date(now)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const targetDate = threeDaysFromNow.toISOString().split('T')[0]

    const { data: expiringSoon } = await supabase.from('profiles')
      .select('id, email, full_name, trial_ends_at, plan')
      .eq('plan', 'free')
      .not('trial_ends_at', 'is', null)
      .gte('trial_ends_at', targetDate + 'T00:00:00')
      .lte('trial_ends_at', targetDate + 'T23:59:59')

    let sentCount = 0

    for (const user of (expiringSoon || [])) {
      // Check if we already sent this reminder
      const { data: existing } = await supabase.from('email_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('email_type', 'trial_expiring_3d')
        .single()

      if (!existing) {
        const template = trialExpiringSoonEmail(user.full_name, 3)
        await sendEmail({ to: user.email, subject: template.subject, html: template.html })
        await supabase.from('email_log').insert({
          user_id: user.id,
          email_type: 'trial_expiring_3d',
          sent_at: now.toISOString(),
        })
        sentCount++
      }
    }

    // ─── Trial expired today ───
    const { data: expiredToday } = await supabase.from('profiles')
      .select('id, email, full_name, trial_ends_at, plan')
      .eq('plan', 'free')
      .not('trial_ends_at', 'is', null)
      .gte('trial_ends_at', today + 'T00:00:00')
      .lte('trial_ends_at', today + 'T23:59:59')

    for (const user of (expiredToday || [])) {
      const { data: existing } = await supabase.from('email_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('email_type', 'trial_expired')
        .single()

      if (!existing) {
        const template = trialExpiredEmail(user.full_name)
        await sendEmail({ to: user.email, subject: template.subject, html: template.html })
        await supabase.from('email_log').insert({
          user_id: user.id,
          email_type: 'trial_expired',
          sent_at: now.toISOString(),
        })
        sentCount++
      }
    }

    return Response.json({ success: true, emailsSent: sentCount })
  } catch (err) {
    console.error('[Cron] Trial reminder error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}