// POST /api/stripe-webhook/checkout — Handle Stripe webhooks ONLY
export async function POST(request) {
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
      return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

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
            subscription_ends_at: null,
          }).eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const { data } = await supabase.from('profiles').select('id').eq('stripe_subscription_id', sub.id).single()
        if (!data) break

        if (sub.cancel_at_period_end) {
          const endsAt = new Date((sub.cancel_at || sub.current_period_end) * 1000).toISOString()
          await supabase.from('profiles').update({
            subscription_ends_at: endsAt,
          }).eq('id', data.id)
        } else {
          await supabase.from('profiles').update({
            subscription_ends_at: null,
          }).eq('id', data.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const { data } = await supabase.from('profiles').select('id').eq('stripe_subscription_id', sub.id).single()
        if (data) {
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

      case 'invoice.paid':
      case 'invoice.payment_failed':
        break
    }

    return Response.json({ received: true })
  } catch (err) {
    return Response.json({ error: 'Webhook verification failed' }, { status: 400 })
  }
}