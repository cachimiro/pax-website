-- PaxBespoke CRM schema
-- Run this in the Supabase SQL Editor to set up all tables, enums, triggers, and RLS policies.

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

create type opportunity_stage as enum (
  'new_enquiry', 'call1_scheduled', 'qualified', 'call2_scheduled',
  'proposal_agreed', 'awaiting_deposit', 'deposit_paid',
  'onboarding_scheduled', 'onboarding_complete',
  'production', 'installation', 'complete', 'lost'
);

create type booking_type as enum ('call1', 'call2', 'onboarding');
create type booking_outcome as enum ('pending', 'completed', 'no_show', 'rescheduled');
create type onboarding_status as enum ('pending', 'scheduled', 'completed', 'verified');
create type invoice_status as enum ('sent', 'paid', 'overdue');
create type message_channel as enum ('email', 'sms', 'whatsapp');
create type lost_reason as enum (
  'not_qualified', 'price', 'timing', 'no_response', 'cancelled', 'competitor'
);

-- ─── PROFILES ────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'sales', 'operations')),
  phone text,
  calendar_link text,
  service_regions text[],
  active boolean default true,
  active_opportunities int default 0,
  last_assigned_at timestamptz,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- All authenticated staff can read all profiles (needed for owner joins, team views)
create policy "Authenticated users read all profiles"
  on profiles for select
  using (auth.uid() is not null);

create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Admins update all profiles"
  on profiles for update
  using (
    auth.uid() = id
    or (auth.jwt() ->> 'role') = 'admin'
  );

create policy "Admins insert profiles"
  on profiles for insert
  with check (auth.uid() is not null);

-- ─── LEADS ───────────────────────────────────────────────────────────────────

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  phone text,
  email text,
  postcode text,
  project_type text,
  budget_band text,
  source text,
  notes text,
  owner_user_id uuid references profiles(id),
  status text default 'new' check (status in ('new', 'contacted', 'lost'))
);

alter table public.leads enable row level security;

create policy "Staff read own leads"
  on leads for select
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'operations'))
  );

create policy "Staff insert leads"
  on leads for insert
  with check (
    exists (select 1 from profiles p where p.id = auth.uid())
  );

create policy "Staff update own leads"
  on leads for update
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─── OPPORTUNITIES ──────────────────────────────────────────────────────────

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade not null,
  stage opportunity_stage default 'new_enquiry' not null,
  value_estimate numeric(10,2),
  lost_reason lost_reason,
  owner_user_id uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  call1_completed_at timestamptz,
  deposit_paid_at timestamptz,
  onboarding_completed_at timestamptz,
  completed_at timestamptz
);

alter table public.opportunities enable row level security;

create policy "Staff read opportunities"
  on opportunities for select
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'operations'))
  );

create policy "Staff insert opportunities"
  on opportunities for insert
  with check (
    exists (select 1 from profiles p where p.id = auth.uid())
  );

create policy "Sales update own opportunities (pre-onboarding stages)"
  on opportunities for update
  using (
    owner_user_id = auth.uid()
    and stage in ('new_enquiry','call1_scheduled','qualified','call2_scheduled',
                  'proposal_agreed','awaiting_deposit','deposit_paid')
  );

create policy "Operations update opportunities (onboarding+ stages)"
  on opportunities for update
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('operations', 'admin'))
  );

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade not null,
  type booking_type not null,
  scheduled_at timestamptz not null,
  duration_min int default 30,
  owner_user_id uuid references profiles(id),
  outcome booking_outcome default 'pending',
  created_at timestamptz default now()
);

alter table public.bookings enable row level security;

create policy "Staff read bookings"
  on bookings for select
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'operations'))
  );

create policy "Staff insert bookings"
  on bookings for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid()));

create policy "Staff update own bookings"
  on bookings for update
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'operations'))
  );

-- ─── ONBOARDINGS ─────────────────────────────────────────────────────────────

create table public.onboardings (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade not null,
  status onboarding_status default 'pending',
  room_dimensions text,
  ceiling_height text,
  wall_measurements text,
  doors_windows text,
  obstacles text,
  materials text,
  finish text,
  access_notes text,
  install_conditions text,
  media_files text[],
  video_recording_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.onboardings enable row level security;

create policy "Staff read onboardings"
  on onboardings for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create policy "Operations manage onboardings"
  on onboardings for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('operations', 'admin')));

