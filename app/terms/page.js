'use client'

export default function Terms() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#faf9f7', minHeight: '100vh' }}>
      <nav style={{ maxWidth: 800, margin: '0 auto', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>BillBack</a>
        <a href="/" style={{ fontSize: 14, color: '#6b7280' }}>← Back to home</a>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px 80px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, marginBottom: 4 }}>Terms of Service</h1>
        <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 32 }}>Last updated: February 15, 2026</p>

        <div style={{ fontSize: 14, lineHeight: 1.8, color: '#4b5563' }}>
          <p>These Terms of Service ("Terms") govern your use of BillBack, a web application operated at bizstackguide.com. By creating an account or using our services, you agree to these Terms.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Service Description</h2>

          <p>BillBack is a utility bill-back platform that helps landlords and property managers calculate tenant utility shares using the RUBS (Ratio Utility Billing System) method, generate invoices, and track payments. BillBack is a calculation and billing tool — it does not provide legal, tax, or financial advice.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Account Responsibilities</h2>

          <p>You are responsible for maintaining the security of your account credentials. You are responsible for all activity under your account. You must provide accurate information when creating your account and entering property, unit, and tenant data. You must not use BillBack for any unlawful purpose or in violation of local landlord-tenant laws.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Subscription & Billing</h2>

          <p>BillBack offers a free plan and paid subscription plans. Paid plans are billed monthly through Stripe. You can cancel your subscription at any time through your Settings page. When you cancel, your paid features remain active until the end of your current billing period, after which your account reverts to the Free plan. No refunds are provided for partial billing periods.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Your Data</h2>

          <p>You retain ownership of all data you enter into BillBack, including property information, tenant details, and billing records. We do not claim any intellectual property rights over your data. You can export or delete your data at any time. See our <a href="/privacy" style={{ color: '#3b5998' }}>Privacy Policy</a> for details on how we handle your data.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>RUBS Compliance Disclaimer</h2>

          <p>RUBS legality and requirements vary by state, county, and municipality. BillBack provides mathematical calculations based on the inputs you provide. It is your responsibility to ensure that your use of RUBS billing complies with all applicable local, state, and federal laws and regulations. BillBack does not guarantee the legality of RUBS billing in your jurisdiction, does not verify compliance with local ordinances, and does not constitute legal advice. We strongly recommend consulting with a qualified attorney before implementing RUBS billing.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Limitation of Liability</h2>

          <p>BillBack is provided "as is" without warranties of any kind. We are not liable for any errors in utility calculations resulting from incorrect data input, financial losses arising from billing disputes with tenants, interruptions in service availability, or any indirect, incidental, or consequential damages. Our total liability shall not exceed the amount you paid us in the twelve months preceding the claim.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Termination</h2>

          <p>You may delete your account at any time through Settings. We reserve the right to suspend or terminate accounts that violate these Terms, are used for fraudulent purposes, or cause harm to other users or our infrastructure. Upon termination, your data will be permanently deleted in accordance with our Privacy Policy.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Changes to Terms</h2>

          <p>We may update these Terms from time to time. We will notify you of material changes by email or through a notice on our website. Continued use of BillBack after changes constitutes acceptance of the updated Terms.</p>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 32, marginBottom: 8 }}>Contact</h2>

          <p>For questions about these Terms, contact us at <a href="mailto:support@bizstackguide.com" style={{ color: '#3b5998' }}>support@bizstackguide.com</a>.</p>
        </div>
      </div>
    </div>
  )
}