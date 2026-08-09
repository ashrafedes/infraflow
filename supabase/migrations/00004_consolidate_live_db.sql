-- Consolidate live DB to match 00001_final_schema (v4)
-- Transforms the existing live Supabase database to the final schema
-- Applied via apply_migration (auto-records in schema_migrations)

-- ============================================================
-- 1. user_roles: add id column, change PK, add company_id, single-company
-- ============================================================
alter table public.user_roles add column id uuid default gen_random_uuid();

update public.user_roles set id = gen_random_uuid() where id is null;

alter table public.user_roles alter column id set not null;

alter table public.user_roles drop constraint user_roles_pkey;
alter table public.user_roles add primary key (id);

alter table public.user_roles add column company_id uuid not null references public.companies(id) on delete cascade;

alter table public.user_roles add constraint user_roles_user_id_key unique (user_id);

-- ============================================================
-- 2. profiles: make company_id nullable, fix FK delete rule
-- ============================================================
alter table public.profiles alter column company_id drop not null;

alter table public.profiles drop constraint profiles_company_id_fkey;
alter table public.profiles add constraint profiles_company_id_fkey
  foreign key (company_id) references public.companies(id) on delete set null;

-- ============================================================
-- 3. companies: make code NOT NULL
-- ============================================================
alter table public.companies alter column code set not null;

-- ============================================================
-- 4. roles: add unique(name), drop duplicate index
-- ============================================================
alter table public.roles add constraint roles_name_key unique (name);

alter table public.roles drop constraint if exists roles_code_key;

-- ============================================================
-- 5. projects: add unique(id, company_id) for composite FK
-- ============================================================
alter table public.projects add constraint projects_id_company_id_key unique (id, company_id);

-- ============================================================
-- 6. jobs: replace simple FK with composite FK
-- ============================================================
alter table public.jobs drop constraint jobs_project_id_fkey;

alter table public.jobs add constraint jobs_project_company_match
  foreign key (project_id, company_id) references public.projects(id, company_id) on delete cascade;

-- ============================================================
-- 7. SECURITY DEFINER HELPER FUNCTIONS (no RLS recursion)
-- ============================================================