-- ─── INVOICES ────────────────────────────────────────────────────────────────

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade not null,
  amount numeric(10,2) not null,
  deposit_amount numeric(10,2),
  status invoice_status default 'sent',
  created_at timestamptz default now()
);

alter table public.invoices enable row level security;

create policy "Staff read invoices"
  on invoices for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create policy "Admin manage invoices"
  on invoices for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade not null,
  amount numeric(10,2) not null,
  paid_at timestamptz default now(),
  method text
);

alter table public.payments enable row level security;

create policy "Staff read payments"
  on payments for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create policy "Admin manage payments"
  on payments for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ─── TASKS ───────────────────────────────────────────────────────────────────

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  type text not null,
  due_at timestamptz,
  owner_user_id uuid references profiles(id),
  status text default 'open' check (status in ('open', 'done')),
  description text,
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Staff read own tasks"
  on tasks for select
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Staff manage own tasks"
  on tasks for all
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─── MESSAGE LOGS ────────────────────────────────────────────────────────────

create table public.message_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  channel message_channel not null,
  template text,
  sent_at timestamptz default now(),
  status text,
  metadata jsonb
);

alter table public.message_logs enable row level security;

create policy "Staff read message logs"
  on message_logs for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create policy "Staff insert message logs"
  on message_logs for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid()));

-- ─── STAGE AUDIT LOG ─────────────────────────────────────────────────────────

create table public.stage_log (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  from_stage opportunity_stage,
  to_stage opportunity_stage not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz default now(),
  notes text
);

alter table public.stage_log enable row level security;

create policy "Staff read stage log"
  on stage_log for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create policy "Staff insert stage log"
  on stage_log for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid()));

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

create index idx_opportunities_stage on opportunities(stage);
create index idx_opportunities_lead on opportunities(lead_id);
create index idx_opportunities_owner on opportunities(owner_user_id);
create index idx_bookings_opportunity on bookings(opportunity_id);
create index idx_bookings_scheduled on bookings(scheduled_at);
create index idx_tasks_owner_status on tasks(owner_user_id, status);
create index idx_leads_owner on leads(owner_user_id);
create index idx_message_logs_lead on message_logs(lead_id);
create index idx_onboardings_opportunity on onboardings(opportunity_id);
create index idx_invoices_opportunity on invoices(opportunity_id);
create index idx_payments_invoice on payments(invoice_id);

-- ─── TRIGGERS ────────────────────────────────────────────────────────────────

-- Auto-update updated_at on opportunities
create or replace function update_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on opportunities
  for each row execute function update_updated_at();

create trigger set_onboarding_updated_at
  before update on onboardings
  for each row execute function update_updated_at();

-- Onboarding lock: cannot enter production/installation/complete without completed onboarding
create or replace function check_onboarding_complete()
returns trigger as $$
begin
  if NEW.stage in ('production', 'installation', 'complete')
    and OLD.stage not in ('production', 'installation', 'complete') then
    if not exists (
      select 1 from onboardings
      where opportunity_id = NEW.id and status = 'completed'
    ) then
      raise exception 'Onboarding must be completed before entering production';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger enforce_onboarding_lock
  before update on opportunities
  for each row execute function check_onboarding_complete();

-- Deposit lock: cannot enter onboarding stages without a paid deposit
create or replace function check_deposit_paid()
returns trigger as $$
begin
  if NEW.stage in ('onboarding_scheduled', 'onboarding_complete',
                   'production', 'installation', 'complete')
    and OLD.stage not in ('onboarding_scheduled', 'onboarding_complete',
                          'production', 'installation', 'complete') then
    if not exists (
      select 1 from invoices i
      join payments p on p.invoice_id = i.id
      where i.opportunity_id = NEW.id
    ) then
      raise exception 'Deposit must be paid before onboarding';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger enforce_deposit_lock
  before update on opportunities
  for each row execute function check_deposit_paid();

-- Lost reason required when marking as lost
create or replace function require_lost_reason()
returns trigger as $$
begin
  if NEW.stage = 'lost' and NEW.lost_reason is null then
    raise exception 'Lost reason is required when marking opportunity as lost';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger enforce_lost_reason
  before update on opportunities
  for each row execute function require_lost_reason();
