-- InfraFlow Job Material Usage
-- Tracks actual material consumption per job (issued, used, returned, wasted)
-- SECURITY DEFINER function for atomic issue-to-job operation
-- Table: job_material_usage

-- ============================================================
-- JOB_MATERIAL_USAGE — actual material consumption per job
-- ============================================================
create table public.job_material_usage (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  job_id          uuid not null references public.jobs(id) on delete restrict,
  material_id     uuid not null references public.materials(id) on delete restrict,
  warehouse_id    uuid not null references public.warehouses(id) on delete restrict,
  usage_type      varchar(20) not null,
  quantity        numeric(18,4) not null,
  unit_id         uuid references public.units_of_measure(id) on delete set null,
  reference       varchar(200),
  notes           text,
  performed_by    uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint jmu_usage_type_check check (usage_type in ('ISSUED', 'USED', 'RETURNED', 'WASTED')),
  constraint jmu_quantity_check check (quantity > 0)
);

alter table public.job_material_usage enable row level security;

-- Prevent deletion of job material usage records (immutable audit trail)
create or replace function public.prevent_jmu_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Job material usage records cannot be deleted (immutable audit trail)';
end;
$$;

create trigger jmu_no_delete
  before delete on public.job_material_usage
  for each row execute function public.prevent_jmu_delete();

-- Prevent direct update of job_material_usage (immutable)
create or replace function public.prevent_jmu_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Job material usage records cannot be modified (immutable audit trail)';
end;
$$;

create trigger jmu_no_update
  before update on public.job_material_usage
  for each row execute function public.prevent_jmu_update();

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_jmu_company on public.job_material_usage(company_id);
create index idx_jmu_job on public.job_material_usage(job_id);
create index idx_jmu_material on public.job_material_usage(material_id);
create index idx_jmu_warehouse on public.job_material_usage(warehouse_id);
create index idx_jmu_created_at on public.job_material_usage(created_at desc);

