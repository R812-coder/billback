import { PLANS } from '@/lib/plans'

// POST /api/stripe-webhook/checkout — Create Checkout OR handle Stripe webhook
export async function POST(request) {
  try {
    // ─── Stripe Webhook (incoming from Stripe) ───
    if (request.headers.get('stripe-signature')) {
      return handleWebhook(request)
    }

    // ─── Create Checkout Session ───
    const { createServerSupabase } = await import('@/lib/supabase-server')
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
      // ─── User completed checkout → activate subscription ───
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id
        const plan = session.metadata?.plan
        if (userId && plan) {
          await supabase.from('profiles').update({
            plan,
            subscription_status: 'active',
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            trial_expired_notified: false,
          }).eq('id', userId)
        }
        break
      }

      // ─── Subscription cancelled → downgrade to free ───
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const { data } = await supabase.from('profiles').select('id').eq('stripe_subscription_id', sub.id).single()
        if (data) {
          await supabase.from('profiles').update({
            plan: 'free',
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
          }).eq('id', data.id)
        }
        break
      }

      // ─── Subscription updated (renewal, plan change, etc.) ───
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const { data } = await supabase.from('profiles').select('id').eq('stripe_subscription_id', sub.id).single()
        if (data) {
          const updates = {}
          if (sub.status === 'active') updates.subscription_status = 'active'
          if (sub.status === 'past_due') updates.subscription_status = 'past_due'
          if (sub.cancel_at_period_end) {
            // User cancelled but still has access until period end — keep current plan
            updates.subscription_status = 'active' // still active until period ends
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from('profiles').update(updates).eq('id', data.id)
          }
        }
        break
      }

      // ─── Payment failed → mark as past_due ───
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          const { data } = await supabase.from('profiles').select('id').eq('stripe_subscription_id', invoice.subscription).single()
          if (data) {
            await supabase.from('profiles').update({ subscription_status: 'past_due' }).eq('id', data.id)
          }
        }
        break
      }

      // ─── Payment succeeded → ensure active ───
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (invoice.subscription) {
          const { data } = await supabase.from('profiles').select('id').eq('stripe_subscription_id', invoice.subscription).single()
          if (data) {
            await supabase.from('profiles').update({ subscription_status: 'active' }).eq('id', data.id)
          }
        }
        break
      }
    }

    return Response.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err.message)
    return Response.json({ error: err.message }, { status: 400 })
  }
}