create or replace function public.get_user_company_ids(p_user_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_user_id is null or p_user_id <> auth.uid() then
    raise exception 'Unauthorized: caller identity mismatch';
  end if;
  return query select company_id from user_roles where user_id = p_user_id;
end;
$$;

create or replace function public.is_company_admin(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    return false;
  end if;
  select count(*) into v_count
  from user_roles ur
  join roles r on ur.role_id = r.id
  where ur.user_id = auth.uid()
    and ur.company_id = p_company_id
    and r.code = 'company_admin';
  return v_count > 0;
end;
$$;

-- ============================================================
-- 8. UTILITY FUNCTIONS
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create or replace function public.protect_profile_company_id()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'UPDATE' and NEW.company_id IS DISTINCT FROM OLD.company_id then
    if current_setting('app.onboarding_active', true) = 'on' then
      return NEW;
    end if;
    raise exception 'company_id cannot be modified directly';
  end if;
  return NEW;
end;
$$;

create or replace function public.validate_warehouse_manager()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_manager_company_id uuid;
begin
  if NEW.manager_user_id is not null then
    select company_id into v_manager_company_id
    from profiles where id = NEW.manager_user_id;
    if v_manager_company_id is null or v_manager_company_id <> NEW.company_id then
      raise exception 'Warehouse manager must belong to the same company';
    end if;
  end if;
  return NEW;
end;
$$;

create or replace function public.onboard_company(
  p_user_id uuid,
  p_company_name text,
  p_company_code text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_role_id uuid;
  v_existing_company_id uuid;
begin
  if auth.uid() is null or p_user_id is null or p_user_id <> auth.uid() then
    raise exception 'Unauthorized: caller identity mismatch';
  end if;

  select company_id into v_existing_company_id
    from profiles where id = p_user_id;
  if v_existing_company_id is not null then
    raise exception 'User already belongs to a company';
  end if;

  select id into v_company_id from companies where code = p_company_code;
  if found then
    raise exception 'Company code already exists';
  end if;

  insert into companies (name, code)
    values (p_company_name, p_company_code)
    returning id into v_company_id;

  set local app.onboarding_active = 'on';
  update profiles set company_id = v_company_id where id = p_user_id;

  select id into v_role_id from roles where code = 'company_admin';
  insert into user_roles (user_id, company_id, role_id)
    values (p_user_id, v_company_id, v_role_id);

  return v_company_id;
end;
$$;

-- ============================================================
-- 9. RESTRICT EXECUTE PRIVILEGES
-- ============================================================
revoke execute on function public.get_user_company_ids(uuid) from public, anon;
grant execute on function public.get_user_company_ids(uuid) to authenticated;

revoke execute on function public.is_company_admin(uuid) from public, anon;
grant execute on function public.is_company_admin(uuid) to authenticated;

revoke execute on function public.onboard_company(uuid, text, text) from public, anon;
grant execute on function public.onboard_company(uuid, text, text) to authenticated;

-- Trigger functions: not callable via RPC
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.validate_warehouse_manager() from public, anon, authenticated;

-- ============================================================
-- 10. TRIGGERS
-- ============================================================
create trigger companies_updated_at before update on public.companies
  for each row execute function public.handle_updated_at();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger profiles_protect_company_id before update on public.profiles
  for each row execute function public.protect_profile_company_id();

create trigger projects_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.handle_updated_at();

create trigger warehouses_updated_at before update on public.warehouses
  for each row execute function public.handle_updated_at();

create trigger validate_warehouse_manager_trigger
  before insert or update on public.warehouses
  for each row execute function public.validate_warehouse_manager();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 11. DROP OLD RLS POLICIES
-- ============================================================
drop policy if exists "companies_insert_authenticated" on public.companies;
drop policy if exists "user_roles_insert_self_signup" on public.user_roles;

-- ============================================================
-- 12. CREATE RLS POLICIES (23 policies — zero recursion)
-- ============================================================

-- COMPANIES: no INSERT (onboarding via Edge Function only)
create policy "companies_select_own" on public.companies
  for select to authenticated
  using (id in (select * from get_user_company_ids(auth.uid())));

create policy "companies_update_own_admin" on public.companies
  for update to authenticated
  using (is_company_admin(id));

create policy "companies_delete_own_admin" on public.companies
  for delete to authenticated
  using (is_company_admin(id));

-- PROFILES
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid());

-- ROLES
create policy "roles_select_all" on public.roles
  for select to authenticated
  using (true);

-- USER_ROLES
create policy "user_roles_select_own" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid());

create policy "user_roles_select_company" on public.user_roles
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "user_roles_insert_company_admin" on public.user_roles
  for insert to authenticated
  with check (is_company_admin(company_id));

create policy "user_roles_delete_company_admin" on public.user_roles
  for delete to authenticated
  using (is_company_admin(company_id));

-- PROJECTS
create policy "projects_select_own_company" on public.projects
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "projects_insert_own_company" on public.projects
  for insert to authenticated
  with check (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "projects_update_own_company" on public.projects
  for update to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "projects_delete_own_company" on public.projects
  for delete to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

-- JOBS
create policy "jobs_select_own_company" on public.jobs
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "jobs_insert_own_company" on public.jobs
  for insert to authenticated
  with check (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "jobs_update_own_company" on public.jobs
  for update to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "jobs_delete_own_company" on public.jobs
  for delete to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

-- WAREHOUSES
create policy "warehouses_select_own_company" on public.warehouses
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "warehouses_insert_own_company" on public.warehouses
  for insert to authenticated
  with check (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "warehouses_update_own_company" on public.warehouses
  for update to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "warehouses_delete_own_company" on public.warehouses
  for delete to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

-- ============================================================
-- 13. INDEXES (only missing ones)
-- ============================================================
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_company_id on public.user_roles(company_id);
