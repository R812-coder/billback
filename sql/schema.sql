-- ============================================
-- RUBS Utility Bill-Back Platform
-- Supabase PostgreSQL Schema
-- ============================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  company_name text,
  phone text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. PROPERTIES
-- ============================================
create table public.properties (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  address text,
  city text,
  state text,
  zip text,
  property_type text not null default 'residential' check (property_type in ('residential', 'commercial', 'mixed')),
  total_sqft numeric,
  common_area_sqft numeric default 0,
  default_allocation_method text not null default 'sqft' check (default_allocation_method in ('sqft', 'occupancy', 'weighted', 'bedroom')),
  sqft_weight integer default 70, -- for weighted method, percentage allocated to sqft
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 3. UNITS
-- ============================================
create table public.units (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  unit_number text not null,
  sqft numeric not null default 0,
  bedrooms integer default 1,
  occupants integer default 1,
  tenant_name text,
  tenant_email text,
  tenant_phone text,
  lease_start date,
  lease_end date,
  is_vacant boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 4. BILLING PERIODS
-- ============================================
create table public.billing_periods (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'calculated', 'invoiced', 'closed')),
  allocation_method text not null default 'sqft',
  sqft_weight integer default 70,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 5. UTILITY BILLS (the actual bills the landlord receives)
-- ============================================
create table public.utility_bills (
  id uuid default uuid_generate_v4() primary key,
  billing_period_id uuid references public.billing_periods(id) on delete cascade not null,
  utility_type text not null check (utility_type in ('electric', 'water', 'gas', 'trash', 'sewer', 'other')),
  utility_label text, -- custom label for "other" type
  amount numeric not null default 0,
  bill_date date,
  account_number text,
  created_at timestamptz not null default now()
);

-- ============================================
-- 6. TENANT CHARGES (calculated allocations)
-- ============================================
create table public.tenant_charges (
  id uuid default uuid_generate_v4() primary key,
  billing_period_id uuid references public.billing_periods(id) on delete cascade not null,
  unit_id uuid references public.units(id) on delete cascade not null,
  share_percentage numeric not null,
  -- individual utility amounts
  electric_amount numeric default 0,
  water_amount numeric default 0,
  gas_amount numeric default 0,
  trash_amount numeric default 0,
  sewer_amount numeric default 0,
  other_amount numeric default 0,
  total_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================
-- 7. INVOICES
-- ============================================
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  tenant_charge_id uuid references public.tenant_charges(id) on delete cascade not null,
  billing_period_id uuid references public.billing_periods(id) on delete cascade not null,
  unit_id uuid references public.units(id) on delete cascade not null,
  invoice_number text not null,
  tenant_name text,
  tenant_email text,
  amount numeric not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  pdf_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 8. PAYMENTS
-- ============================================
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  amount numeric not null,
  payment_method text check (payment_method in ('cash', 'check', 'bank_transfer', 'venmo', 'zelle', 'other')),
  payment_date date not null default current_date,
  reference_number text, -- check number, transaction ID, etc.
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================
-- 9. CAM BUDGETS (for commercial properties)
-- ============================================
create table public.cam_budgets (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  year integer not null,
  status text not null default 'active' check (status in ('active', 'reconciled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, year)
);

-- ============================================
-- 10. CAM BUDGET LINE ITEMS
-- ============================================
create table public.cam_budget_items (
  id uuid default uuid_generate_v4() primary key,
  cam_budget_id uuid references public.cam_budgets(id) on delete cascade not null,
  category text not null, -- 'maintenance', 'landscaping', 'insurance', 'taxes', 'utilities', 'management', 'other'
  description text not null,
  budgeted_amount numeric not null default 0,
  actual_amount numeric default 0,
  created_at timestamptz not null default now()
);

-- ============================================
-- 11. CAM TENANT ESTIMATES (monthly estimates paid by tenants)
-- ============================================
create table public.cam_tenant_estimates (
  id uuid default uuid_generate_v4() primary key,
  cam_budget_id uuid references public.cam_budgets(id) on delete cascade not null,
  unit_id uuid references public.units(id) on delete cascade not null,
  monthly_estimate numeric not null default 0,
  total_paid numeric not null default 0, -- sum of monthly payments made
  reconciliation_amount numeric, -- positive = tenant owes, negative = credit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 12. WAITLIST (for free calculator signups)
-- ============================================
create table public.waitlist (
  id uuid default uuid_generate_v4() primary key,
  email text not null unique,
  source text default 'calculator', -- where they signed up from
  created_at timestamptz not null default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.billing_periods enable row level security;
alter table public.utility_bills enable row level security;
alter table public.tenant_charges enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.cam_budgets enable row level security;
alter table public.cam_budget_items enable row level security;
alter table public.cam_tenant_estimates enable row level security;

-- Profiles: users can only see/edit their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Properties: users can only CRUD their own
create policy "Users can view own properties" on public.properties for select using (auth.uid() = user_id);
create policy "Users can insert own properties" on public.properties for insert with check (auth.uid() = user_id);
create policy "Users can update own properties" on public.properties for update using (auth.uid() = user_id);
create policy "Users can delete own properties" on public.properties for delete using (auth.uid() = user_id);

-- Units: access through property ownership
create policy "Users can view own units" on public.units for select using (
  exists (select 1 from public.properties where properties.id = units.property_id and properties.user_id = auth.uid())
);
create policy "Users can insert own units" on public.units for insert with check (
  exists (select 1 from public.properties where properties.id = units.property_id and properties.user_id = auth.uid())
);
create policy "Users can update own units" on public.units for update using (
  exists (select 1 from public.properties where properties.id = units.property_id and properties.user_id = auth.uid())
);
create policy "Users can delete own units" on public.units for delete using (
  exists (select 1 from public.properties where properties.id = units.property_id and properties.user_id = auth.uid())
);

-- Billing periods: through property
create policy "Users can view own billing periods" on public.billing_periods for select using (
  exists (select 1 from public.properties where properties.id = billing_periods.property_id and properties.user_id = auth.uid())
);
create policy "Users can insert own billing periods" on public.billing_periods for insert with check (
  exists (select 1 from public.properties where properties.id = billing_periods.property_id and properties.user_id = auth.uid())
);
create policy "Users can update own billing periods" on public.billing_periods for update using (
  exists (select 1 from public.properties where properties.id = billing_periods.property_id and properties.user_id = auth.uid())
);
create policy "Users can delete own billing periods" on public.billing_periods for delete using (
  exists (select 1 from public.properties where properties.id = billing_periods.property_id and properties.user_id = auth.uid())
);

-- Utility bills: through billing period → property
create policy "Users can view own utility bills" on public.utility_bills for select using (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = utility_bills.billing_period_id and p.user_id = auth.uid()
  )
);
create policy "Users can insert own utility bills" on public.utility_bills for insert with check (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = utility_bills.billing_period_id and p.user_id = auth.uid()
  )
);
create policy "Users can update own utility bills" on public.utility_bills for update using (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = utility_bills.billing_period_id and p.user_id = auth.uid()
  )
);
create policy "Users can delete own utility bills" on public.utility_bills for delete using (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = utility_bills.billing_period_id and p.user_id = auth.uid()
  )
);

-- Tenant charges: through billing period → property
create policy "Users can view own tenant charges" on public.tenant_charges for select using (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = tenant_charges.billing_period_id and p.user_id = auth.uid()
  )
);
create policy "Users can insert own tenant charges" on public.tenant_charges for insert with check (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = tenant_charges.billing_period_id and p.user_id = auth.uid()
  )
);
create policy "Users can update own tenant charges" on public.tenant_charges for update using (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = tenant_charges.billing_period_id and p.user_id = auth.uid()
  )
);
create policy "Users can delete own tenant charges" on public.tenant_charges for delete using (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = tenant_charges.billing_period_id and p.user_id = auth.uid()
  )
);

