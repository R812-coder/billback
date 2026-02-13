// ============================================
// BillBack Email System
// Uses Resend (resend.com) for transactional email
// ============================================

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_DOMAIN = process.env.RESEND_DOMAIN || 'updates.billback.app'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://billback.app'

/**
 * Send an email via Resend API
 * @param {Object} params - { to, subject, html, from, replyTo }
 */
export async function sendEmail({ to, subject, html, from, replyTo }) {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping email send')
    return { success: false, error: 'Email not configured' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: from || `BillBack <noreply@${RESEND_DOMAIN}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo || undefined,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[Email] Send failed:', err)
    return { success: false, error: err.message || 'Email send failed' }
  }

  const data = await res.json()
  return { success: true, id: data.id }
}

// ─── Email Wrapper (standard BillBack look) ───
function wrap(content) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f4f3f1; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f4f3f1;">
    <tr><td align="center" style="padding: 40px 20px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
        <!-- Logo -->
        <tr><td style="padding-bottom: 24px;">
          <a href="${SITE_URL}" style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 700; color: #1a1a2e; text-decoration: none;">BillBack</a>
        </td></tr>
        <!-- Content Card -->
        <tr><td style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding: 24px 0; text-align: center;">
          <p style="font-size: 11px; color: #9ca3af; margin: 0;">
            BillBack — Utility billing for landlords and property managers<br>
            <a href="${SITE_URL}" style="color: #9ca3af;">billback.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// ─── TEMPLATES ───

/**
 * Welcome email — sent after signup
 */
export function welcomeEmail(userName) {
  const firstName = (userName || 'there').split(' ')[0]
  return {
    subject: 'Welcome to BillBack — let\'s get your first property set up',
    html: wrap(`
      <div style="padding: 32px;">
        <h1 style="font-size: 22px; color: #1a1a2e; margin: 0 0 16px;">Welcome aboard, ${firstName}</h1>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
          You're all set up with a <strong>14-day free trial</strong> that includes full access to all features. Here's how to get started in under 5 minutes:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #f0eeeb;">
            <table role="presentation"><tr>
              <td style="width: 28px; height: 28px; background: #1a1a2e; border-radius: 6px; text-align: center; vertical-align: middle; color: white; font-size: 12px; font-weight: 700;">1</td>
              <td style="padding-left: 12px; font-size: 14px; color: #1f2937;"><strong>Add your property</strong> — name, address, and unit details</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #f0eeeb;">
            <table role="presentation"><tr>
              <td style="width: 28px; height: 28px; background: #1a1a2e; border-radius: 6px; text-align: center; vertical-align: middle; color: white; font-size: 12px; font-weight: 700;">2</td>
              <td style="padding-left: 12px; font-size: 14px; color: #1f2937;"><strong>Enter your utility bills</strong> — electric, water, gas, etc.</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding: 12px 0;">
            <table role="presentation"><tr>
              <td style="width: 28px; height: 28px; background: #1a1a2e; border-radius: 6px; text-align: center; vertical-align: middle; color: white; font-size: 12px; font-weight: 700;">3</td>
              <td style="padding-left: 12px; font-size: 14px; color: #1f2937;"><strong>Generate invoices</strong> — BillBack calculates each tenant's share automatically</td>
            </tr></table>
          </td></tr>
        </table>

        <div style="text-align: center; margin: 28px 0 8px;">
          <a href="${SITE_URL}/properties" style="display: inline-block; padding: 12px 28px; background: #1a1a2e; color: white; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">Add Your First Property</a>
        </div>

        <p style="font-size: 13px; color: #6b7280; margin: 20px 0 0; line-height: 1.5;">
          Questions? Just reply to this email — a real person reads every message.
        </p>
      </div>
    `),
  }
}

/**
 * Trial expiring soon (3 days left)
 */
export function trialExpiringSoonEmail(userName, daysLeft) {
  const firstName = (userName || 'there').split(' ')[0]
  return {
    subject: `Your BillBack trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    html: wrap(`
      <div style="background: #fffbeb; padding: 16px 32px; border-bottom: 1px solid #fde68a;">
        <p style="font-size: 13px; color: #92400e; margin: 0; font-weight: 600;">
          Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
        </p>
      </div>
      <div style="padding: 32px;">
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 16px;">Don't lose your billing data, ${firstName}</h1>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
          Your 14-day trial is almost up. Upgrade now to keep your properties, billing history, and invoices — plans start at just $29/month.
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
          If you're not ready to upgrade, no worries — your data stays safe on the Free plan (limited to 1 property, 5 units).
        </p>
        <div style="text-align: center; margin-bottom: 8px;">
          <a href="${SITE_URL}/pricing" style="display: inline-block; padding: 12px 28px; background: #e8a635; color: #1a1a2e; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none;">View Plans & Upgrade</a>
        </div>
      </div>
    `),
  }
}

/**
 * Trial expired
 */
