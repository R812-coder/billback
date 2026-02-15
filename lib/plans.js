// ============================================
// Plan Configuration
// Defines what each tier can do
// ============================================

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceLabel: 'Free forever',
    description: 'For landlords just getting started',
    stripe_price_id: null,
    limits: {
      properties: 1,
      units_per_property: 5,
      billing_history_months: 3, // can only see last 3 months
      pdf_invoices: false,
      email_invoices: false,
      payment_tracking: false,
      cam_reconciliation: false,
      export_csv: false,
      custom_branding: false,
    },
    features: [
      '1 property, up to 5 units',
      'Monthly utility calculations',
      '3 months billing history',
      'Free RUBS calculator',
    ],
  },
  starter: {
    name: 'Starter',
    price: 29,
    priceLabel: '$29/mo',
    description: 'For small landlords with residential properties',
    stripe_price_id: null, // Set after creating Stripe products
    limits: {
      properties: 5,
      units_per_property: 25,
      billing_history_months: 24,
      pdf_invoices: true,
      email_invoices: true,
      payment_tracking: true,
      cam_reconciliation: false,
      export_csv: true,
      custom_branding: false,
    },
    features: [
      'Up to 5 properties, 25 units each',
      'PDF invoice generation',
      'Email invoices to tenants',
      'Payment tracking',
      '2 years billing history',
      'CSV export',
    ],
    popular: true,
  },
  pro: {
    name: 'Pro',
    price: 69,
    priceLabel: '$69/mo',
    description: 'For property managers with commercial buildings',
    stripe_price_id: null,
    limits: {
      properties: 50,
      units_per_property: 100,
      billing_history_months: -1, // unlimited
      pdf_invoices: true,
      email_invoices: true,
      payment_tracking: true,
      cam_reconciliation: true,
      export_csv: true,
      custom_branding: true,
    },
    features: [
      'Up to 50 properties, 100 units each',
      'Everything in Starter',
      'CAM reconciliation (commercial)',
      'Custom branding on invoices',
      'Unlimited billing history',
      'Priority support',
    ],
  },
}

/**
 * Get effective plan, respecting subscription_ends_at
 * This is the safety net — if subscription_ends_at has passed,
 * treat user as free even if plan field hasn't been updated yet
 */
export function getEffectivePlan(profile) {
  if (!profile) return 'free'
  const plan = profile.plan || 'free'
  if (plan === 'free') return 'free'

  // If subscription_ends_at exists and is in the past, treat as free
  if (profile.subscription_ends_at) {
    const endsAt = new Date(profile.subscription_ends_at)
    if (endsAt < new Date()) return 'free'
  }

  return plan
}

/**
 * Check if user's plan allows a specific feature
 */
export function canAccess(plan, feature) {
  const config = PLANS[plan] || PLANS.free
  return !!config.limits[feature]
}

/**
 * Check if user has reached a limit
 */
export function isAtLimit(plan, limitKey, currentCount) {
  const config = PLANS[plan] || PLANS.free
  const limit = config.limits[limitKey]
  if (limit === -1) return false // unlimited
  return currentCount >= limit
}

/**
 * Get the limit value for a plan
 */
export function getLimit(plan, limitKey) {
  const config = PLANS[plan] || PLANS.free
  return config.limits[limitKey]
}