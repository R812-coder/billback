# BillBack Platform — Complete Deployment Guide

Everything you need to do, step by step, to get the full utility bill-back platform live. I built all the code — this guide covers what YOU do on your end.

---

## What's Been Built (31 files)

| Area | What it does |
|------|-------------|
| **Homepage** (`app/page.js`) | Marketing page + free RUBS calculator + signup CTAs |
| **Auth** (`login`, `signup`, `auth/callback`) | Email/password signup & login via Supabase Auth |
| **Dashboard** | Overview stats, recent invoices, quick actions |
| **Properties** | Add/edit/delete properties and units with tenant info |
| **Billing** | Create billing periods, enter utility bills, calculate RUBS allocations, generate invoices |
| **Invoices** | View all invoices, filter by status, download PDF, email to tenants, bulk email |
| **Payments** | Record payments (cash/check/Venmo/Zelle), track outstanding balances |
| **CAM Reconciliation** | Annual reconciliation for commercial properties (Pro plan only) |
| **Pricing** | Three-tier pricing page (Free / Starter $29 / Pro $69) |
| **API routes** | PDF generation, email sending (Resend), Stripe checkout + webhooks, waitlist |
| **Database** | Full PostgreSQL schema with Row Level Security |
| **Plan enforcement** | Feature gating by plan tier |

---

## PHASE 1: Set Up Supabase (30 minutes)

This is your database and authentication system. Free tier handles thousands of users.

### Step 1: Create a Supabase project