-- Invoices: through billing period → property
create policy "Users can view own invoices" on public.invoices for select using (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = invoices.billing_period_id and p.user_id = auth.uid()
  )
);
create policy "Users can insert own invoices" on public.invoices for insert with check (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = invoices.billing_period_id and p.user_id = auth.uid()
  )
);
create policy "Users can update own invoices" on public.invoices for update using (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = invoices.billing_period_id and p.user_id = auth.uid()
  )
);
create policy "Users can delete own invoices" on public.invoices for delete using (
  exists (
    select 1 from public.billing_periods bp
    join public.properties p on p.id = bp.property_id
    where bp.id = invoices.billing_period_id and p.user_id = auth.uid()
  )
);

-- Payments: through invoice → billing period → property
create policy "Users can view own payments" on public.payments for select using (
  exists (
    select 1 from public.invoices i
    join public.billing_periods bp on bp.id = i.billing_period_id
    join public.properties p on p.id = bp.property_id
    where i.id = payments.invoice_id and p.user_id = auth.uid()
  )
);
create policy "Users can insert own payments" on public.payments for insert with check (
  exists (
    select 1 from public.invoices i
    join public.billing_periods bp on bp.id = i.billing_period_id
    join public.properties p on p.id = bp.property_id
    where i.id = payments.invoice_id and p.user_id = auth.uid()
  )
);
create policy "Users can update own payments" on public.payments for update using (
  exists (
    select 1 from public.invoices i
    join public.billing_periods bp on bp.id = i.billing_period_id
    join public.properties p on p.id = bp.property_id
    where i.id = payments.invoice_id and p.user_id = auth.uid()
  )
);
create policy "Users can delete own payments" on public.payments for delete using (
  exists (
    select 1 from public.invoices i
    join public.billing_periods bp on bp.id = i.billing_period_id
    join public.properties p on p.id = bp.property_id
    where i.id = payments.invoice_id and p.user_id = auth.uid()
  )
);

