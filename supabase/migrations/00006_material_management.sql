-- InfraFlow Material Management Module
-- Tables: material_categories, units_of_measure, materials, warehouse_stock, stock_movements
-- Atomic stock operations via SECURITY DEFINER functions
-- Immutable stock movement ledger
-- Company-scoped with RLS using existing helper architecture

-- ============================================================
-- MATERIAL_CATEGORIES — company-scoped, database-driven
-- ============================================================
create table public.material_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        varchar(100) not null,
  parent_id   uuid references public.material_categories(id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, name)
);

alter table public.material_categories enable row level security;

-- ============================================================
-- UNITS_OF_MEASURE — company-scoped reference data
-- ============================================================
create table public.units_of_measure (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        varchar(50) not null,
  abbreviation varchar(20) not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, name)
);

alter table public.units_of_measure enable row level security;

-- ============================================================
-- MATERIALS — company-scoped, unique code within company
-- ============================================================
create table public.materials (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  code            varchar(100) not null,
  name            varchar(250) not null,
  description     text,
  category_id     uuid references public.material_categories(id) on delete set null,
  subcategory     varchar(100),
  unit_id         uuid references public.units_of_measure(id) on delete set null,
  brand           varchar(200),
  manufacturer    varchar(200),
  min_stock_level numeric(18,4) not null default 0,
  reorder_level   numeric(18,4) not null default 0,
  max_stock_level numeric(18,4) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (company_id, code)
);

alter table public.materials enable row level security;

-- ============================================================
-- WAREHOUSE_STOCK — current stock per material per warehouse
-- Derived from stock_movements ledger, maintained atomically
-- ============================================================
create table public.warehouse_stock (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  material_id   uuid not null references public.materials(id) on delete cascade,
  warehouse_id  uuid not null references public.warehouses(id) on delete cascade,
  quantity      numeric(18,4) not null default 0,
  reserved      numeric(18,4) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (material_id, warehouse_id)
);

alter table public.warehouse_stock enable row level security;

-- ============================================================
-- STOCK_MOVEMENTS — immutable audit ledger
-- Every inventory change creates a movement record
-- ============================================================
create table public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  material_id     uuid not null references public.materials(id) on delete restrict,
  warehouse_id    uuid not null references public.warehouses(id) on delete restrict,
  movement_type   varchar(30) not null,
  quantity        numeric(18,4) not null,
  unit_id         uuid references public.units_of_measure(id) on delete set null,
  reference       varchar(200),
  notes           text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  -- For transfers: link to the paired movement
  paired_movement_id uuid references public.stock_movements(id) on delete set null
);

alter table public.stock_movements enable row level security;

-- Prevent deletion of stock movements (immutable ledger)
create or replace function public.prevent_stock_movement_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Stock movements cannot be deleted (immutable audit ledger)';
end;
$$;

create trigger stock_movements_no_delete
  before delete on public.stock_movements
  for each row execute function public.prevent_stock_movement_delete();

-- Prevent direct update of stock_movements (except paired_movement_id by system)
create or replace function public.prevent_stock_movement_update()
returns trigger
language plpgsql
as $$
begin
  -- Only allow updating paired_movement_id (system operation)
  if NEW.id <> OLD.id
     or NEW.company_id <> OLD.company_id
     or NEW.material_id <> OLD.material_id
     or NEW.warehouse_id <> OLD.warehouse_id
     or NEW.movement_type <> OLD.movement_type
     or NEW.quantity <> OLD.quantity
     or NEW.unit_id IS DISTINCT FROM OLD.unit_id
     or NEW.reference IS DISTINCT FROM OLD.reference
     or NEW.notes IS DISTINCT FROM OLD.notes
     or NEW.created_by <> OLD.created_by
     or NEW.created_at <> OLD.created_at then
    raise exception 'Stock movements cannot be modified (immutable audit ledger)';
  end if;
  return NEW;
end;
$$;

create trigger stock_movements_no_update
  before update on public.stock_movements
  for each row execute function public.prevent_stock_movement_update();

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_material_categories_company on public.material_categories(company_id);
create index idx_units_of_measure_company on public.units_of_measure(company_id);
create index idx_materials_company on public.materials(company_id);
create index idx_materials_category on public.materials(category_id);
create index idx_warehouse_stock_material on public.warehouse_stock(material_id);
create index idx_warehouse_stock_warehouse on public.warehouse_stock(warehouse_id);
create index idx_warehouse_stock_company on public.warehouse_stock(company_id);
create index idx_stock_movements_material on public.stock_movements(material_id);
create index idx_stock_movements_warehouse on public.stock_movements(warehouse_id);
create index idx_stock_movements_company on public.stock_movements(company_id);
create index idx_stock_movements_created_at on public.stock_movements(created_at desc);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
create trigger material_categories_updated_at before update on public.material_categories
  for each row execute function public.handle_updated_at();

