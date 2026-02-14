import { createServerSupabase } from '@/lib/supabase-server'
import { PLANS } from '@/lib/plans'

// POST /api/stripe-webhook/checkout — Create Stripe Checkout session OR handle webhook
export async function POST(request) {
  try {
    // ─── Stripe Webhook (incoming from Stripe) ───
    if (request.headers.get('stripe-signature')) {
      return handleWebhook(request)
    }

    // ─── Create Checkout Session ───
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
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// Handle Stripe webhooks
async function handleWebhook(request) {
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const body = await request.text()
    const sig = request.headers.get('stripe-signature')
    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id
        const plan = session.metadata?.plan
        if (userId && plan) {
          await supabase.from('profiles').update({
            plan,
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            subscription_ends_at: null, // clear any previous cancellation
          }).eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const { data } = await supabase.from('profiles').select('id').eq('stripe_subscription_id', sub.id).single()
        if (!data) break

        if (sub.cancel_at_period_end) {
          // User cancelled — plan stays active until period ends
          const endsAt = new Date(sub.current_period_end * 1000).toISOString()
          await supabase.from('profiles').update({
            subscription_ends_at: endsAt,
          }).eq('id', data.id)
        } else {
          // User reactivated — clear cancellation
          await supabase.from('profiles').update({
            subscription_ends_at: null,
          }).eq('id', data.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        // Subscription actually ended (period over or immediate cancel)
        const sub = event.data.object
        const { data } = await supabase.from('profiles').select('id').eq('stripe_subscription_id', sub.id).single()
        if (data) {
          // Keep subscription_ends_at so Settings can show "cancelled on [date]"
          const endedAt = sub.ended_at
            ? new Date(sub.ended_at * 1000).toISOString()
            : new Date().toISOString()

          await supabase.from('profiles').update({
            plan: 'free',
            stripe_subscription_id: null,
            subscription_ends_at: endedAt,
          }).eq('id', data.id)
        }
        break
      }

      case 'invoice.paid': {
        break
      }

      case 'invoice.payment_failed': {
        break
      }
    }

    return Response.json({ received: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}