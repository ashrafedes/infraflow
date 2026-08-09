-- InfraFlow User Management Module
-- Adds RLS policies for company-wide profile visibility
-- Adds SECURITY DEFINER functions for user management operations
-- All functions verify auth.uid() and is_company_admin() internally

-- ============================================================
-- 1. ADDITIONAL RLS POLICIES
-- ============================================================

-- Allow users to see all profiles in their company (for Users & Roles list)
create policy "profiles_select_company" on public.profiles
  for select to authenticated
  using (company_id in (select * from get_user_company_ids(auth.uid())));

-- Allow company admins to update profiles in their company (except company_id, protected by trigger)
create policy "profiles_update_company_admin" on public.profiles
  for update to authenticated
  using (
    company_id in (select * from get_user_company_ids(auth.uid()))
    and is_company_admin(company_id)
  );

-- Allow company admins to update user_roles in their company (for role changes)
create policy "user_roles_update_company_admin" on public.user_roles
  for update to authenticated
  using (is_company_admin(company_id))
  with check (is_company_admin(company_id));

-- ============================================================
-- 2. SECURITY DEFINER FUNCTIONS FOR USER MANAGEMENT
-- ============================================================

-- Invite a user to the company: sets profile company_id, email, is_active, and assigns role
-- Called by the invite-user Edge Function after creating the auth user
create or replace function public.invite_company_user(
  p_user_id uuid,
  p_company_id uuid,
  p_full_name text,
  p_email text,
  p_role_code text,
  p_is_active boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_existing_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  if not is_company_admin(p_company_id) then
    raise exception 'Unauthorized: not a company admin';
  end if;

  -- Prevent assigning company_admin through this function
  if p_role_code = 'company_admin' then
    raise exception 'Cannot assign Company Admin role through invite';
  end if;

  -- Verify target user doesn't already have a company
  select company_id into v_existing_company_id from profiles where id = p_user_id;
  if v_existing_company_id is not null then
    raise exception 'User already belongs to a company';
  end if;

  -- Get role id
  select id into v_role_id from roles where code = p_role_code;
  if not found then
    raise exception 'Invalid role code: %', p_role_code;
  end if;

  -- Update profile with company info (set onboarding_active to bypass protect trigger)
  set local app.onboarding_active = 'on';
  update profiles set
    company_id = p_company_id,
    full_name = p_full_name,
    email = p_email,
    is_active = p_is_active
  where id = p_user_id;

  -- Assign role
  insert into user_roles (user_id, company_id, role_id)
  values (p_user_id, p_company_id, v_role_id);
end;
$$;

-- Change a user's role within the company
create or replace function public.update_user_role(
  p_user_id uuid,
  p_role_code text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  -- Get target user's company
  select company_id into v_company_id from profiles where id = p_user_id;
  if v_company_id is null then
    raise exception 'User has no company';
  end if;

  -- Verify caller is admin of the same company
  if not is_company_admin(v_company_id) then
    raise exception 'Unauthorized: not a company admin';
  end if;

  -- Prevent self-promotion to company_admin
  if p_user_id = auth.uid() and p_role_code = 'company_admin' then
    raise exception 'Cannot assign Company Admin to yourself';
  end if;

  select id into v_role_id from roles where code = p_role_code;
  if not found then
    raise exception 'Invalid role code: %', p_role_code;
  end if;

  update user_roles set role_id = v_role_id where user_id = p_user_id;
end;
$$;

-- Activate or deactivate a user
create or replace function public.set_user_active_status(
  p_user_id uuid,
  p_is_active boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  select company_id into v_company_id from profiles where id = p_user_id;
  if v_company_id is null then
    raise exception 'User has no company';
  end if;

  if not is_company_admin(v_company_id) then
    raise exception 'Unauthorized: not a company admin';
  end if;

  -- Prevent deactivating last active company_admin
  if p_is_active = false then
    if exists (
      select 1 from user_roles ur
      join roles r on ur.role_id = r.id
      where ur.user_id = p_user_id
        and ur.company_id = v_company_id
        and r.code = 'company_admin'
    ) and not exists (
      select 1 from user_roles ur
      join roles r on ur.role_id = r.id
      join profiles p on ur.user_id = p.id
      where ur.company_id = v_company_id
        and r.code = 'company_admin'
        and p.is_active = true
        and p.id <> p_user_id
    ) then
      raise exception 'Cannot deactivate the last active Company Admin';
    end if;
  end if;

  update profiles set is_active = p_is_active where id = p_user_id;
end;
$$;

-- Remove a user from the company (revokes role, clears company_id)
create or replace function public.remove_user_from_company(
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  select company_id into v_company_id from profiles where id = p_user_id;
  if v_company_id is null then
    raise exception 'User has no company';
  end if;

  if not is_company_admin(v_company_id) then
    raise exception 'Unauthorized: not a company admin';
  end if;

  -- Prevent removing last active company_admin
  if exists (
    select 1 from user_roles ur
    join roles r on ur.role_id = r.id
    where ur.user_id = p_user_id
      and ur.company_id = v_company_id
      and r.code = 'company_admin'
  ) and not exists (
    select 1 from user_roles ur
    join roles r on ur.role_id = r.id
    join profiles p on ur.user_id = p.id
    where ur.company_id = v_company_id
      and r.code = 'company_admin'
      and p.is_active = true
      and p.id <> p_user_id
  ) then
    raise exception 'Cannot remove the last active Company Admin';
  end if;

  -- Remove role assignment
  delete from user_roles where user_id = p_user_id;

  -- Clear company association
  set local app.onboarding_active = 'on';
  update profiles set company_id = null, is_active = false where id = p_user_id;
end;
$$;

-- ============================================================
-- 3. RESTRICT EXECUTE PRIVILEGES
-- ============================================================
revoke execute on function public.invite_company_user(uuid, uuid, text, text, text, boolean) from public, anon;
grant execute on function public.invite_company_user(uuid, uuid, text, text, text, boolean) to authenticated;

revoke execute on function public.update_user_role(uuid, text) from public, anon;
grant execute on function public.update_user_role(uuid, text) to authenticated;

revoke execute on function public.set_user_active_status(uuid, boolean) from public, anon;
grant execute on function public.set_user_active_status(uuid, boolean) to authenticated;

revoke execute on function public.remove_user_from_company(uuid) from public, anon;
grant execute on function public.remove_user_from_company(uuid) to authenticated;
