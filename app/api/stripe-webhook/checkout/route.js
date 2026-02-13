import { createServerSupabase } from '@/lib/supabase-server'
import { PLANS } from '@/lib/plans'
import { sendEmail, paymentReceiptEmail, subscriptionCancelledEmail } from '@/lib/email'

// ─── POST: Create Checkout Session OR Handle Webhook ───
export async function POST(request) {
  try {
    // ─── Stripe Webhook (incoming from Stripe) ───
    if (request.headers.get('stripe-signature')) {
      return handleWebhook(request)
    }

    // ─── Create Checkout Session (from our frontend) ───
    const { plan } = await request.json()
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const planConfig = PLANS[plan]
    if (!planConfig || !planConfig.stripe_price_id) {
      return Response.json({
        error: 'Stripe not configured for this plan. Set stripe_price_id in lib/plans.js'
      }, { status: 400 })
    }

    const { data: profile } = await supabase.from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    // Create or reuse Stripe customer
    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    // IMPORTANT: Stripe handles ALL payment UI and card storage
    // No sensitive card data ever touches our server
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planConfig.stripe_price_id, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      metadata: { user_id: user.id, plan },
      // Security: let Stripe handle tax if needed
      automatic_tax: { enabled: false },
      // Allow promo codes
      allow_promotion_codes: true,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[Checkout] Error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ─── Handle Stripe Webhooks ───
async function handleWebhook(request) {
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    // CRITICAL: Verify webhook signature to prevent spoofed events
    let event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err.message)
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Use service role to update any user's profile
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    switch (event.type) {
      // ─── Checkout completed — activate subscription ───
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id
        const plan = session.metadata?.plan

        if (userId && plan) {
          await supabase.from('profiles').update({
            plan,
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            trial_ends_at: null, // Clear trial — they're now paying
          }).eq('id', userId)

          // Send welcome/receipt email
          const { data: profile } = await supabase.from('profiles')
            .select('email, full_name')
            .eq('id', userId)
            .single()

          if (profile?.email) {
            const planConfig = PLANS[plan]
            const template = paymentReceiptEmail(
              profile.full_name,
              planConfig?.name || plan,
              planConfig?.priceLabel || `$${planConfig?.price}/mo`,
              null // Next billing date comes from invoice.paid event
            )
            await sendEmail({ to: profile.email, subject: template.subject, html: template.html })
          }
        }
        break
      }

      // ─── Recurring payment succeeded ───
      case 'invoice.paid': {
        const invoice = event.data.object
        if (invoice.billing_reason === 'subscription_cycle') {
          const customerId = invoice.customer
          const { data: profile } = await supabase.from('profiles')
            .select('id, email, full_name, plan')
            .eq('stripe_customer_id', customerId)
            .single()

          if (profile?.email) {
            const planConfig = PLANS[profile.plan]
            const nextDate = invoice.lines?.data?.[0]?.period?.end
            const template = paymentReceiptEmail(
              profile.full_name,
              planConfig?.name || profile.plan,
              `$${(invoice.amount_paid / 100).toFixed(2)}`,
              nextDate ? new Date(nextDate * 1000).toLocaleDateString() : null
            )
            await sendEmail({ to: profile.email, subject: template.subject, html: template.html })
          }
        }
        break
      }

      // ─── Payment failed ───
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = invoice.customer
        const { data: profile } = await supabase.from('profiles')
          .select('id, email, full_name')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile?.email) {
          // Stripe automatically retries and sends its own dunning emails
          // We just log it on our side
          console.warn(`[Webhook] Payment failed for user ${profile.id}`)
        }
        break
      }

      // ─── Subscription cancelled ───
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const { data: profile } = await supabase.from('profiles')
          .select('id, email, full_name')
          .eq('stripe_subscription_id', sub.id)
          .single()

        if (profile) {
          await supabase.from('profiles').update({
            plan: 'free',
            stripe_subscription_id: null,
          }).eq('id', profile.id)

          if (profile.email) {
            const endDate = sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toLocaleDateString()
              : 'soon'
            const template = subscriptionCancelledEmail(profile.full_name, endDate)
            await sendEmail({ to: profile.email, subject: template.subject, html: template.html })
          }
        }
        break
      }

      // ─── Subscription updated (e.g. plan change, cancel at period end) ───
      case 'customer.subscription.updated': {
        const sub = event.data.object
        if (sub.cancel_at_period_end) {
          console.log(`[Webhook] Subscription ${sub.id} will cancel at period end`)
        }
        break
      }
    }

    return Response.json({ received: true })
  } catch (err) {
    console.error('[Webhook] Error:', err)
    return Response.json({ error: err.message }, { status: 400 })
  }
}