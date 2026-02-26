-- Fix infinite recursion in profiles RLS policies.
-- The old "Admins read all profiles" policy queried profiles inside its own RLS check.

-- Drop the broken policies
drop policy if exists "Users read own profile" on profiles;
drop policy if exists "Admins read all profiles" on profiles;
drop policy if exists "Admins update all profiles" on profiles;
drop policy if exists "Admins insert profiles" on profiles;

-- All authenticated CRM users can read all profiles (needed for owner joins, team views)
create policy "Authenticated users read all profiles"
  on profiles for select
  using (auth.uid() is not null);

-- Users can update their own profile
-- (the "Users update own profile" policy already exists, keep it)

-- Admins can update any profile (use jwt claim to avoid recursion)
create policy "Admins update all profiles"
  on profiles for update
  using (
    auth.uid() = id
    or (auth.jwt() ->> 'role') = 'admin'
  );

-- Authenticated users can insert profiles (admin-only enforced at app level)
create policy "Admins insert profiles"
  on profiles for insert
  with check (auth.uid() is not null);
