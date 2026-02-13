export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://billback.app'
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/properties', '/billing', '/invoices', '/payments', '/cam-reconciliation', '/api/'] },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
