-- ============================================
-- BillBack: Email & Payment Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Email log table (prevents duplicate sends)
CREATE TABLE IF NOT EXISTS email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_type ON email_log(user_id, email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON email_log(email_type);

-- Add welcome_email_sent flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE;

-- Add email column to profiles if not exists (for Resend)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- RLS for email_log (only service role can read/write — used by cron jobs)
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (cron jobs use service role key)
-- No user-facing policies needed since users never query this table

-- Grant access to authenticated users to read their own logs (optional, for account page)
CREATE POLICY "Users can view own email logs"
  ON email_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- Verify existing profile columns for Stripe
-- ============================================
-- These should already exist from initial schema, but just in case:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_sub ON profiles(stripe_subscription_id);