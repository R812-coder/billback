'use client'

function renderInline(text) {
  const parts = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Find the earliest match of bold or link
    let earliestType = null
    let earliestIndex = Infinity
    let earliestMatch = null

    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    if (boldMatch) {
      const idx = remaining.indexOf(boldMatch[0])
      if (idx < earliestIndex) {
        earliestType = 'bold'
        earliestIndex = idx
        earliestMatch = boldMatch
      }
    }

    // Link [text](url)
    const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/)
    if (linkMatch) {
      const idx = remaining.indexOf(linkMatch[0])
      if (idx < earliestIndex) {
        earliestType = 'link'
        earliestIndex = idx
        earliestMatch = linkMatch
      }
    }

    if (!earliestType) {
      parts.push(<span key={key++}>{remaining}</span>)
      break
    }

    // Text before match
    if (earliestIndex > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, earliestIndex)}</span>)
    }

    if (earliestType === 'bold') {
      parts.push(<strong key={key++} style={{ color: '#1f2937', fontWeight: 600 }}>{earliestMatch[1]}</strong>)
      remaining = remaining.slice(earliestIndex + earliestMatch[0].length)
    } else if (earliestType === 'link') {
      parts.push(
        <a key={key++} href={earliestMatch[2]} style={{ color: '#3b5998', fontWeight: 500, textDecoration: 'underline', textDecorationColor: 'rgba(59,89,152,0.3)', textUnderlineOffset: 2 }}>
          {earliestMatch[1]}
        </a>
      )
      remaining = remaining.slice(earliestIndex + earliestMatch[0].length)
    }
  }

  return parts
}

function renderContent(content) {
  // Normalize: trim each line's leading indentation from template literals
  const rawLines = content.split('\n')
  const lines = rawLines.map(l => l.replace(/^    /, '').replace(/^  /, ''))

  const elements = []
  let i = 0
  let elemKey = 0

  while (i < lines.length) {
    const line = lines[i].trimEnd()

    // Skip empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Horizontal rule
    if (line.trim() === '---') {
      elements.push(
        <hr key={elemKey++} style={{ border: 'none', borderTop: '1px solid #e5e2de', margin: '32px 0' }} />
      )
      i++
      continue
    }

    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={elemKey++} style={{
          fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700,
          color: '#1a1a2e', marginTop: 40, marginBottom: 12, lineHeight: 1.3,
        }}>
          {line.slice(3).trim()}
        </h2>
      )
      i++
      continue
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={elemKey++} style={{
          fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600,
          color: '#1f2937', marginTop: 32, marginBottom: 8, lineHeight: 1.3,
        }}>
          {line.slice(4).trim()}
        </h3>
      )
      i++
      continue
    }

    // Unordered list (- item)
    if (line.startsWith('- ')) {
      const listItems = []
      while (i < lines.length) {
        const li = lines[i].trimEnd()
        if (!li.startsWith('- ')) break
        listItems.push(li.slice(2))
        i++
      }
      elements.push(
        <ul key={elemKey++} style={{
          margin: '14px 0', paddingLeft: 0, listStyle: 'none',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {listItems.map((item, j) => (
            <li key={j} style={{
              fontSize: 15, lineHeight: 1.75, color: '#4b5563',
              paddingLeft: 20, position: 'relative',
            }}>
              <span style={{
                position: 'absolute', left: 0, top: 10,
                width: 6, height: 6, borderRadius: '50%',
                background: '#d1d5db',
              }} />
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Regular paragraph — collect consecutive non-empty, non-special lines
    const paraLines = []
    while (i < lines.length) {
      const pl = lines[i].trimEnd()
      if (pl.trim() === '' || pl.startsWith('## ') || pl.startsWith('### ') || pl.startsWith('- ') || pl.trim() === '---') break
      paraLines.push(pl)
      i++
    }

    if (paraLines.length > 0) {
      elements.push(
        <p key={elemKey++} style={{
          fontSize: 15, lineHeight: 1.8, color: '#4b5563',
          marginTop: 0, marginBottom: 16,
        }}>
          {renderInline(paraLines.join(' '))}
        </p>
      )
    }
  }

  return elements
}

export default function BlogPostClient({ post, relatedPosts }) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'BillBack' },
    publisher: { '@type': 'Organization', name: 'BillBack', url: 'https://www.bizstackguide.com' },
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#faf9f7', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      {/* Nav */}
      <nav style={{ maxWidth: 800, margin: '0 auto', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>BillBack</a>
        <div style={{ display: 'flex', gap: 25, alignItems: 'center' }}>
          <a href="/blog" style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Blog</a>
          <a href="/pricing" style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Pricing</a>
          <a href="/signup" style={{ fontSize: 14, padding: '8px 18px', background: '#1a1a2e', color: 'white', borderRadius: 8, fontWeight: 600 }}>Get Started Free</a>
        </div>
      </nav>

      {/* Article */}
      <article style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 48px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>
          <a href="/" style={{ color: '#9ca3af' }}>Home</a>
          <span style={{ margin: '0 8px' }}>›</span>
          <a href="/blog" style={{ color: '#9ca3af' }}>Blog</a>
          <span style={{ margin: '0 8px' }}>›</span>
          <span style={{ color: '#6b7280' }}>{post.category}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32, paddingBottom: 28, borderBottom: '1px solid #e5e2de' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, background: '#f0f4ff', color: '#3b5998', padding: '3px 10px', borderRadius: 4, letterSpacing: '0.02em' }}>{post.category}</span>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>{post.readTime}</span>
            <span style={{ fontSize: 13, color: '#d1d5db' }}>·</span>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(28px, 4.5vw, 38px)',
            fontWeight: 700, lineHeight: 1.2,
            marginBottom: 14, color: '#1a1a2e',
          }}>
            {post.title}
          </h1>

          <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
            {post.description}
          </p>
        </div>

        {/* Content */}
        <div>{renderContent(post.content)}</div>

        {/* CTA */}
        <div style={{
          marginTop: 48, padding: '32px', borderRadius: 12,
          background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
          color: 'white', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 80% 20%, rgba(232,166,53,0.1) 0%, transparent 50%)' }} />
          <div style={{ position: 'relative' }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Automate Your Utility Billing</h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 20, lineHeight: 1.6 }}>BillBack calculates tenant shares, generates professional invoices, and emails them to tenants — all in one place.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/#calculator" style={{ padding: '12px 24px', background: '#e8a635', color: '#1a1a2e', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>Try Free Calculator</a>
              <a href="/signup" style={{ padding: '12px 24px', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 8, fontWeight: 600, fontSize: 14, color: 'white' }}>Create Free Account</a>
            </div>
          </div>
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>Read Next</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {relatedPosts.map(rp => (
                <a key={rp.slug} href={`/blog/${rp.slug}`} style={{
                  display: 'block', padding: '18px 22px', background: 'white',
                  border: '1px solid #e5e2de', borderRadius: 10, textDecoration: 'none',
                  transition: 'box-shadow 0.15s',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#3b5998', marginBottom: 6 }}>{rp.category} · {rp.readTime}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.4 }}>{rp.title}</div>
                </a>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Footer */}
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