-- CAM budgets: through property
create policy "Users can view own cam budgets" on public.cam_budgets for select using (
  exists (select 1 from public.properties where properties.id = cam_budgets.property_id and properties.user_id = auth.uid())
);
create policy "Users can insert own cam budgets" on public.cam_budgets for insert with check (
  exists (select 1 from public.properties where properties.id = cam_budgets.property_id and properties.user_id = auth.uid())
);
create policy "Users can update own cam budgets" on public.cam_budgets for update using (
  exists (select 1 from public.properties where properties.id = cam_budgets.property_id and properties.user_id = auth.uid())
);
create policy "Users can delete own cam budgets" on public.cam_budgets for delete using (
  exists (select 1 from public.properties where properties.id = cam_budgets.property_id and properties.user_id = auth.uid())
);

-- CAM budget items: through budget → property
create policy "Users can view own cam items" on public.cam_budget_items for select using (
  exists (
    select 1 from public.cam_budgets cb
    join public.properties p on p.id = cb.property_id
    where cb.id = cam_budget_items.cam_budget_id and p.user_id = auth.uid()
  )
);
create policy "Users can insert own cam items" on public.cam_budget_items for insert with check (
  exists (
    select 1 from public.cam_budgets cb
    join public.properties p on p.id = cb.property_id
    where cb.id = cam_budget_items.cam_budget_id and p.user_id = auth.uid()
  )
);
create policy "Users can update own cam items" on public.cam_budget_items for update using (
  exists (
    select 1 from public.cam_budgets cb
    join public.properties p on p.id = cb.property_id
    where cb.id = cam_budget_items.cam_budget_id and p.user_id = auth.uid()
  )
);
create policy "Users can delete own cam items" on public.cam_budget_items for delete using (
  exists (
    select 1 from public.cam_budgets cb
    join public.properties p on p.id = cb.property_id
    where cb.id = cam_budget_items.cam_budget_id and p.user_id = auth.uid()
  )
);

-- CAM tenant estimates: through budget → property
create policy "Users can view own cam estimates" on public.cam_tenant_estimates for select using (
  exists (
    select 1 from public.cam_budgets cb
    join public.properties p on p.id = cb.property_id
    where cb.id = cam_tenant_estimates.cam_budget_id and p.user_id = auth.uid()
  )
);
create policy "Users can insert own cam estimates" on public.cam_tenant_estimates for insert with check (
  exists (
    select 1 from public.cam_budgets cb
    join public.properties p on p.id = cb.property_id
    where cb.id = cam_tenant_estimates.cam_budget_id and p.user_id = auth.uid()
  )
);
create policy "Users can update own cam estimates" on public.cam_tenant_estimates for update using (
  exists (
    select 1 from public.cam_budgets cb
    join public.properties p on p.id = cb.property_id
    where cb.id = cam_tenant_estimates.cam_budget_id and p.user_id = auth.uid()
  )
);
create policy "Users can delete own cam estimates" on public.cam_tenant_estimates for delete using (
  exists (
    select 1 from public.cam_budgets cb
    join public.properties p on p.id = cb.property_id
    where cb.id = cam_tenant_estimates.cam_budget_id and p.user_id = auth.uid()
  )
);

-- Waitlist: public insert, no read
create policy "Anyone can join waitlist" on public.waitlist for insert with check (true);

-- ============================================
-- INDEXES for performance
-- ============================================
create index idx_properties_user on public.properties(user_id);
create index idx_units_property on public.units(property_id);
create index idx_billing_periods_property on public.billing_periods(property_id);
create index idx_utility_bills_period on public.utility_bills(billing_period_id);
create index idx_tenant_charges_period on public.tenant_charges(billing_period_id);
create index idx_tenant_charges_unit on public.tenant_charges(unit_id);
create index idx_invoices_period on public.invoices(billing_period_id);
create index idx_invoices_unit on public.invoices(unit_id);
create index idx_invoices_status on public.invoices(status);
create index idx_payments_invoice on public.payments(invoice_id);
create index idx_cam_budgets_property on public.cam_budgets(property_id);

-- ============================================
-- HELPER FUNCTION: Generate invoice numbers
-- ============================================
create or replace function generate_invoice_number(property_name text, period_date date, unit_num text)
returns text as $$
begin
  return upper(left(replace(property_name, ' ', ''), 3)) || '-' || 
         to_char(period_date, 'YYMM') || '-' || 
         upper(replace(unit_num, ' ', ''));
end;
$$ language plpgsql;
