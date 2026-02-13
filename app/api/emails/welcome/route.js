import { sendEmail, welcomeEmail } from '@/lib/email'

// POST /api/emails/welcome — Send welcome email after signup
// Called from auth callback or Supabase webhook
export async function POST(request) {
  try {
    const { email, name, secret } = await request.json()

    // Simple shared secret to prevent unauthorized calls
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

    const template = welcomeEmail(name)
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    })

    return Response.json({ success: result.success })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}