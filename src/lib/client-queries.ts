import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  Company,
  CompanyWithRole,
  Job,
  JobWithProject,
  JobMaterialRequirement,
  JobMaterialRequirementWithDetails,
  JobMaterialUsage,
  Material,
  MaterialCategory,
  MaterialSupplier,
  MaterialSupplierWithDetails,
  MaterialWithDetails,
  Profile,
  Project,
  Role,
  StockMovement,
  Supplier,
  SupplierClassification,
  SupplierWithDetails,
  UnitOfMeasure,
  UserWithRole,
  Warehouse,
  WarehouseStock,
} from "@/types/database";

export interface ProjectWithCounts extends Project {
  job_count: number;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as unknown as Profile | null;
}

export async function getUserCompanies(): Promise<CompanyWithRole[]> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_roles")
    .select(
      `
      company:companies(*),
      role:roles(name)
    `
    )
    .eq("user_id", user.id);

  if (!data) return [];

  return data.map((item: Record<string, unknown>) => ({
    ...(item.company as Company),
    role_name: (item.role as unknown as Role).name,
  }));
}

export async function getProjects(
  companyId: string
): Promise<ProjectWithCounts[]> {
  const supabase = getSupabaseClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (!projects) return [];

  const typedProjects = projects as unknown as Project[];
  const projectIds = typedProjects.map((p) => p.id);

  if (projectIds.length === 0) {
    return typedProjects.map((p) => ({ ...p, job_count: 0 }));
  }

  const { data: jobCounts } = await supabase
    .from("jobs")
    .select("project_id")
    .in("project_id", projectIds);

  const countMap = new Map<string, number>();
  (jobCounts as unknown as { project_id: string }[] | null)?.forEach((j) => {
    const current = countMap.get(j.project_id) ?? 0;
    countMap.set(j.project_id, current + 1);
  });

  return typedProjects.map((p: Project) => ({
    ...p,
    job_count: countMap.get(p.id) ?? 0,
  }));
}

export async function getProjectById(
  companyId: string,
  projectId: string
): Promise<Project | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", projectId)
    .single();
  return data as unknown as Project | null;
}