create trigger units_of_measure_updated_at before update on public.units_of_measure
  for each row execute function public.handle_updated_at();

create trigger materials_updated_at before update on public.materials
  for each row execute function public.handle_updated_at();

create trigger warehouse_stock_updated_at before update on public.warehouse_stock
  for each row execute function public.handle_updated_at();

-- ============================================================
-- HELPER: get user's role code for their company
-- ============================================================
create or replace function public.get_user_role_code(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_code text;
begin
  if auth.uid() is null then
    return null;
  end if;
  select r.code into v_role_code
  from user_roles ur
  join roles r on ur.role_id = r.id
  where ur.user_id = auth.uid()
    and ur.company_id = p_company_id;
  return v_role_code;
end;
$$;

revoke execute on function public.get_user_role_code(uuid) from public, anon;
grant execute on function public.get_user_role_code(uuid) to authenticated;

-- ============================================================
-- HELPER: can user perform stock operations?
-- ============================================================
create or replace function public.can_manage_stock(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_code text;
begin
  v_role_code := public.get_user_role_code(p_company_id);
  return v_role_code in ('company_admin', 'warehouse_manager', 'warehouse_user');
end;
$$;

revoke execute on function public.can_manage_stock(uuid) from public, anon;
grant execute on function public.can_manage_stock(uuid) to authenticated;

-- ============================================================
-- HELPER: can user manage materials (CRUD)?
-- ============================================================
create or replace function public.can_manage_materials(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_code text;
begin
  v_role_code := public.get_user_role_code(p_company_id);
  return v_role_code in ('company_admin', 'warehouse_manager');
end;
$$;

revoke execute on function public.can_manage_materials(uuid) from public, anon;
grant execute on function public.can_manage_materials(uuid) to authenticated;

-- ============================================================
-- STOCK OPERATION: Receive Material
-- ============================================================
create or replace function public.receive_stock(
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
  v_movement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  select company_id into v_company_id from materials where id = p_material_id;
  if v_company_id is null then
    raise exception 'Material not found';
  end if;

  if not can_manage_stock(v_company_id) then
    raise exception 'Unauthorized: insufficient permissions for stock operations';
  end if;

  -- Verify warehouse belongs to same company
  perform 1 from warehouses where id = p_warehouse_id and company_id = v_company_id;
  if not found then
    raise exception 'Warehouse not found or does not belong to your company';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select unit_id into v_unit_id from materials where id = p_material_id;

  -- Create movement
  insert into stock_movements (company_id, material_id, warehouse_id, movement_type, quantity, unit_id, reference, notes, created_by)
  values (v_company_id, p_material_id, p_warehouse_id, 'RECEIPT', p_quantity, v_unit_id, p_reference, p_notes, auth.uid())
  returning id into v_movement_id;

  -- Upsert warehouse_stock
  insert into warehouse_stock (company_id, material_id, warehouse_id, quantity)
  values (v_company_id, p_material_id, p_warehouse_id, p_quantity)
  on conflict (material_id, warehouse_id)
  do update set quantity = warehouse_stock.quantity + p_quantity, updated_at = now();

  return v_movement_id;
end;
$$;

-- ============================================================
-- STOCK OPERATION: Issue Material
-- ============================================================
create or replace function public.issue_stock(
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
  v_movement_id uuid;
  v_available numeric;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  select company_id into v_company_id from materials where id = p_material_id;
  if v_company_id is null then
    raise exception 'Material not found';
  end if;

  if not can_manage_stock(v_company_id) then
    raise exception 'Unauthorized: insufficient permissions for stock operations';
  end if;

  perform 1 from warehouses where id = p_warehouse_id and company_id = v_company_id;
  if not found then
    raise exception 'Warehouse not found or does not belong to your company';
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

  insert into stock_movements (company_id, material_id, warehouse_id, movement_type, quantity, unit_id, reference, notes, created_by)
  values (v_company_id, p_material_id, p_warehouse_id, 'ISSUE', p_quantity, v_unit_id, p_reference, p_notes, auth.uid())
  returning id into v_movement_id;

  update warehouse_stock set quantity = quantity - p_quantity, updated_at = now()
  where material_id = p_material_id and warehouse_id = p_warehouse_id;

  return v_movement_id;
end;
$$;

-- ============================================================
-- STOCK OPERATION: Transfer Material (atomic)
-- ============================================================
create or replace function public.transfer_stock(
  p_material_id uuid,
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
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
  v_out_id uuid;
  v_in_id uuid;
  v_available numeric;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  select company_id into v_company_id from materials where id = p_material_id;
  if v_company_id is null then
    raise exception 'Material not found';
  end if;

  if not can_manage_stock(v_company_id) then
    raise exception 'Unauthorized: insufficient permissions for stock operations';
  end if;

  -- Both warehouses must belong to same company
  perform 1 from warehouses where id = p_from_warehouse_id and company_id = v_company_id;
  if not found then
    raise exception 'Source warehouse not found or does not belong to your company';
  end if;

  perform 1 from warehouses where id = p_to_warehouse_id and company_id = v_company_id;
  if not found then
    raise exception 'Destination warehouse not found or does not belong to your company';
  end if;

  if p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'Cannot transfer to the same warehouse';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  -- Check available stock at source
  select coalesce(quantity, 0) - coalesce(reserved, 0) into v_available
  from warehouse_stock
  where material_id = p_material_id and warehouse_id = p_from_warehouse_id;

  if v_available is null then v_available := 0; end if;

  if p_quantity > v_available then
    raise exception 'Insufficient available stock at source. Available: %, Requested: %', v_available, p_quantity;
  end if;

  select unit_id into v_unit_id from materials where id = p_material_id;

  -- Create TRANSFER_OUT movement
  insert into stock_movements (company_id, material_id, warehouse_id, movement_type, quantity, unit_id, reference, notes, created_by)
  values (v_company_id, p_material_id, p_from_warehouse_id, 'TRANSFER_OUT', p_quantity, v_unit_id, p_reference, p_notes, auth.uid())
  returning id into v_out_id;

  -- Deduct from source
  update warehouse_stock set quantity = quantity - p_quantity, updated_at = now()
  where material_id = p_material_id and warehouse_id = p_from_warehouse_id;

  -- Create TRANSFER_IN movement
  insert into stock_movements (company_id, material_id, warehouse_id, movement_type, quantity, unit_id, reference, notes, created_by, paired_movement_id)
  values (v_company_id, p_material_id, p_to_warehouse_id, 'TRANSFER_IN', p_quantity, v_unit_id, p_reference, p_notes, auth.uid(), v_out_id)
  returning id into v_in_id;

  -- Add to destination
  insert into warehouse_stock (company_id, material_id, warehouse_id, quantity)
  values (v_company_id, p_material_id, p_to_warehouse_id, p_quantity)
  on conflict (material_id, warehouse_id)
  do update set quantity = warehouse_stock.quantity + p_quantity, updated_at = now();

  -- Link the out movement to the in movement
  update stock_movements set paired_movement_id = v_in_id where id = v_out_id;

  return v_out_id;
end;
$$;

-- ============================================================
-- STOCK OPERATION: Adjust Stock (in or out)
-- ============================================================
create or replace function public.adjust_stock(
  p_material_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric,
  p_adjustment_type text,
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
  v_movement_id uuid;
  v_movement_type text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  select company_id into v_company_id from materials where id = p_material_id;
  if v_company_id is null then
    raise exception 'Material not found';
  end if;

  if not can_manage_stock(v_company_id) then
    raise exception 'Unauthorized: insufficient permissions for stock operations';
  end if;

  perform 1 from warehouses where id = p_warehouse_id and company_id = v_company_id;
  if not found then
    raise exception 'Warehouse not found or does not belong to your company';
  end if;

  if p_quantity = 0 then
    raise exception 'Adjustment quantity cannot be zero';
  end if;

  if p_adjustment_type = 'IN' then
    v_movement_type := 'ADJUSTMENT_IN';
  elsif p_adjustment_type = 'OUT' then
    v_movement_type := 'ADJUSTMENT_OUT';
    -- Check stock for adjustment out
    declare
      v_current numeric;
    begin
      select coalesce(quantity, 0) into v_current
      from warehouse_stock
      where material_id = p_material_id and warehouse_id = p_warehouse_id;
      if v_current is null then v_current := 0; end if;
      if p_quantity > v_current then
        raise exception 'Cannot adjust out more than current stock. Current: %, Adjustment: %', v_current, p_quantity;
      end if;
    end;
  else
    raise exception 'Invalid adjustment type. Use IN or OUT';
  end if;

  select unit_id into v_unit_id from materials where id = p_material_id;

  insert into stock_movements (company_id, material_id, warehouse_id, movement_type, quantity, unit_id, reference, notes, created_by)
  values (v_company_id, p_material_id, p_warehouse_id, v_movement_type, p_quantity, v_unit_id, p_reference, p_notes, auth.uid())
  returning id into v_movement_id;

  if p_adjustment_type = 'IN' then
    insert into warehouse_stock (company_id, material_id, warehouse_id, quantity)
    values (v_company_id, p_material_id, p_warehouse_id, p_quantity)
    on conflict (material_id, warehouse_id)
    do update set quantity = warehouse_stock.quantity + p_quantity, updated_at = now();
  else
    update warehouse_stock set quantity = quantity - p_quantity, updated_at = now()
    where material_id = p_material_id and warehouse_id = p_warehouse_id;
  end if;

  return v_movement_id;
end;
$$;

-- ============================================================
-- STOCK OPERATION: Return Material
-- ============================================================
create or replace function public.return_stock(
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
  v_movement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  select company_id into v_company_id from materials where id = p_material_id;
  if v_company_id is null then
    raise exception 'Material not found';
  end if;

  if not can_manage_stock(v_company_id) then
    raise exception 'Unauthorized: insufficient permissions for stock operations';
  end if;

  perform 1 from warehouses where id = p_warehouse_id and company_id = v_company_id;
  if not found then
    raise exception 'Warehouse not found or does not belong to your company';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select unit_id into v_unit_id from materials where id = p_material_id;

  insert into stock_movements (company_id, material_id, warehouse_id, movement_type, quantity, unit_id, reference, notes, created_by)
  values (v_company_id, p_material_id, p_warehouse_id, 'RETURN', p_quantity, v_unit_id, p_reference, p_notes, auth.uid())
  returning id into v_movement_id;

  insert into warehouse_stock (company_id, material_id, warehouse_id, quantity)
  values (v_company_id, p_material_id, p_warehouse_id, p_quantity)
  on conflict (material_id, warehouse_id)
  do update set quantity = warehouse_stock.quantity + p_quantity, updated_at = now();

  return v_movement_id;
end;
$$;

-- ============================================================
-- RESTRICT EXECUTE PRIVILEGES ON STOCK FUNCTIONS
-- ============================================================
revoke execute on function public.receive_stock(uuid, uuid, numeric, text, text) from public, anon;
grant execute on function public.receive_stock(uuid, uuid, numeric, text, text) to authenticated;

revoke execute on function public.issue_stock(uuid, uuid, numeric, text, text) from public, anon;
grant execute on function public.issue_stock(uuid, uuid, numeric, text, text) to authenticated;

revoke execute on function public.transfer_stock(uuid, uuid, uuid, numeric, text, text) from public, anon;
grant execute on function public.transfer_stock(uuid, uuid, uuid, numeric, text, text) to authenticated;

revoke execute on function public.adjust_stock(uuid, uuid, numeric, text, text, text) from public, anon;
grant execute on function public.adjust_stock(uuid, uuid, numeric, text, text, text) to authenticated;

revoke execute on function public.return_stock(uuid, uuid, numeric, text, text) from public, anon;
grant execute on function public.return_stock(uuid, uuid, numeric, text, text) to authenticated;

-- Trigger functions: not callable via RPC
revoke execute on function public.prevent_stock_movement_delete() from public, anon, authenticated;
revoke execute on function public.prevent_stock_movement_update() from public, anon, authenticated;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- MATERIAL_CATEGORIES: tenant isolation
create policy "material_categories_select_own" on public.material_categories
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "material_categories_insert_own" on public.material_categories
  for insert to authenticated
  with check (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

create policy "material_categories_update_own" on public.material_categories
  for update to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

create policy "material_categories_delete_own" on public.material_categories
  for delete to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

-- UNITS_OF_MEASURE: tenant isolation
create policy "units_of_measure_select_own" on public.units_of_measure
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "units_of_measure_insert_own" on public.units_of_measure
  for insert to authenticated
  with check (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

create policy "units_of_measure_update_own" on public.units_of_measure
  for update to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

create policy "units_of_measure_delete_own" on public.units_of_measure
  for delete to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

-- MATERIALS: tenant isolation
create policy "materials_select_own" on public.materials
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "materials_insert_own" on public.materials
  for insert to authenticated
  with check (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

create policy "materials_update_own" on public.materials
  for update to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

create policy "materials_delete_own" on public.materials
  for delete to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and is_company_admin(company_id));

-- WAREHOUSE_STOCK: tenant isolation, read for all company users, no direct write (managed via functions)
create policy "warehouse_stock_select_own" on public.warehouse_stock
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

-- No INSERT/UPDATE/DELETE policies — stock is managed only through SECURITY DEFINER functions
-- The functions run as definer, bypassing RLS

-- STOCK_MOVEMENTS: tenant isolation, read for all company users, no direct write/delete
create policy "stock_movements_select_own" on public.stock_movements
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

-- No INSERT/UPDATE/DELETE policies — movements are created only through SECURITY DEFINER functions
