// ============================================
// RUBS Calculation Engine
// Used by both the free calculator and the paid billing workflow
// ============================================

export const UTILITY_TYPES = [
  { key: 'electric', label: 'Electricity', icon: '' },
  { key: 'water', label: 'Water / Sewer', icon: '' },
  { key: 'gas', label: 'Gas', icon: '' },
  { key: 'trash', label: 'Trash', icon: '' },
  { key: 'sewer', label: 'Sewer', icon: '' },
  { key: 'other', label: 'Other', icon: '' },
]

export const ALLOCATION_METHODS = {
  sqft: { label: 'Square Footage', description: 'Larger units pay proportionally more' },
  occupancy: { label: 'Occupancy', description: 'More residents = higher share' },
  weighted: { label: 'Weighted Blend', description: 'Custom mix of sq ft + occupancy' },
  bedroom: { label: 'Bedroom Count', description: 'Based on number of bedrooms' },
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'other', label: 'Other' },
]

/**
 * Calculate each unit's share of utility costs
 */
export function calculateRUBS(units, bills, method = 'sqft', sqftWeight = 70) {
  const occupied = units.filter(u => !u.is_vacant)
  if (occupied.length === 0) return units.map(u => ({ ...u, share: 0, amounts: {}, total: 0 }))

  const totalSqft = occupied.reduce((s, u) => s + (parseFloat(u.sqft) || 0), 0)
  const totalOcc = occupied.reduce((s, u) => s + (parseInt(u.occupants) || 0), 0)
  const totalBed = occupied.reduce((s, u) => s + (parseInt(u.bedrooms) || 0), 0)

  return units.map(unit => {
    if (unit.is_vacant) {
      return { ...unit, share: 0, amounts: {}, total: 0 }
    }

    let share = 0
    const sqft = parseFloat(unit.sqft) || 0
    const occ = parseInt(unit.occupants) || 0
    const bed = parseInt(unit.bedrooms) || 0

    switch (method) {
      case 'sqft':
        share = totalSqft > 0 ? sqft / totalSqft : 0
        break
      case 'occupancy':
        share = totalOcc > 0 ? occ / totalOcc : 0
        break
      case 'bedroom':
        share = totalBed > 0 ? bed / totalBed : 0
        break
      case 'weighted':
        const sw = sqftWeight / 100
        const ow = 1 - sw
        const sqftShare = totalSqft > 0 ? sqft / totalSqft : 0
        const occShare = totalOcc > 0 ? occ / totalOcc : 0
        share = (sw * sqftShare) + (ow * occShare)
        break
    }

    const amounts = {}
    let total = 0
    for (const ut of UTILITY_TYPES) {
      const billAmt = parseFloat(bills[ut.key]) || 0
      const unitAmt = Math.round(billAmt * share * 100) / 100
      amounts[ut.key] = unitAmt
      total += unitAmt
    }
    total = Math.round(total * 100) / 100

    return { ...unit, share, amounts, total }
  })
}

/**
 * Calculate CAM reconciliation for a property
 */
export function calculateCAMReconciliation(budgetItems, units, tenantEstimates) {
  const totalBudgeted = budgetItems.reduce((s, i) => s + (parseFloat(i.budgeted_amount) || 0), 0)
  const totalActual = budgetItems.reduce((s, i) => s + (parseFloat(i.actual_amount) || 0), 0)
  const occupied = units.filter(u => !u.is_vacant)
  const totalSqft = occupied.reduce((s, u) => s + (parseFloat(u.sqft) || 0), 0)

  const reconciliation = occupied.map(unit => {
    const sqft = parseFloat(unit.sqft) || 0
    const proRataShare = totalSqft > 0 ? sqft / totalSqft : 0
    const actualShare = totalActual * proRataShare
    const estimate = tenantEstimates.find(e => e.unit_id === unit.id)
    const totalPaid = estimate ? parseFloat(estimate.total_paid) || 0 : 0
    const amountOwed = Math.round((actualShare - totalPaid) * 100) / 100

    return {
      ...unit,
      pro_rata_share: proRataShare,
      budgeted_share: totalBudgeted * proRataShare,
      actual_share: actualShare,
      total_paid: totalPaid,
      reconciliation_amount: amountOwed,
    }
  })

  return {
    total_budgeted: totalBudgeted,
    total_actual: totalActual,
    variance: totalActual - totalBudgeted,
    variance_pct: totalBudgeted > 0 ? ((totalActual - totalBudgeted) / totalBudgeted) * 100 : 0,
    by_category: budgetItems.map(item => ({
      ...item,
      variance: (parseFloat(item.actual_amount) || 0) - (parseFloat(item.budgeted_amount) || 0),
    })),
    tenants: reconciliation,
    total_owed: reconciliation.reduce((s, r) => s + Math.max(0, r.reconciliation_amount), 0),
    total_credits: Math.abs(reconciliation.reduce((s, r) => s + Math.min(0, r.reconciliation_amount), 0)),
  }
}

export function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
}

export function formatPct(n) {
  return ((n || 0) * 100).toFixed(1) + '%'
}

/**
 * Generate invoice number from property name, date, and unit
 * FIX: Parse date string directly to avoid timezone issues
 * "2025-01-01" with new Date() in EST = Dec 31 2024 → wrong month/year
 */
export function generateInvoiceNumber(propertyName, periodDate, unitNumber) {
  const prefix = (propertyName || 'INV').replace(/\s+/g, '').substring(0, 3).toUpperCase()

  // Parse YYYY-MM-DD string directly — never use new Date() for date-only strings
  const parts = (periodDate || '').split('-')
  let year = '00'
  let month = '01'
  if (parts.length >= 2) {
    year = parts[0].slice(-2)   // "2025" → "25"
    month = parts[1].padStart(2, '0')  // "1" → "01"
  }

  const unit = (unitNumber || '0').replace(/\s+/g, '').toUpperCase()
  return `${prefix}-${year}${month}-${unit}`
}