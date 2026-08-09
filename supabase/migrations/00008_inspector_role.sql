-- InfraFlow Inspector Role
-- Adds the 'inspector' role to the roles table
-- Inspector has read-only access to projects, jobs, warehouses, materials,
-- inventory movements, suppliers, and material usage per job.
-- Inspector CANNOT: modify material master, manage suppliers, manage users,
-- change roles, directly alter stock, or create inventory adjustments.
-- Existing RLS policies already enforce this because can_manage_stock()
-- and can_manage_materials() only allow company_admin and warehouse_manager.

-- ============================================================
-- ADD INSPECTOR ROLE
-- ============================================================
insert into public.roles (name, code, description)
values ('Inspector', 'inspector', 'Read-only access to projects, jobs, materials, inventory, and material usage. Cannot modify master data or stock.')
on conflict (name) do nothing;
