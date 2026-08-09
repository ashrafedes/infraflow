import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Company,
  CompanyWithRole,
  Job,
  JobWithProject,
  Profile,
  Project,
  Role,
  Warehouse,
} from "@/types/database";

export interface ProjectWithCounts extends Project {
  job_count: number;
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
}

export async function getUserCompanies(): Promise<CompanyWithRole[]> {
  const supabase = await createSupabaseServerClient();
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

  return data.map((item) => ({
    ...(item.company as unknown as Company),
    role_name: (item.role as unknown as Role).name,
  }));
}

export async function getProjects(
  companyId: string
): Promise<ProjectWithCounts[]> {
  const supabase = await createSupabaseServerClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (!projects) return [];

  const projectIds = projects.map((p) => p.id);

  if (projectIds.length === 0) {
    return projects.map((p) => ({ ...p, job_count: 0 }));
  }

  const { data: jobCounts } = await supabase
    .from("jobs")
    .select("project_id")
    .in("project_id", projectIds);

  const countMap = new Map<string, number>();
  jobCounts?.forEach((j) => {
    const current = countMap.get(j.project_id) ?? 0;
    countMap.set(j.project_id, current + 1);
  });

  return projects.map((p) => ({
    ...p,
    job_count: countMap.get(p.id) ?? 0,
  }));
}

export async function getProjectById(
  companyId: string,
  projectId: string
): Promise<Project | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", projectId)
    .single();
  return data as Project | null;
}

export async function getJobs(companyId: string): Promise<JobWithProject[]> {
  const supabase = await createSupabaseServerClient();

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

  return data.map((item) => ({
    ...(item as unknown as Job),
    project_name: (item.project as unknown as { name: string }).name,
    project_code: (item.project as unknown as { code: string }).code,
  }));
}

export async function getJobsByProject(
  companyId: string,
  projectId: string
): Promise<Job[]> {
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
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

  return {
    ...(data as unknown as Job),
    project_name: (data.project as unknown as { name: string }).name,
    project_code: (data.project as unknown as { code: string }).code,
  };
}

export async function getWarehouses(
  companyId: string
): Promise<Warehouse[]> {
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("warehouses")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", warehouseId)
    .single();
  return data as Warehouse | null;
}
