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
  "viewer",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  company_admin: "Company Admin",
  warehouse_manager: "Warehouse Manager",
  warehouse_user: "Warehouse User",
  project_manager: "Project Manager",
  viewer: "Viewer",
};
