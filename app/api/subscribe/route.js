import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email || !email.includes('@')) return Response.json({ error: 'Invalid email' }, { status: 400 })

    const supabase = await createServerSupabase()
    await supabase.from('waitlist').upsert({ email, source: 'calculator' }, { onConflict: 'email' })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
