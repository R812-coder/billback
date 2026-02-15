export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/properties/', '/billing/', '/invoices/', '/payments/', '/cam-reconciliation/', '/settings/', '/feedback/'],
      },
    ],
    sitemap: 'https://www.bizstackguide.com/sitemap.xml',
  }
}