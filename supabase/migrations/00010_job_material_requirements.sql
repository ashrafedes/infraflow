-- InfraFlow Job Material Requirements
-- Tracks planned material needs per job
-- Table: job_material_requirements

-- ============================================================
-- JOB_MATERIAL_REQUIREMENTS — planned material needs per job
-- ============================================================
create table public.job_material_requirements (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  job_id          uuid not null references public.jobs(id) on delete cascade,
  material_id     uuid not null references public.materials(id) on delete cascade,
  planned_quantity numeric(18,4) not null default 0,
  unit_id         uuid references public.units_of_measure(id) on delete set null,
  required_date   date,
  notes           text,
  status          varchar(20) not null default 'PLANNED',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (company_id, job_id, material_id),
  constraint jmr_planned_qty_check check (planned_quantity >= 0),
  constraint jmr_status_check check (status in ('PLANNED', 'REQUESTED', 'PARTIAL', 'FULFILLED', 'CANCELLED'))
);

alter table public.job_material_requirements enable row level security;

-- ============================================================
-- TRIGGER: validate job and material belong to same company
-- ============================================================
create or replace function public.validate_jmr_company_match()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_job_company_id uuid;
  v_material_company_id uuid;
begin
  select company_id into v_job_company_id from jobs where id = NEW.job_id;
  select company_id into v_material_company_id from materials where id = NEW.material_id;

  if v_job_company_id is null then
    raise exception 'Job not found';
  end if;
  if v_material_company_id is null then
    raise exception 'Material not found';
  end if;
  if v_job_company_id <> v_material_company_id then
    raise exception 'Job and material must belong to the same company';
  end if;
  if v_job_company_id <> NEW.company_id then
    raise exception 'job_material_requirements.company_id must match job and material company_id';
  end if;
  return NEW;
end;
$$;

revoke execute on function public.validate_jmr_company_match() from public, anon, authenticated;

create trigger validate_jmr_company_match_trigger
  before insert or update on public.job_material_requirements
  for each row execute function public.validate_jmr_company_match();

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_jmr_company on public.job_material_requirements(company_id);
create index idx_jmr_job on public.job_material_requirements(job_id);
create index idx_jmr_material on public.job_material_requirements(material_id);

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================
create trigger jmr_updated_at before update on public.job_material_requirements
  for each row execute function public.handle_updated_at();

-- ============================================================
-- HELPER: can user manage job material requirements?
-- Admin, warehouse manager, and project manager can create requirements
-- ============================================================
create or replace function public.can_manage_job_requirements(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_code text;
begin
  v_role_code := public.get_user_role_code(p_company_id);
  return v_role_code in ('company_admin', 'warehouse_manager', 'project_manager');
end;
$$;

revoke execute on function public.can_manage_job_requirements(uuid) from public, anon;
grant execute on function public.can_manage_job_requirements(uuid) to authenticated;

-- ============================================================
-- RLS POLICIES
-- ============================================================
create policy "jmr_select_own" on public.job_material_requirements
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "jmr_insert_own" on public.job_material_requirements
  for insert to authenticated
  with check (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_job_requirements(company_id));

create policy "jmr_update_own" on public.job_material_requirements
  for update to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_job_requirements(company_id));

create policy "jmr_delete_own" on public.job_material_requirements
  for delete to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_job_requirements(company_id));
