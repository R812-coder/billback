import { createServerSupabase } from '@/lib/supabase-server'

// POST /api/stripe-portal — Redirect user to Stripe's hosted billing portal
// Users can update payment method, cancel, view invoices — all on Stripe's secure UI
// NO sensitive payment data touches our servers

export async function POST(request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No active subscription found' }, { status: 400 })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[Portal] Error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}