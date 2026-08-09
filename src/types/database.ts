export interface Company {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  company_id: string;
  role_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  project_id: string;
  code: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  company_id: string;
  code: string;
  name: string;
  location: string | null;
  manager_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyWithRole extends Company {
  role_name: string;
}

export interface ProjectWithCounts extends Project {
  job_count: number;
}

export interface JobWithProject extends Job {
  project_name: string;
  project_code: string;
}

export interface UserWithRole {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  role_id: string;
  role_name: string;
  role_code: string;
}

export const ROLE_CODES = [
  "warehouse_manager",
  "warehouse_user",
  "project_manager",
  "inspector",
  "viewer",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  company_admin: "Company Admin",
  warehouse_manager: "Warehouse Manager",
  warehouse_user: "Warehouse User",
  project_manager: "Project Manager",
  inspector: "Inspector",
  viewer: "Viewer",
};

// ============================================================
// MATERIAL MANAGEMENT TYPES
// ============================================================

export interface MaterialCategory {
  id: string;
  company_id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitOfMeasure {
  id: string;
  company_id: string;
  name: string;
  abbreviation: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  category_id: string | null;
  subcategory: string | null;
  unit_id: string | null;
  brand: string | null;
  manufacturer: string | null;
  min_stock_level: number;
  reorder_level: number;
  max_stock_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialWithDetails extends Material {
  category_name: string | null;
  unit_name: string | null;
  unit_abbreviation: string | null;
  total_stock?: number;
}

export interface WarehouseStock {
  id: string;
  company_id: string;
  material_id: string;
  warehouse_id: string;
  quantity: number;
  reserved: number;
  created_at: string;
  updated_at: string;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
}

export interface StockMovement {
  id: string;
  company_id: string;
  material_id: string;
  warehouse_id: string;
  movement_type: string;
  quantity: number;
  unit_id: string | null;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  paired_movement_id: string | null;
  material_name?: string | null;
  material_code?: string | null;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
  user_name?: string | null;
}

export interface MaterialStockSummary {
  total_stock: number;
  total_reserved: number;
  total_available: number;
  warehouse_count: number;
}

export const MOVEMENT_TYPES = [
  "RECEIPT",
  "ISSUE",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "RETURN",
] as const;

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  RECEIPT: "Receipt",
  ISSUE: "Issue",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  ADJUSTMENT_IN: "Adjustment In",
  ADJUSTMENT_OUT: "Adjustment Out",
  RETURN: "Return",
};

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NO_STOCK";

// ============================================================
// SUPPLIER MANAGEMENT TYPES
// ============================================================

export interface SupplierClassification {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  company_id: string;
  code: string;
  name: string;
  legal_name: string | null;
  classification_id: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  payment_terms: string | null;
  currency: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierWithDetails extends Supplier {
  classification_name: string | null;
  material_count: number;
}

export interface MaterialSupplier {
  id: string;
  company_id: string;
  material_id: string;
  supplier_id: string;
  supplier_sku: string | null;
  supplier_material_name: string | null;
  unit_price: number;
  currency: string;
  minimum_order_quantity: number;
  lead_time_days: number;
  is_preferred: boolean;
  is_active: boolean;
  notes: string | null;
  effective_date: string;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialSupplierWithDetails extends MaterialSupplier {
  supplier_code: string | null;
  supplier_name: string | null;
  material_code: string | null;
  material_name: string | null;
  category_name: string | null;
  unit_name: string | null;
  unit_abbreviation: string | null;
}

export const SUPPLIER_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;

export const SUPPLIER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  BLOCKED: "Blocked",
};

// ============================================================
// JOB MATERIAL TYPES
// ============================================================

export interface JobMaterialRequirement {
  id: string;
  company_id: string;
  job_id: string;
  material_id: string;
  planned_quantity: number;
  unit_id: string | null;
  required_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface JobMaterialRequirementWithDetails extends JobMaterialRequirement {
  material_code: string | null;
  material_name: string | null;
  unit_name: string | null;
  unit_abbreviation: string | null;
}

export interface JobMaterialUsage {
  id: string;
  company_id: string;
  job_id: string;
  material_id: string;
  warehouse_id: string;
  usage_type: string;
  quantity: number;
  unit_id: string | null;
  reference: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
  material_name?: string | null;
  material_code?: string | null;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
  user_name?: string | null;
}

export const USAGE_TYPES = ["ISSUED", "USED", "RETURNED", "WASTED"] as const;

export const USAGE_TYPE_LABELS: Record<string, string> = {
  ISSUED: "Issued",
  USED: "Used",
  RETURNED: "Returned",
  WASTED: "Wasted",
};

export interface JobMaterialSummary {
  material_id: string;
  material_code: string;
  material_name: string;
  unit_abbreviation: string | null;
  planned_quantity: number;
  issued_quantity: number;
  used_quantity: number;
  returned_quantity: number;
  wasted_quantity: number;
  remaining_quantity: number;
  variance: number;
  status: string;
}
