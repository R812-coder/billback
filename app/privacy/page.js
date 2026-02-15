'use client'

export default function Privacy() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#faf9f7', minHeight: '100vh' }}>
      <nav style={{ maxWidth: 800, margin: '0 auto', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>BillBack</a>
        <a href="/" style={{ fontSize: 14, color: '#6b7280' }}>← Back to home</a>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px 80px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
        <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 32 }}>Last updated: February 15, 2026</p>

        <div style={{ fontSize: 14, lineHeight: 1.8, color: '#4b5563' }}>
          <p>BillBack ("we", "our", "us") operates the website at bizstackguide.com and the BillBack web application. This Privacy Policy explains how we collect, use, and protect your information when you use our services.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Information We Collect</h2>

          <p><strong>Account Information:</strong> When you create an account, we collect your email address, name, and optionally your company name and phone number.</p>

          <p><strong>Property & Tenant Data:</strong> You may enter property addresses, unit details, tenant names, tenant email addresses, and utility billing information. This data is stored securely and used solely to provide the billing services you request.</p>

          <p><strong>Payment Information:</strong> Payment processing is handled by Stripe, Inc. We do not store credit card numbers, bank account details, or other sensitive financial data on our servers. Stripe's privacy policy governs the collection and use of your payment information. See <a href="https://stripe.com/privacy" style={{ color: '#3b5998' }}>stripe.com/privacy</a>.</p>

          <p><strong>Usage Data:</strong> We may collect basic usage information such as pages visited, features used, and error logs to improve our service.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>How We Use Your Information</h2>

          <p>We use the information we collect to provide, maintain, and improve BillBack's services, including calculating utility allocations, generating invoices, sending email invoices to tenants on your behalf, processing payments for your subscription, and communicating with you about your account or service updates.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Tenant Email Communications</h2>

          <p>When you use BillBack to email invoices to tenants, those emails are sent on your behalf through our email service provider (Resend). We only send emails to tenant addresses that you have entered into the system. We do not independently contact your tenants for marketing or other purposes.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Data Storage & Security</h2>

          <p>Your data is stored in cloud infrastructure provided by Supabase (hosted on AWS). We use industry-standard security measures including encrypted connections (HTTPS/TLS), authenticated API access, and row-level database security policies. Access to your data is restricted to your authenticated account.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Data Sharing</h2>

          <p>We do not sell, rent, or share your personal information or tenant data with third parties for marketing purposes. We share information only with service providers necessary to operate BillBack (Stripe for payments, Supabase for data hosting, Resend for email delivery, and Vercel for web hosting), and when required to comply with legal obligations.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Data Retention & Deletion</h2>

          <p>Your data is retained as long as your account is active. You can delete your account at any time through Settings, which permanently removes all your properties, units, tenant data, billing history, invoices, and personal information. Upon account deletion, we also cancel any active subscription and remove your data from our systems.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Cookies</h2>

          <p>BillBack uses essential cookies for authentication (keeping you logged in) and session management. We do not use advertising cookies or third-party tracking cookies.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Your Rights</h2>

          <p>You have the right to access, correct, or delete your personal information at any time. You can update your account details in Settings or delete your account entirely. For any data requests, contact us at <a href="mailto:support@bizstackguide.com" style={{ color: '#3b5998' }}>support@bizstackguide.com</a>.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Changes to This Policy</h2>

          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a notice on our website. Your continued use of BillBack after changes constitutes acceptance of the updated policy.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Contact</h2>

          <p>If you have questions about this Privacy Policy or your data, contact us at <a href="mailto:support@bizstackguide.com" style={{ color: '#3b5998' }}>support@bizstackguide.com</a>.</p>
        </div>
      </div>
    </div>
  )
}