-- ============================================================
-- SECURITY DEFINER: Issue material to job (atomic)
-- Decrements warehouse stock AND creates job_material_usage record
-- Also creates a stock_movement for audit trail
-- ============================================================
create or replace function public.issue_material_to_job(
  p_job_id uuid,
  p_material_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric,
  p_reference text,
  p_notes text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_unit_id uuid;
  v_usage_id uuid;
  v_movement_id uuid;
  v_available numeric;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  -- Get company from material
  select company_id into v_company_id from materials where id = p_material_id;
  if v_company_id is null then
    raise exception 'Material not found';
  end if;

  -- Verify job belongs to same company
  perform 1 from jobs where id = p_job_id and company_id = v_company_id;
  if not found then
    raise exception 'Job not found or does not belong to your company';
  end if;

  -- Verify warehouse belongs to same company
  perform 1 from warehouses where id = p_warehouse_id and company_id = v_company_id;
  if not found then
    raise exception 'Warehouse not found or does not belong to your company';
  end if;

  -- Check permissions: admin, warehouse_manager, warehouse_user can issue
  if not can_manage_stock(v_company_id) then
    raise exception 'Unauthorized: insufficient permissions for stock operations';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  -- Check available stock
  select coalesce(quantity, 0) - coalesce(reserved, 0) into v_available
  from warehouse_stock
  where material_id = p_material_id and warehouse_id = p_warehouse_id;

  if v_available is null then v_available := 0; end if;

  if p_quantity > v_available then
    raise exception 'Insufficient available stock. Available: %, Requested: %', v_available, p_quantity;
  end if;

  select unit_id into v_unit_id from materials where id = p_material_id;

  -- Create stock movement (ISSUE type for job issue)
  insert into stock_movements (company_id, material_id, warehouse_id, movement_type, quantity, unit_id, reference, notes, created_by)
  values (v_company_id, p_material_id, p_warehouse_id, 'ISSUE', p_quantity, v_unit_id, p_reference, p_notes, auth.uid())
  returning id into v_movement_id;

  -- Decrement warehouse stock
  update warehouse_stock set quantity = quantity - p_quantity, updated_at = now()
  where material_id = p_material_id and warehouse_id = p_warehouse_id;

  -- Create job material usage record
  insert into job_material_usage (company_id, job_id, material_id, warehouse_id, usage_type, quantity, unit_id, reference, notes, performed_by)
  values (v_company_id, p_job_id, p_material_id, p_warehouse_id, 'ISSUED', p_quantity, v_unit_id, p_reference, p_notes, auth.uid())
  returning id into v_usage_id;

  return v_usage_id;
end;
$$;

-- ============================================================
-- SECURITY DEFINER: Record job material usage (USED/RETURNED/WASTED)
-- Does NOT affect warehouse stock (stock was already decremented at issue time)
-- ============================================================
create or replace function public.record_job_material_usage(
  p_job_id uuid,
  p_material_id uuid,
  p_warehouse_id uuid,
  p_usage_type text,
  p_quantity numeric,
  p_reference text,
  p_notes text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_unit_id uuid;
  v_usage_id uuid;
  v_issued_total numeric;
  v_used_total numeric;
  v_returned_total numeric;
  v_wasted_total numeric;
  v_remaining numeric;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  select company_id into v_company_id from materials where id = p_material_id;
  if v_company_id is null then
    raise exception 'Material not found';
  end if;

  perform 1 from jobs where id = p_job_id and company_id = v_company_id;
  if not found then
    raise exception 'Job not found or does not belong to your company';
  end if;

  perform 1 from warehouses where id = p_warehouse_id and company_id = v_company_id;
  if not found then
    raise exception 'Warehouse not found or does not belong to your company';
  end if;

  -- Admin, warehouse_manager, warehouse_user, project_manager can record usage
  if not (can_manage_stock(v_company_id) or public.get_user_role_code(v_company_id) = 'project_manager') then
    raise exception 'Unauthorized: insufficient permissions';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  if p_usage_type not in ('USED', 'RETURNED', 'WASTED') then
    raise exception 'Invalid usage type. Use USED, RETURNED, or WASTED';
  end if;

  -- Calculate current totals for this material in this job
  select
    coalesce(sum(case when usage_type = 'ISSUED' then quantity end), 0),
    coalesce(sum(case when usage_type = 'USED' then quantity end), 0),
    coalesce(sum(case when usage_type = 'RETURNED' then quantity end), 0),
    coalesce(sum(case when usage_type = 'WASTED' then quantity end), 0)
  into v_issued_total, v_used_total, v_returned_total, v_wasted_total
  from job_material_usage
  where job_id = p_job_id and material_id = p_material_id;

  v_remaining := v_issued_total - v_used_total - v_wasted_total;

  if p_usage_type = 'USED' then
    if p_quantity > v_remaining then
      raise exception 'Cannot use more than remaining issued quantity. Remaining: %, Requested: %', v_remaining, p_quantity;
    end if;
  elsif p_usage_type = 'WASTED' then
    if p_quantity > v_remaining then
      raise exception 'Cannot waste more than remaining issued quantity. Remaining: %, Requested: %', v_remaining, p_quantity;
    end if;
  elsif p_usage_type = 'RETURNED' then
    -- Return adds back to warehouse stock
    if p_quantity > v_remaining then
      raise exception 'Cannot return more than remaining issued quantity. Remaining: %, Requested: %', v_remaining, p_quantity;
    end if;

    -- Add back to warehouse stock
    insert into warehouse_stock (company_id, material_id, warehouse_id, quantity)
    values (v_company_id, p_material_id, p_warehouse_id, p_quantity)
    on conflict (material_id, warehouse_id)
    do update set quantity = warehouse_stock.quantity + p_quantity, updated_at = now();

    -- Create stock movement for return
    insert into stock_movements (company_id, material_id, warehouse_id, movement_type, quantity, unit_id, reference, notes, created_by)
    values (v_company_id, p_material_id, p_warehouse_id, 'RETURN', p_quantity, v_unit_id, p_reference, p_notes, auth.uid());
  end if;

  select unit_id into v_unit_id from materials where id = p_material_id;

  insert into job_material_usage (company_id, job_id, material_id, warehouse_id, usage_type, quantity, unit_id, reference, notes, performed_by)
  values (v_company_id, p_job_id, p_material_id, p_warehouse_id, p_usage_type, p_quantity, v_unit_id, p_reference, p_notes, auth.uid())
  returning id into v_usage_id;

  return v_usage_id;
end;
$$;

-- ============================================================
-- RESTRICT EXECUTE PRIVILEGES
-- ============================================================
revoke execute on function public.issue_material_to_job(uuid, uuid, uuid, numeric, text, text) from public, anon;
grant execute on function public.issue_material_to_job(uuid, uuid, uuid, numeric, text, text) to authenticated;

revoke execute on function public.record_job_material_usage(uuid, uuid, uuid, text, numeric, text, text) from public, anon;
grant execute on function public.record_job_material_usage(uuid, uuid, uuid, text, numeric, text, text) to authenticated;

revoke execute on function public.prevent_jmu_delete() from public, anon, authenticated;
revoke execute on function public.prevent_jmu_update() from public, anon, authenticated;

-- ============================================================
-- RLS POLICIES
-- ============================================================
create policy "jmu_select_own" on public.job_material_usage
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

-- No INSERT/UPDATE/DELETE policies — managed only through SECURITY DEFINER functions