1. Go to **supabase.com** and sign up (free)
2. Click **"New Project"**
3. Set:
   - **Name:** `billback`
   - **Database Password:** Generate a strong one and **save it somewhere** (you'll need it)
   - **Region:** East US (closest to NJ)
4. Wait 1-2 minutes for the project to spin up

### Step 2: Get your API keys

1. In Supabase dashboard, go to **Settings → API**
2. Copy these three values (you'll need them for `.env.local`):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **`anon` public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`service_role` secret key** → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ The `service_role` key bypasses Row Level Security. Never expose it in client code. It's only used server-side (Stripe webhooks).

### Step 3: Run the database schema

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file `sql/schema.sql` from the project
4. Copy the ENTIRE contents and paste it into the SQL editor
5. Click **"Run"**
6. You should see "Success. No rows returned" (that's correct — it created tables)

### Step 4: Verify the tables

1. Go to **Table Editor** (left sidebar)
2. You should see all the tables: `profiles`, `properties`, `units`, `billing_periods`, `utility_bills`, `tenant_charges`, `invoices`, `payments`, `cam_budgets`, `cam_budget_items`, `cam_tenant_estimates`, `waitlist`
3. If any are missing, re-run the schema SQL

### Step 5: Configure Auth

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to: `http://localhost:3000` (change to your production domain later)
3. Add to **Redirect URLs**: `http://localhost:3000/auth/callback`
4. Under **Auth → Providers**, ensure **Email** is enabled (it should be by default)
5. Optional: Disable "Confirm email" for faster testing (Auth → Settings → toggle off "Enable email confirmations"). Re-enable before launch.

---

## PHASE 2: Set Up the Project Locally (20 minutes)

### Step 6: Set up the codebase

The entire project is in the `billback-platform` folder. Move it to where you keep your projects:

```bash
# Move to your projects folder
mv billback-platform ~/projects/billback
cd ~/projects/billback

# Install dependencies
npm install
```

### Step 7: Create your environment file

```bash
cp .env.example .env.local
```

Now edit `.env.local` and fill in the Supabase values from Step 2:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Leave the Resend and Stripe keys blank for now — we'll set those up later.

### Step 8: Run it locally

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. You should see:
- The homepage with the free RUBS calculator
- Nav links to Pricing, Sign In, Get Started
- The calculator should work fully (it's client-side only)

### Step 9: Test the full flow

1. Go to `/signup` and create an account
2. Check your email for the confirmation link (or skip if you disabled email confirmation)
3. After confirming, go to `/login` and sign in
4. You should land on the **Dashboard**
5. Go to **Properties** → Add a property → Add 3-4 units with tenant names
6. Go to **Billing** → Create a new billing period → Enter utility amounts → Click "Calculate"
7. You should see the tenant charges calculated correctly
8. Click "Generate Invoices"
9. Go to **Invoices** — you should see all the invoices

If all that works, you're ready to deploy.

---

## PHASE 3: Buy a Domain & Deploy (30 minutes)

### Step 10: Buy a domain

Go to **Namecheap** or **Porkbun** and buy:
- `billback.app` or `getbillback.com` or `utilitybillback.com` or similar
- Budget: ~$10-12/year
- Don't buy upsells

### Step 11: Push to GitHub

```bash
# In your project folder
git init
git add .
git commit -m "BillBack platform v1"
```

Then create a new repo on github.com (call it `billback`) and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/billback.git
git branch -M main
git push -u origin main
```

### Step 12: Deploy to Vercel

1. Go to **vercel.com** and sign up with GitHub
2. Click **"Add New Project"** → Import your `billback` repo
3. Vercel auto-detects Next.js — leave all defaults
4. **Before deploying**, add environment variables:
   - Click "Environment Variables"
   - Add ALL variables from your `.env.local` file
   - Change `NEXT_PUBLIC_SITE_URL` to `https://yourdomain.com`
5. Click **"Deploy"**
6. Wait 1-2 minutes

### Step 13: Connect your domain

1. In Vercel project → **Settings → Domains**
2. Add your domain (e.g., `billback.app`)
3. Vercel shows DNS records to add
4. Go to your domain registrar → **DNS settings**
5. Add the records Vercel tells you (usually a CNAME or A record)
6. Wait 10-60 minutes for DNS propagation

### Step 14: Update Supabase URLs

Now that you have a production domain:

1. Go to Supabase → **Authentication → URL Configuration**
2. Change **Site URL** to: `https://yourdomain.com`
3. Add to **Redirect URLs**: `https://yourdomain.com/auth/callback`

---

## PHASE 4: Set Up Email Invoices — Resend (20 minutes)

This lets users email invoices directly to tenants. Skip this for initial testing if you want.

### Step 15: Create Resend account

1. Go to **resend.com** and sign up
2. Free tier: 100 emails/day, 3,000/month (plenty for starting)

### Step 16: Add your domain to Resend

1. In Resend dashboard → **Domains** → **Add Domain**
2. Enter your domain (e.g., `billback.app`)
3. Resend shows DNS records (SPF, DKIM, etc.)
4. Add ALL the DNS records to your domain registrar
5. Click "Verify" in Resend — may take a few minutes
6. Once verified, you can send emails from `billing@yourdomain.com`

### Step 17: Get your API key

1. Resend dashboard → **API Keys** → **Create API Key**
2. Copy the key

### Step 18: Add to Vercel

1. Go to your Vercel project → **Settings → Environment Variables**
2. Add:
   - `RESEND_API_KEY` = your key
   - `RESEND_DOMAIN` = your domain (e.g., `billback.app`)
3. **Redeploy** (Vercel → Deployments → three dots → Redeploy)

Now the "📧 Email" button on invoices will actually send emails!

---

## PHASE 5: Set Up Payments — Stripe (30 minutes)

This lets users upgrade to paid plans. Skip this initially if you want to test with only the free tier.

### Step 19: Create Stripe account

1. Go to **stripe.com** and sign up
2. Complete the onboarding (business info, bank account for payouts)
3. Stay in **Test Mode** until you're ready to go live

### Step 20: Create your products and prices

In Stripe dashboard → **Products** → **Add Product**:

**Product 1: Starter Plan**
- Name: `BillBack Starter`
- Price: `$29.00 / month` (recurring)
- After creating, copy the **Price ID** (starts with `price_...`)

**Product 2: Pro Plan**
- Name: `BillBack Pro`
- Price: `$69.00 / month` (recurring)
- Copy the **Price ID**

### Step 21: Add Price IDs to code

Open `lib/plans.js` and update the `stripe_price_id` fields:

```js
starter: {
  // ...
  stripe_price_id: 'price_xxxxxxxxxxxxxx', // Your Starter price ID
},
pro: {
  // ...
  stripe_price_id: 'price_xxxxxxxxxxxxxx', // Your Pro price ID
},
```

Commit and push this change — Vercel will auto-redeploy.

### Step 22: Set up Stripe webhook

1. Stripe dashboard → **Developers → Webhooks**
2. Click **"Add endpoint"**
3. URL: `https://yourdomain.com/api/stripe-webhook/checkout`
4. Events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. After creating, copy the **Webhook Signing Secret** (starts with `whsec_...`)

### Step 23: Add Stripe keys to Vercel

1. Stripe → **Developers → API Keys** → Copy your **Secret Key**
2. Vercel → Environment Variables → Add:
   - `STRIPE_SECRET_KEY` = `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
3. Redeploy

### Step 24: Test the upgrade flow

1. Sign up for a new account on your site
2. Go to `/pricing` and click "Start Free Trial" on Starter
3. You should be redirected to Stripe Checkout
4. Use test card: `4242 4242 4242 4242`, any future date, any CVC
5. After completing, you should be redirected back to `/dashboard?upgraded=true`
6. Check Supabase → `profiles` table — your `plan` should now say `starter`

### When you're ready to go live:
1. Stripe → toggle from Test to Live mode
2. Create new Live products/prices (same as above)
3. Update `lib/plans.js` with Live price IDs
4. Update Vercel env vars with Live Stripe keys
5. Create new Live webhook pointing to same URL

---

## PHASE 6: Post-Launch Checklist

### Step 25: Set up analytics

**Quick option — Vercel Analytics:**
```bash
npm install @vercel/analytics
```
Add to `app/layout.js`:
```jsx
import { Analytics } from '@vercel/analytics/react'
// ... in body:
{children}
<Analytics />
```

### Step 26: Google Search Console

1. Go to search.google.com/search-console
2. Add your domain
3. Verify via DNS (add TXT record to your domain)
4. Your sitemap is auto-generated at `/sitemap.xml` — submit it

### Step 27: Test on mobile

Open your site on your phone. Walk through:
- [ ] Homepage calculator works
- [ ] Signup/login works
- [ ] Dashboard is readable
- [ ] Can add property and units
- [ ] Billing flow works
- [ ] Invoice table doesn't break

### Step 28: Test all features end-to-end

- [ ] Sign up new account
- [ ] Add a property with 5+ units
- [ ] Create billing period, enter utility amounts
- [ ] Calculate shares — verify math is correct
- [ ] Generate invoices
- [ ] Download a PDF invoice
- [ ] Email an invoice to yourself
- [ ] Record a payment
- [ ] Check dashboard stats update
- [ ] If commercial property: test CAM reconciliation
- [ ] Pricing page loads correctly
- [ ] Stripe checkout works (test mode)

---

## PHASE 7: Soft Launch

Once everything is tested:

1. **Reddit** — Post in r/landlord, r/realestateinvesting, r/PropertyManagement:
   - "I built a free RUBS calculator + billing tool for landlords, would love feedback"
   - Link to the free calculator (not the paid tool — let them discover it)
   - Be genuine, respond to every comment

2. **BiggerPockets** — Post in the forums, same approach

3. **Facebook groups** — "Landlord Support Group" (90K+), local landlord groups

4. **Goal:** 50-100 signups in first 2 weeks, get real feedback

---

## Cost Summary

| Service | Cost | When to set up |
|---------|------|---------------|
| Domain | ~$10-12/yr | Phase 3 |
| Supabase | $0 (free tier: 50K monthly active users) | Phase 1 |
| Vercel | $0 (free tier: 100GB bandwidth) | Phase 3 |
| Resend | $0 (free: 100 emails/day) | Phase 4 |
| Stripe | 2.9% + $0.30 per transaction (no monthly fee) | Phase 5 |
| **Total to launch** | **~$10-12** | |

---

## File Map

```
billback/
├── app/
│   ├── page.js                          # Homepage + free calculator
│   ├── layout.js                        # Root layout + fonts
│   ├── globals.css                      # Global styles
│   ├── sitemap.js                       # SEO sitemap
│   ├── robots.js                        # SEO robots.txt
│   ├── login/page.js                    # Login page
│   ├── signup/page.js                   # Signup page
│   ├── pricing/page.js                  # Pricing page
│   ├── auth/callback/route.js           # Auth redirect handler
│   ├── api/
│   │   ├── subscribe/route.js           # Waitlist email capture
│   │   ├── invoices/pdf/route.js        # PDF generation
│   │   ├── invoices/email/route.js      # Email sending via Resend
│   │   └── stripe-webhook/checkout/route.js  # Stripe checkout + webhooks
│   ├── components/
│   │   └── AppShell.jsx                 # Sidebar navigation
│   └── (app)/                           # Authenticated route group
│       ├── layout.js                    # Auth wrapper + AppShell
│       ├── dashboard/page.js            # Dashboard overview
│       ├── properties/page.js           # Property & unit CRUD
│       ├── billing/page.js              # Monthly billing workflow
│       ├── invoices/page.js             # Invoice management
│       ├── payments/page.js             # Payment tracking
│       └── cam-reconciliation/page.js   # Commercial CAM
├── lib/
│   ├── calculations.js                  # RUBS math engine
│   ├── plans.js                         # Plan tiers & feature limits
│   ├── supabase-browser.js              # Client-side Supabase
│   └── supabase-server.js               # Server-side Supabase
├── sql/
│   └── schema.sql                       # Full database schema
├── middleware.js                         # Route protection
├── package.json
├── jsconfig.json
├── next.config.js
└── .env.example
```

---

## What's Next After Launch

1. **SEO content sprint** — We'll build the blog/content pages:
   - "How to Calculate RUBS" guide
   - "RUBS vs Sub-Metering" comparison
   - State-by-state legality guides
   - Free template downloads
   
2. **Iterate based on feedback** — Fix issues, add requested features

3. **Email nurture sequence** — Via ConvertKit/Resend:
   - Day 1: Welcome + calculator link
   - Day 3: "Are you still doing this in Excel?" + feature showcase
   - Day 7: "3 mistakes landlords make with RUBS" + paid tool CTA
   - Day 14: Testimonial + discount offer

4. **Scale** — Once you have paying users, consider:
   - QuickBooks integration
   - OCR for utility bill scanning
   - Tenant payment portal
   - Multi-user access for PM companies