export async function getJobs(companyId: string): Promise<JobWithProject[]> {
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from("jobs")
    .select(
      `
      *,
      project:projects(name, code)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return (data as unknown as Record<string, unknown>[]).map((item) => {
    const project = item.project as { name: string; code: string };
    return {
      ...(item as unknown as Job),
      project_name: project.name,
      project_code: project.code,
    };
  });
}

export async function getJobsByProject(
  companyId: string,
  projectId: string
): Promise<Job[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data as unknown as Job[]) ?? [];
}

export async function getJobById(
  companyId: string,
  jobId: string
): Promise<JobWithProject | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("jobs")
    .select(
      `
      *,
      project:projects(name, code)
    `
    )
    .eq("company_id", companyId)
    .eq("id", jobId)
    .single();

  if (!data) return null;

  const item = data as unknown as Record<string, unknown>;
  const project = item.project as { name: string; code: string };
  return {
    ...(item as unknown as Job),
    project_name: project.name,
    project_code: project.code,
  };
}

export async function getWarehouses(
  companyId: string
): Promise<Warehouse[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("warehouses")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return (data as unknown as Warehouse[]) ?? [];
}

export async function getWarehouseById(
  companyId: string,
  warehouseId: string
): Promise<Warehouse | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("warehouses")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", warehouseId)
    .single();
  return data as unknown as Warehouse | null;
}

// ============================================================
// USER MANAGEMENT QUERIES
// ============================================================

export async function getCompanyUsers(
  companyId: string
): Promise<UserWithRole[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("user_roles")
    .select(
      `
      user_id,
      role_id,
      company_id,
      profile:profiles(id, full_name, email, is_active, company_id, created_at, updated_at),
      role:roles(id, name, code)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return (data as unknown as Record<string, unknown>[]).map((item) => {
    const profile = item.profile as Record<string, unknown>;
    const role = item.role as Record<string, unknown>;
    return {
      id: profile.id as string,
      full_name: profile.full_name as string | null,
      email: profile.email as string | null,
      is_active: profile.is_active as boolean,
      company_id: profile.company_id as string | null,
      created_at: profile.created_at as string,
      updated_at: profile.updated_at as string,
      role_id: role.id as string,
      role_name: role.name as string,
      role_code: role.code as string,
    };
  });
}

export async function inviteUser(params: {
  full_name: string;
  email: string;
  role_code: string;
  is_active: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    return { success: false, error: "Authentication session not found." };
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-user`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify(params),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    return { success: false, error: result.error || "Failed to invite user." };
  }
  return { success: true };
}

export async function updateUserRoleRpc(
  userId: string,
  roleCode: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("update_user_role", {
    p_user_id: userId,
    p_role_code: roleCode,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function setUserActiveStatusRpc(
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("set_user_active_status", {
    p_user_id: userId,
    p_is_active: isActive,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeUserFromCompanyRpc(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("remove_user_from_company", {
    p_user_id: userId,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================
// MATERIAL MANAGEMENT QUERIES
// ============================================================

// --- Categories ---

export async function getMaterialCategories(
  companyId: string
): Promise<MaterialCategory[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("material_categories")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name", { ascending: true });
  return (data as unknown as MaterialCategory[]) ?? [];
}

export async function createMaterialCategory(
  companyId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("material_categories")
    .insert({ company_id: companyId, name });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// --- Units of Measure ---

export async function getUnitsOfMeasure(
  companyId: string
): Promise<UnitOfMeasure[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("units_of_measure")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name", { ascending: true });
  return (data as unknown as UnitOfMeasure[]) ?? [];
}

// --- Materials ---

export async function getMaterials(
  companyId: string
): Promise<MaterialWithDetails[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("materials")
    .select(
      `
      *,
      category:material_categories(name),
      unit:units_of_measure(name, abbreviation),
      stock:warehouse_stock(quantity)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return (data as unknown as Record<string, unknown>[]).map((item) => {
    const category = item.category as { name: string } | null;
    const unit = item.unit as { name: string; abbreviation: string } | null;
    const stockRows = item.stock as { quantity: number }[] | null;
    const totalStock = stockRows
      ? stockRows.reduce((sum, s) => sum + Number(s.quantity), 0)
      : 0;
    return {
      ...(item as unknown as Material),
      category_name: category?.name ?? null,
      unit_name: unit?.name ?? null,
      unit_abbreviation: unit?.abbreviation ?? null,
      total_stock: totalStock,
    };
  });
}

export async function getMaterialById(
  companyId: string,
  materialId: string
): Promise<MaterialWithDetails | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("materials")
    .select(
      `
      *,
      category:material_categories(name),
      unit:units_of_measure(name, abbreviation)
    `
    )
    .eq("company_id", companyId)
    .eq("id", materialId)
    .single();

  if (!data) return null;

  const item = data as unknown as Record<string, unknown>;
  const category = item.category as { name: string } | null;
  const unit = item.unit as { name: string; abbreviation: string } | null;
  return {
    ...(item as unknown as Material),
    category_name: category?.name ?? null,
    unit_name: unit?.name ?? null,
    unit_abbreviation: unit?.abbreviation ?? null,
  };
}

export async function createMaterial(
  material: Omit<Material, "id" | "created_at" | "updated_at">
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("materials").insert(material);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateMaterial(
  materialId: string,
  updates: Partial<Omit<Material, "id" | "company_id" | "created_at" | "updated_at">>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("materials")
    .update(updates)
    .eq("id", materialId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// --- Warehouse Stock ---

export async function getWarehouseStockByMaterial(
  companyId: string,
  materialId: string
): Promise<WarehouseStock[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("warehouse_stock")
    .select(
      `
      *,
      warehouse:warehouses(name, code)
    `
    )
    .eq("company_id", companyId)
    .eq("material_id", materialId)
    .order("updated_at", { ascending: false });

  if (!data) return [];

  return (data as unknown as Record<string, unknown>[]).map((item) => {
    const warehouse = item.warehouse as { name: string; code: string } | null;
    return {
      ...(item as unknown as WarehouseStock),
      warehouse_name: warehouse?.name ?? null,
      warehouse_code: warehouse?.code ?? null,
    };
  });
}

// --- Stock Movements ---

export async function getStockMovements(
  companyId: string,
  limit?: number
): Promise<StockMovement[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("stock_movements")
    .select(
      `
      *,
      material:materials(name, code),
      warehouse:warehouses(name, code),
      creator:profiles(full_name)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data } = await query;

  if (!data) return [];

  return (data as unknown as Record<string, unknown>[]).map((item) => {
    const material = item.material as { name: string; code: string } | null;
    const warehouse = item.warehouse as { name: string; code: string } | null;
    const creator = item.creator as { full_name: string | null } | null;
    return {
      ...(item as unknown as StockMovement),
      material_name: material?.name ?? null,
      material_code: material?.code ?? null,
      warehouse_name: warehouse?.name ?? null,
      warehouse_code: warehouse?.code ?? null,
      user_name: creator?.full_name ?? null,
    };
  });
}

export async function getStockMovementsByMaterial(
  companyId: string,
  materialId: string,
  limit?: number
): Promise<StockMovement[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("stock_movements")
    .select(
      `
      *,
      material:materials(name, code),
      warehouse:warehouses(name, code),
      creator:profiles(full_name)
    `
    )
    .eq("company_id", companyId)
    .eq("material_id", materialId)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data } = await query;

  if (!data) return [];

  return (data as unknown as Record<string, unknown>[]).map((item) => {
    const material = item.material as { name: string; code: string } | null;
    const warehouse = item.warehouse as { name: string; code: string } | null;
    const creator = item.creator as { full_name: string | null } | null;
    return {
      ...(item as unknown as StockMovement),
      material_name: material?.name ?? null,
      material_code: material?.code ?? null,
      warehouse_name: warehouse?.name ?? null,
      warehouse_code: warehouse?.code ?? null,
      user_name: creator?.full_name ?? null,
    };
  });
}

// --- Stock Operations (RPC) ---

export async function receiveStockRpc(params: {
  materialId: string;
  warehouseId: string;
  quantity: number;
  reference?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("receive_stock", {
    p_material_id: params.materialId,
    p_warehouse_id: params.warehouseId,
    p_quantity: params.quantity,
    p_reference: params.reference ?? null,
    p_notes: params.notes ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function issueStockRpc(params: {
  materialId: string;
  warehouseId: string;
  quantity: number;
  reference?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("issue_stock", {
    p_material_id: params.materialId,
    p_warehouse_id: params.warehouseId,
    p_quantity: params.quantity,
    p_reference: params.reference ?? null,
    p_notes: params.notes ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function transferStockRpc(params: {
  materialId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reference?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("transfer_stock", {
    p_material_id: params.materialId,
    p_from_warehouse_id: params.fromWarehouseId,
    p_to_warehouse_id: params.toWarehouseId,
    p_quantity: params.quantity,
    p_reference: params.reference ?? null,
    p_notes: params.notes ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function adjustStockRpc(params: {
  materialId: string;
  warehouseId: string;
  quantity: number;
  adjustmentType: string;
  reference?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("adjust_stock", {
    p_material_id: params.materialId,
    p_warehouse_id: params.warehouseId,
    p_quantity: params.quantity,
    p_adjustment_type: params.adjustmentType,
    p_reference: params.reference ?? null,
    p_notes: params.notes ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function returnStockRpc(params: {
  materialId: string;
  warehouseId: string;
  quantity: number;
  reference?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("return_stock", {
    p_material_id: params.materialId,
    p_warehouse_id: params.warehouseId,
    p_quantity: params.quantity,
    p_reference: params.reference ?? null,
    p_notes: params.notes ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================
// SUPPLIER MANAGEMENT QUERIES
// ============================================================

export async function getSupplierClassifications(
  companyId: string
): Promise<SupplierClassification[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("supplier_classifications")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  return (data ?? []) as unknown as SupplierClassification[];
}

export async function createSupplierClassification(
  companyId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("supplier_classifications")
    .insert({ company_id: companyId, name });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getSuppliers(
  companyId: string
): Promise<SupplierWithDetails[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("suppliers")
    .select(
      `*,
      classification:supplier_classifications(name),
      material_suppliers!material_suppliers_supplier_id_fkey(count)`
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((s: any) => ({
    ...s,
    classification_name: s.classification?.name ?? null,
    material_count: s.material_suppliers?.[0]?.count ?? 0,
  })) as unknown as SupplierWithDetails[];
}

export async function getSupplierById(
  companyId: string,
  supplierId: string
): Promise<Supplier | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", supplierId)
    .single();
  return data as unknown as Supplier | null;
}

export async function createSupplier(
  supplier: Omit<Supplier, "id" | "created_at" | "updated_at">
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("suppliers").insert(supplier);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateSupplier(
  supplierId: string,
  updates: Partial<Omit<Supplier, "id" | "company_id" | "created_at" | "updated_at">>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("suppliers")
    .update(updates)
    .eq("id", supplierId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getMaterialSuppliersByMaterial(
  materialId: string
): Promise<MaterialSupplierWithDetails[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("material_suppliers")
    .select(
      `*,
      supplier:suppliers!material_suppliers_supplier_id_fkey(code, name)`
    )
    .eq("material_id", materialId)
    .order("is_preferred", { ascending: false });
  return (data ?? []).map((ms: any) => ({
    ...ms,
    supplier_code: ms.supplier?.code ?? null,
    supplier_name: ms.supplier?.name ?? null,
    material_code: null,
    material_name: null,
    category_name: null,
    unit_name: null,
    unit_abbreviation: null,
  })) as unknown as MaterialSupplierWithDetails[];
}

export async function getMaterialSuppliersBySupplier(
  supplierId: string
): Promise<MaterialSupplierWithDetails[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("material_suppliers")
    .select(
      `*,
      supplier:suppliers!material_suppliers_supplier_id_fkey(code, name),
      material:materials!material_suppliers_material_id_fkey(code, name)`
    )
    .eq("supplier_id", supplierId)
    .order("is_preferred", { ascending: false });
  return (data ?? []).map((ms: any) => ({
    ...ms,
    supplier_code: ms.supplier?.code ?? null,
    supplier_name: ms.supplier?.name ?? null,
    material_code: ms.material?.code ?? null,
    material_name: ms.material?.name ?? null,
    category_name: null,
    unit_name: null,
    unit_abbreviation: null,
  })) as unknown as MaterialSupplierWithDetails[];
}

export async function addMaterialSupplier(
  ms: Omit<MaterialSupplier, "id" | "created_at" | "updated_at">
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("material_suppliers").insert(ms);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateMaterialSupplier(
  msId: string,
  updates: Partial<Omit<MaterialSupplier, "id" | "company_id" | "material_id" | "supplier_id" | "created_at" | "updated_at">>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("material_suppliers")
    .update(updates)
    .eq("id", msId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeMaterialSupplier(
  msId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("material_suppliers")
    .delete()
    .eq("id", msId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================
// JOB MATERIAL REQUIREMENTS QUERIES
// ============================================================

export async function getJobMaterialRequirements(
  jobId: string
): Promise<JobMaterialRequirementWithDetails[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("job_material_requirements")
    .select(
      `*,
      material:materials!job_material_requirements_material_id_fkey(code, name, unit_id),
      unit:units_of_measure!job_material_requirements_unit_id_fkey(name, abbreviation)`
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    ...r,
    material_code: r.material?.code ?? null,
    material_name: r.material?.name ?? null,
    unit_name: r.unit?.name ?? null,
    unit_abbreviation: r.unit?.abbreviation ?? null,
  })) as unknown as JobMaterialRequirementWithDetails[];
}

export async function createJobMaterialRequirement(
  req: Omit<JobMaterialRequirement, "id" | "created_at" | "updated_at">
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("job_material_requirements")
    .insert(req);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteJobMaterialRequirement(
  reqId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("job_material_requirements")
    .delete()
    .eq("id", reqId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================
// JOB MATERIAL USAGE QUERIES
// ============================================================

export async function getJobMaterialUsage(
  jobId: string
): Promise<JobMaterialUsage[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("job_material_usage")
    .select(
      `*,
      material:materials!job_material_usage_material_id_fkey(code, name),
      warehouse:warehouses!job_material_usage_warehouse_id_fkey(code, name),
      performer:profiles!job_material_usage_performed_by_fkey(full_name)`
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((u: any) => ({
    ...u,
    material_name: u.material?.name ?? null,
    material_code: u.material?.code ?? null,
    warehouse_name: u.warehouse?.name ?? null,
    warehouse_code: u.warehouse?.code ?? null,
    user_name: u.performer?.full_name ?? null,
  })) as unknown as JobMaterialUsage[];
}

export async function issueMaterialToJobRpc(params: {
  p_job_id: string;
  p_material_id: string;
  p_warehouse_id: string;
  p_quantity: number;
  p_reference: string | null;
  p_notes: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("issue_material_to_job", params);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function recordJobMaterialUsageRpc(params: {
  p_job_id: string;
  p_material_id: string;
  p_warehouse_id: string;
  p_usage_type: string;
  p_quantity: number;
  p_reference: string | null;
  p_notes: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("record_job_material_usage", params);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
