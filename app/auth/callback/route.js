import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { sendEmail, welcomeEmail } from '@/lib/email'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabase()
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    // Send welcome email on first login (check if profile exists already)
    if (session?.user) {
      try {
        const { data: profile } = await supabase.from('profiles')
          .select('id, welcome_email_sent')
          .eq('id', session.user.id)
          .single()

        if (profile && !profile.welcome_email_sent) {
          const template = welcomeEmail(
            session.user.user_metadata?.full_name || session.user.email?.split('@')[0]
          )
          await sendEmail({
            to: session.user.email,
            subject: template.subject,
            html: template.html,
          })
          // Mark welcome email as sent
          await supabase.from('profiles')
            .update({ welcome_email_sent: true })
            .eq('id', session.user.id)
        }
      } catch (err) {
        // Don't block login if email fails
        console.error('[Auth] Welcome email error:', err)
      }
    }
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}