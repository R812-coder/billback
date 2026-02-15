'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useToast } from '@/app/components/Toast'

const TYPES = [
  { key: 'bug', label: 'Bug Report', desc: 'Something isn\'t working right' },
  { key: 'feature', label: 'Feature Request', desc: 'Suggest an improvement' },
  { key: 'question', label: 'Question', desc: 'Need help with something' },
  { key: 'other', label: 'Other', desc: 'General feedback' },
]

export default function Feedback() {
  const [type, setType] = useState('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()
  const toast = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id,
      email: user?.email,
      type,
      message: message.trim(),
      page_url: window.location.href,
    })

    setSending(false)
    if (error) {
      toast?.error('Failed to send feedback. Please try again.')
      return
    }
    setSent(true)
    toast?.success('Feedback sent! Thank you.')
  }

  if (sent) {
    return (
      <div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Thank you!</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Your feedback has been received. We'll review it shortly.</p>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Feedback received</h3>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>We read every submission and use it to improve BillBack.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => { setSent(false); setMessage(''); }}>Send More Feedback</button>
              <a href="/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Back to Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Feedback & Support</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Report bugs, request features, or ask a question</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Type selector */}
          <div>
            <label className="label">What type of feedback?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 4 }}>
              {TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  style={{
                    padding: '12px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    background: type === t.key ? '#f0f4ff' : '#f8f7f6',
                    border: type === t.key ? '1.5px solid #3b5998' : '1.5px solid #e5e2de',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="label">
              {type === 'bug' ? 'Describe the bug — what happened and what you expected' :
               type === 'feature' ? 'What feature would you like to see?' :
               type === 'question' ? 'What do you need help with?' :
               'Your feedback'}
            </label>
            <textarea
              className="input"
              rows={5}
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={
                type === 'bug' ? 'When I click [button] on [page], it [does X] instead of [Y]...' :
                type === 'feature' ? 'It would be great if BillBack could...' :
                type === 'question' ? 'How do I...' :
                'Tell us what you think...'
              }
              style={{ resize: 'vertical', minHeight: 120 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              You can also email us at <a href="mailto:support@bizstackguide.com" style={{ color: '#3b5998', fontWeight: 500 }}>support@bizstackguide.com</a>
            </p>
            <button type="submit" className="btn btn-primary" disabled={sending || !message.trim()}>
              {sending ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}