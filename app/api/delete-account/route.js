import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Use service role client for deletion
    const { createClient } = await import('@supabase/supabase-js')
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    // 1. Cancel active Stripe subscription if exists
    if (profile?.stripe_subscription_id) {
      try {
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        await stripe.subscriptions.cancel(profile.stripe_subscription_id)
      } catch (e) {
        console.error('Stripe cancellation error:', e.message)
        // Continue with deletion even if Stripe fails
      }
    }

    // 2. Delete all user data (cascade should handle most, but be explicit)
    // Order matters: children first
    const { data: properties } = await adminSupabase
      .from('properties')
      .select('id')
      .eq('user_id', user.id)

    if (properties?.length > 0) {
      const propIds = properties.map(p => p.id)

      // Delete billing period children
      const { data: periods } = await adminSupabase
        .from('billing_periods')
        .select('id')
        .in('property_id', propIds)

      if (periods?.length > 0) {
        const periodIds = periods.map(p => p.id)
        await adminSupabase.from('invoices').delete().in('billing_period_id', periodIds)
        await adminSupabase.from('tenant_charges').delete().in('billing_period_id', periodIds)
        await adminSupabase.from('utility_bills').delete().in('billing_period_id', periodIds)
        await adminSupabase.from('billing_periods').delete().in('id', periodIds)
      }

      // Delete units then properties
      await adminSupabase.from('units').delete().in('property_id', propIds)
      await adminSupabase.from('properties').delete().eq('user_id', user.id)
    }

    // 3. Delete profile
    await adminSupabase.from('profiles').delete().eq('id', user.id)

    // 4. Delete auth user
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(user.id)
    if (authError) {
      console.error('Auth deletion error:', authError.message)
      return Response.json({ error: 'Account data deleted but auth removal failed. Contact support.' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Delete account error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}