export function trialExpiredEmail(userName) {
  const firstName = (userName || 'there').split(' ')[0]
  return {
    subject: 'Your BillBack trial has ended',
    html: wrap(`
      <div style="padding: 32px;">
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 16px;">Your trial has ended, ${firstName}</h1>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 16px;">
          Your free trial has expired. You're now on the Free plan, which includes 1 property and up to 5 units.
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
          To unlock PDF invoices, email billing, payment tracking, and more — upgrade to Starter ($29/mo) or Pro ($69/mo). All your data from the trial is saved and waiting.
        </p>
        <div style="text-align: center; margin-bottom: 8px;">
          <a href="${SITE_URL}/pricing" style="display: inline-block; padding: 12px 28px; background: #1a1a2e; color: white; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">Upgrade Now</a>
        </div>
      </div>
    `),
  }
}

/**
 * Payment receipt (subscription payment successful)
 */
export function paymentReceiptEmail(userName, planName, amount, nextBillingDate) {
  return {
    subject: `BillBack payment receipt — ${planName} plan`,
    html: wrap(`
      <div style="padding: 32px;">
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 16px;">Payment received</h1>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
          Thanks for your payment. Here's your receipt:
        </p>
        <div style="background: #f8f7f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #6b7280;">Plan</td><td style="text-align: right; font-weight: 600;">${planName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Amount</td><td style="text-align: right; font-weight: 600; font-family: monospace;">${amount}</td></tr>
            ${nextBillingDate ? `<tr><td style="padding: 6px 0; color: #6b7280;">Next billing</td><td style="text-align: right;">${nextBillingDate}</td></tr>` : ''}
          </table>
        </div>
        <p style="font-size: 13px; color: #6b7280; margin: 0;">
          Manage your subscription anytime from <a href="${SITE_URL}/billing" style="color: #3b5998;">your dashboard</a>.
        </p>
      </div>
    `),
  }
}

/**
 * Subscription cancelled
 */
export function subscriptionCancelledEmail(userName, endDate) {
  const firstName = (userName || 'there').split(' ')[0]
  return {
    subject: 'Your BillBack subscription has been cancelled',
    html: wrap(`
      <div style="padding: 32px;">
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 16px;">We're sorry to see you go, ${firstName}</h1>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 16px;">
          Your subscription has been cancelled. You'll continue to have access to your current plan until <strong>${endDate}</strong>, then your account will revert to the Free plan.
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
          Your data won't be deleted — you can upgrade again anytime to pick up where you left off.
        </p>
        <p style="font-size: 13px; color: #6b7280; margin: 0;">
          Changed your mind? <a href="${SITE_URL}/pricing" style="color: #3b5998;">Resubscribe here</a>.
        </p>
      </div>
    `),
  }
}

/**
 * Invoice email to tenant (used by /api/invoices/email)
 */
export function tenantInvoiceEmail({ tenantName, invoiceNumber, amount, dueDate, unitNumber, propertyName, periodStart, periodEnd, fromName }) {
  const firstName = (tenantName || 'Tenant').split(' ')[0]
  return {
    subject: `Utility Invoice ${invoiceNumber} — ${amount} due`,
    html: wrap(`
      <div style="background: #1a1a2e; color: white; padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 600;">Utility Invoice</h1>
        <p style="margin: 4px 0 0; opacity: 0.6; font-size: 14px;">${propertyName || ''}</p>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
          Hi ${firstName}, your utility bill for <strong>${periodStart || ''} — ${periodEnd || ''}</strong> is ready.
        </p>

        <div style="background: #f8f7f6; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
          <div style="font-size: 11px; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 4px;">AMOUNT DUE</div>
          <div style="font-size: 32px; font-weight: 700; color: #1a1a2e; font-family: 'DM Mono', monospace;">${amount}</div>
          ${dueDate ? `<div style="font-size: 13px; color: #6b7280; margin-top: 6px;">Due by ${dueDate}</div>` : ''}
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; margin-bottom: 24px;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Invoice #</td><td style="text-align: right; font-family: monospace;">${invoiceNumber}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Unit</td><td style="text-align: right;">${unitNumber || ''}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Property</td><td style="text-align: right;">${propertyName || ''}</td></tr>
        </table>

        <p style="font-size: 13px; color: #6b7280;">
          Please contact your property manager if you have questions about this bill.
        </p>
      </div>
    `),
  }
}

/**
 * Payment overdue reminder to tenant
 */
export function tenantOverdueEmail({ tenantName, invoiceNumber, amount, dueDate, propertyName }) {
  return {
    subject: `Payment overdue — Invoice ${invoiceNumber}`,
    html: wrap(`
      <div style="background: #dc2626; color: white; padding: 20px 32px;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Payment Overdue</h1>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
          Hi ${(tenantName || 'Tenant').split(' ')[0]}, this is a reminder that your utility payment of <strong>${amount}</strong> for ${propertyName || 'your unit'} was due on <strong>${dueDate}</strong>.
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
          Please arrange payment at your earliest convenience. If you've already paid, please disregard this notice.
        </p>
        <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
            <tr><td style="color: #6b7280;">Invoice</td><td style="text-align: right; font-family: monospace;">${invoiceNumber}</td></tr>
            <tr><td style="color: #6b7280; padding-top: 4px;">Amount</td><td style="text-align: right; font-weight: 700; color: #dc2626; font-family: monospace;">${amount}</td></tr>
          </table>
        </div>
        <p style="font-size: 13px; color: #6b7280;">
          Contact your property manager with any questions.
        </p>
      </div>
    `),
  }
}