import { createServerSupabase } from '@/lib/supabase-server'
import { PLANS } from '@/lib/plans'

// POST /api/stripe-checkout — Create Stripe Checkout session
export async function POST(request) {
  try {
    const { plan } = await request.json()
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const planConfig = PLANS[plan]
    if (!planConfig || !planConfig.stripe_price_id) {
      return Response.json({ error: 'Invalid plan or Stripe not configured yet. Set stripe_price_id in lib/plans.js' }, { status: 400 })
    }

    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planConfig.stripe_price_id, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      metadata: { user_id: user.id, plan },
    })

    return Response.json({ url: session.url })
  } catch (err) {
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}