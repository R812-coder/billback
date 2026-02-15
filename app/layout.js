import './globals.css'

export const metadata = {
  title: {
    default: 'BillBack — Utility Bill-Back Calculator for Landlords',
    template: '%s | BillBack',
  },
  description: 'Calculate and bill tenants for their share of utility costs. RUBS calculator, invoice generation, payment tracking, and CAM reconciliation for landlords and property managers.',
  keywords: 'RUBS calculator, utility bill-back, tenant utility billing, landlord software, property management utilities, CAM reconciliation',
  icons: {
    icon: '/favicon.svg',
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