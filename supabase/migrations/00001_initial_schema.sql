-- InfraFlow Core Schema Migration
-- Creates: companies, profiles, roles, user_roles, projects, jobs, warehouses
-- Enforces multi-tenant isolation via RLS

-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- COMPANIES
-- ============================================================
create table public.companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  code        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (code)
);

alter table public.companies enable row level security;

-- Companies are visible to users belonging to that company
create policy "companies_select_own" on public.companies
  for select to authenticated
  using (
    id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Users can update their own profile
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid());

-- Users can insert their own profile
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- ============================================================
-- ROLES
-- ============================================================
create table public.roles (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  unique (name)
);

alter table public.roles enable row level security;

-- All authenticated users can see available roles
create policy "roles_select_all" on public.roles
  for select to authenticated
  using (true);

-- ============================================================
-- USER_ROLES (junction: user + company + role)
-- ============================================================
create table public.user_roles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  role_id     uuid not null references public.roles(id),
  created_at  timestamptz not null default now(),
  unique (user_id, company_id, role_id)
);

alter table public.user_roles enable row level security;

-- Users can see their own role assignments
create policy "user_roles_select_own" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid());

-- Users can see roles for companies they belong to (needed for admin views)
create policy "user_roles_select_company" on public.user_roles
  for select to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

-- Company admins can insert role assignments for their company
create policy "user_roles_insert_company_admin" on public.user_roles
  for insert to authenticated
  with check (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      join public.roles r on ur.role_id = r.id
      where ur.user_id = auth.uid()
        and r.name = 'Company Admin'
    )
  );

-- Company admins can delete role assignments for their company
create policy "user_roles_delete_company_admin" on public.user_roles
  for delete to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      join public.roles r on ur.role_id = r.id
      where ur.user_id = auth.uid()
        and r.name = 'Company Admin'
    )
  );

-- ============================================================
-- PROJECTS
-- ============================================================
create table public.projects (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  code        text not null,
  name        text not null,
  description text,
  status      text not null default 'active' check (status in ('active', 'on_hold', 'completed', 'cancelled')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, code)
);

alter table public.projects enable row level security;

create policy "projects_select_own_company" on public.projects
  for select to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

create policy "projects_insert_own_company" on public.projects
  for insert to authenticated
  with check (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

create policy "projects_update_own_company" on public.projects
  for update to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

create policy "projects_delete_own_company" on public.projects
  for delete to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

-- ============================================================
-- JOBS
-- ============================================================
create table public.jobs (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  code        text not null,
  name        text not null,
  description text,
  status      text not null default 'active' check (status in ('active', 'on_hold', 'completed', 'cancelled')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, code)
);

alter table public.jobs enable row level security;

create policy "jobs_select_own_company" on public.jobs
  for select to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

create policy "jobs_insert_own_company" on public.jobs
  for insert to authenticated
  with check (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

create policy "jobs_update_own_company" on public.jobs
  for update to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

create policy "jobs_delete_own_company" on public.jobs
  for delete to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

-- ============================================================
-- WAREHOUSES
-- ============================================================
create table public.warehouses (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  code        text not null,
  name        text not null,
  location    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, code)
);

alter table public.warehouses enable row level security;

create policy "warehouses_select_own_company" on public.warehouses
  for select to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

create policy "warehouses_insert_own_company" on public.warehouses
  for insert to authenticated
  with check (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

create policy "warehouses_update_own_company" on public.warehouses
  for update to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

create policy "warehouses_delete_own_company" on public.warehouses
  for delete to authenticated
  using (
    company_id in (
      select ur.company_id
      from public.user_roles ur
      where ur.user_id = auth.uid()
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_user_roles_company_id on public.user_roles(company_id);
create index idx_projects_company_id on public.projects(company_id);
create index idx_jobs_company_id on public.jobs(company_id);
create index idx_jobs_project_id on public.jobs(project_id);
create index idx_warehouses_company_id on public.warehouses(company_id);

-- ============================================================
-- SEED DEFAULT ROLES
-- ============================================================
insert into public.roles (name, description) values
  ('Company Admin', 'Full access to all company data and settings'),
  ('Warehouse Manager', 'Manage warehouses, stock, and material movements'),
  ('Warehouse User', 'Perform warehouse operations: receive, issue, transfer'),
  ('Project Manager', 'Manage projects and jobs, view material consumption'),
  ('Viewer', 'Read-only access to company data')
on conflict (name) do nothing;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at before update on public.companies
  for each row execute function public.handle_updated_at();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger projects_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.handle_updated_at();

create trigger warehouses_updated_at before update on public.warehouses
  for each row execute function public.handle_updated_at();
