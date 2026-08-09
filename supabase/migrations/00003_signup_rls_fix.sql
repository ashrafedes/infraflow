-- Fix RLS policies and schema for client-side signup

-- ============================================================
-- PROFILES: add company_id, email, is_active columns
-- ============================================================
alter table public.profiles
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists email text,
  add column if not exists is_active boolean not null default true;

-- ============================================================
-- ROLES: add code column for lookups
-- ============================================================
alter table public.roles
  add column if not exists code text;

-- Update existing roles with codes
update public.roles set code = 'company_admin' where name = 'Company Admin';
update public.roles set code = 'warehouse_manager' where name = 'Warehouse Manager';
update public.roles set code = 'warehouse_user' where name = 'Warehouse User';
update public.roles set code = 'project_manager' where name = 'Project Manager';
update public.roles set code = 'viewer' where name = 'Viewer';

-- Make code unique
alter table public.roles add constraint roles_code_unique unique (code);

-- ============================================================
-- COMPANIES: allow authenticated users to insert (for signup)
-- ============================================================
create policy "companies_insert_authenticated"
  on public.companies
  for insert to authenticated
  with check (true);

-- ============================================================
-- PROFILES: allow users to update their own profile (already exists)
-- but also allow updating company_id
-- (profiles_update_own already covers this)
-- ============================================================

-- ============================================================
-- USER_ROLES: allow users to insert their own role assignment
-- during signup (chicken-and-egg fix)
-- ============================================================
create policy "user_roles_insert_self_signup"
  on public.user_roles
  for insert to authenticated
  with check (user_id = auth.uid());
