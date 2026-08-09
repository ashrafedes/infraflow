-- InfraFlow Supplier Management Module
-- Tables: supplier_classifications, suppliers, material_suppliers
-- Many-to-many: materials <-> material_suppliers <-> suppliers
-- Preferred supplier enforcement via trigger
-- Cross-company link prevention via trigger
-- Company-scoped with RLS using existing helper architecture

-- ============================================================
-- SUPPLIER_CLASSIFICATIONS — company-scoped reference data
-- ============================================================
create table public.supplier_classifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        varchar(100) not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, name)
);

alter table public.supplier_classifications enable row level security;

-- ============================================================
-- SUPPLIERS — company-scoped supplier master
-- ============================================================
create table public.suppliers (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  code              varchar(100) not null,
  name              varchar(250) not null,
  legal_name        varchar(250),
  classification_id uuid references public.supplier_classifications(id) on delete set null,
  contact_person    varchar(200),
  email             varchar(320),
  phone             varchar(50),
  alternate_phone   varchar(50),
  website           varchar(500),
  address           text,
  city              varchar(100),
  country           varchar(100),
  tax_number        varchar(100),
  payment_terms     varchar(200),
  currency          varchar(3) not null default 'USD',
  notes             text,
  status            varchar(20) not null default 'ACTIVE',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (company_id, code),
  constraint suppliers_status_check check (status in ('ACTIVE', 'INACTIVE', 'BLOCKED'))
);

alter table public.suppliers enable row level security;

-- ============================================================
-- MATERIAL_SUPPLIERS — many-to-many relationship
-- A material can have multiple suppliers
-- A supplier can supply multiple materials
-- ============================================================
create table public.material_suppliers (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies(id) on delete cascade,
  material_id            uuid not null references public.materials(id) on delete cascade,
  supplier_id            uuid not null references public.suppliers(id) on delete restrict,
  supplier_sku           varchar(100),
  supplier_material_name varchar(250),
  unit_price             numeric(18,4) not null default 0,
  currency               varchar(3) not null default 'USD',
  minimum_order_quantity numeric(18,4) not null default 0,
  lead_time_days         integer not null default 0,
  is_preferred           boolean not null default false,
  is_active              boolean not null default true,
  notes                  text,
  effective_date         date not null default current_date,
  expiry_date            date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (company_id, material_id, supplier_id),
  constraint ms_unit_price_check check (unit_price >= 0),
  constraint ms_moq_check check (minimum_order_quantity >= 0),
  constraint ms_lead_time_check check (lead_time_days >= 0)
);

alter table public.material_suppliers enable row level security;

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_supplier_classifications_company on public.supplier_classifications(company_id);
create index idx_suppliers_company on public.suppliers(company_id);
create index idx_suppliers_code on public.suppliers(company_id, code);
create index idx_suppliers_name on public.suppliers(company_id, name);
create index idx_suppliers_status on public.suppliers(company_id, status);
create index idx_suppliers_classification on public.suppliers(classification_id);
create index idx_material_suppliers_company on public.material_suppliers(company_id);
create index idx_material_suppliers_material on public.material_suppliers(material_id);
create index idx_material_suppliers_supplier on public.material_suppliers(supplier_id);
create index idx_material_suppliers_active on public.material_suppliers(material_id, is_active);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
create trigger supplier_classifications_updated_at before update on public.supplier_classifications
  for each row execute function public.handle_updated_at();

create trigger suppliers_updated_at before update on public.suppliers
  for each row execute function public.handle_updated_at();

create trigger material_suppliers_updated_at before update on public.material_suppliers
  for each row execute function public.handle_updated_at();

-- ============================================================
-- HELPER: can user manage suppliers (admin only)?
-- ============================================================
create or replace function public.can_manage_suppliers(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_code text;
begin
  v_role_code := public.get_user_role_code(p_company_id);
  return v_role_code = 'company_admin';
end;
$$;

revoke execute on function public.can_manage_suppliers(uuid) from public, anon;
grant execute on function public.can_manage_suppliers(uuid) to authenticated;

-- ============================================================
-- TRIGGER: validate material_supplier company match
-- Ensures material.company_id = supplier.company_id = material_suppliers.company_id
-- ============================================================
create or replace function public.validate_material_supplier_company_match()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_material_company_id uuid;
  v_supplier_company_id uuid;
begin
  select company_id into v_material_company_id from materials where id = NEW.material_id;
  select company_id into v_supplier_company_id from suppliers where id = NEW.supplier_id;

  if v_material_company_id is null then
    raise exception 'Material not found';
  end if;

  if v_supplier_company_id is null then
    raise exception 'Supplier not found';
  end if;

  if v_material_company_id <> v_supplier_company_id then
    raise exception 'Material and supplier must belong to the same company';
  end if;

  if v_material_company_id <> NEW.company_id then
    raise exception 'material_suppliers.company_id must match material and supplier company_id';
  end if;

  return NEW;
end;
$$;

revoke execute on function public.validate_material_supplier_company_match() from public, anon, authenticated;

create trigger validate_ms_company_match
  before insert or update on public.material_suppliers
  for each row execute function public.validate_material_supplier_company_match();

-- ============================================================
-- TRIGGER: enforce single preferred supplier per material
-- A material cannot have more than one preferred supplier
-- ============================================================
create or replace function public.enforce_single_preferred_supplier()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_existing_count int;
begin
  if NEW.is_preferred = true then
    select count(*) into v_existing_count
    from material_suppliers
    where material_id = NEW.material_id
      and is_preferred = true
      and is_active = true
      and id <> NEW.id;

    if v_existing_count > 0 then
      raise exception 'A material can only have one preferred supplier. Remove preferred status from the existing preferred supplier first.';
    end if;
  end if;

  return NEW;
end;
$$;

revoke execute on function public.enforce_single_preferred_supplier() from public, anon, authenticated;

create trigger enforce_single_preferred
  before insert or update on public.material_suppliers
  for each row execute function public.enforce_single_preferred_supplier();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- SUPPLIER_CLASSIFICATIONS: tenant isolation
create policy "supplier_classifications_select_own" on public.supplier_classifications
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "supplier_classifications_insert_own" on public.supplier_classifications
  for insert to authenticated
  with check (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

create policy "supplier_classifications_update_own" on public.supplier_classifications
  for update to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

create policy "supplier_classifications_delete_own" on public.supplier_classifications
  for delete to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_materials(company_id));

-- SUPPLIERS: tenant isolation, admin-only writes
create policy "suppliers_select_own" on public.suppliers
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "suppliers_insert_own" on public.suppliers
  for insert to authenticated
  with check (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_suppliers(company_id));

create policy "suppliers_update_own" on public.suppliers
  for update to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_suppliers(company_id));

create policy "suppliers_delete_own" on public.suppliers
  for delete to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_suppliers(company_id));

-- MATERIAL_SUPPLIERS: tenant isolation, admin-only writes
create policy "material_suppliers_select_own" on public.material_suppliers
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

create policy "material_suppliers_insert_own" on public.material_suppliers
  for insert to authenticated
  with check (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_suppliers(company_id));

create policy "material_suppliers_update_own" on public.material_suppliers
  for update to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_suppliers(company_id));

create policy "material_suppliers_delete_own" on public.material_suppliers
  for delete to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())) and can_manage_suppliers(company_id));
