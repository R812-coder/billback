import './globals.css'

export const metadata = {
  metadataBase: new URL('https://www.bizstackguide.com'),
  title: {
    default: 'BillBack — Free RUBS Calculator & Utility Bill-Back Platform for Landlords',
    template: '%s | BillBack',
  },
  description: 'Free RUBS calculator for landlords. Calculate each tenant\'s share of utility costs, generate professional invoices, email them to tenants, and track payments. No signup required.',
  keywords: 'RUBS calculator, free RUBS calculator, utility bill-back, tenant utility billing, landlord utility billing software, ratio utility billing system, RUBS billing, property management utilities, CAM reconciliation',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'BillBack — Free RUBS Calculator for Landlords',
    description: 'Calculate each tenant\'s share of utility costs instantly. Free RUBS calculator, invoice generation, and payment tracking for landlords.',
    url: 'https://www.bizstackguide.com',
    siteName: 'BillBack',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'BillBack — Free RUBS Calculator for Landlords',
    description: 'Calculate each tenant\'s share of utility costs instantly. Free RUBS calculator for landlords and property managers.',
  },
  alternates: {
    canonical: 'https://www.bizstackguide.com',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
        {children}
      </body>
    </html>
  )
}