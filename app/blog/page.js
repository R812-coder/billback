'use client'

import { getAllPosts } from '@/lib/blog-posts'

export default function Blog() {
  const posts = getAllPosts()

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#faf9f7', minHeight: '100vh' }}>
      <nav style={{ maxWidth: 800, margin: '0 auto', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>BillBack</a>
        <div style={{ display: 'flex', gap: 25, alignItems: 'center' }}>
          <a href="/pricing" style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Pricing</a>
          <a href="/login" style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Sign In</a>
          <a href="/signup" style={{ fontSize: 14, padding: '8px 18px', background: '#1a1a2e', color: 'white', borderRadius: 8, fontWeight: 600 }}>Get Started Free</a>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, marginBottom: 4 }}>Landlord Utility Billing Guide</h1>
        <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 40 }}>Practical guides on RUBS billing, tenant invoicing, and utility cost recovery for landlords and property managers.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {posts.map(post => (
            <a key={post.slug} href={`/blog/${post.slug}`} style={{ display: 'block', background: 'white', borderRadius: 12, border: '1px solid #e5e2de', padding: '24px 28px', transition: 'box-shadow 0.15s', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: '#f0f4ff', color: '#3b5998', padding: '2px 8px', borderRadius: 4 }}>{post.category}</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{post.readTime}</span>
              </div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, marginBottom: 6, color: '#1a1a2e' }}>{post.title}</h2>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{post.description}</p>
            </a>
          ))}
        </div>

        {/* Internal linking CTA */}
        <div style={{ marginTop: 48, padding: '28px', background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', borderRadius: 12, color: 'white', textAlign: 'center' }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Try the Free RUBS Calculator</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>Calculate each tenant's utility share instantly — no signup required.</p>
          <a href="/#calculator" style={{ display: 'inline-block', padding: '12px 28px', background: '#e8a635', color: '#1a1a2e', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>Open Calculator →</a>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e5e2de', padding: '24px 20px 40px', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
        <div style={{ marginBottom: 8 }}>
          <a href="/pricing" style={{ marginRight: 16 }}>Pricing</a>
          <a href="/blog" style={{ marginRight: 16 }}>Blog</a>
          <a href="/privacy" style={{ marginRight: 16 }}>Privacy</a>
          <a href="/terms" style={{ marginRight: 16 }}>Terms</a>
          <a href="/login">Sign In</a>
        </div>
        <p>BillBack — Utility Bill-Back Platform for Landlords & Property Managers</p>
      </div>
    </div>
  )
}