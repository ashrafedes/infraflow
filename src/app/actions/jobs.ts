"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, getUserCompanies } from "@/lib/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

async function getCompanyId() {
  const user = await getCurrentUser();
  if (!user) return null;

  const companies = await getUserCompanies();
  if (companies.length === 0) return null;

  return companies[0].id;
}

const jobSchema = z.object({
  code: z
    .string()
    .min(1, { error: "Code is required." })
    .max(50, { error: "Code must be at most 50 characters." })
    .regex(/^[A-Za-z0-9_-]+$/, {
      error: "Code may only contain letters, numbers, hyphens, and underscores.",
    }),
  name: z
    .string()
    .min(1, { error: "Name is required." })
    .max(200, { error: "Name must be at most 200 characters." }),
  project_id: z.string().min(1, { error: "Project is required." }),
  description: z
    .string()
    .max(2000, { error: "Description must be at most 2000 characters." })
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "on_hold", "completed", "cancelled"]),
});

export type JobFormState =
  | {
      errors?: {
        code?: string[];
        name?: string[];
        project_id?: string[];
        description?: string[];
        status?: string[];
      };
      message?: string;
    }
  | undefined;

export async function createJob(state: JobFormState, formData: FormData) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return { message: "No company found for your account." };
  }

  const validated = jobSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    project_id: formData.get("project_id"),
    description: formData.get("description"),
    status: formData.get("status") ?? "active",
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();

  // Verify the project belongs to the company
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", companyId)
    .eq("id", validated.data.project_id)
    .single();

  if (!project) {
    return { errors: { project_id: ["Invalid project selected."] } };
  }

  const { data: existing } = await supabase
    .from("jobs")
    .select("id")
    .eq("company_id", companyId)
    .eq("code", validated.data.code)
    .single();

  if (existing) {
    return {
      errors: {
        code: ["A job with this code already exists in your company."],
      },
    };
  }

  const { error } = await supabase.from("jobs").insert({
    company_id: companyId,
    project_id: validated.data.project_id,
    code: validated.data.code,
    name: validated.data.name,
    description: validated.data.description || null,
    status: validated.data.status,
  });

  if (error) {
    return { message: "Failed to create job. Please try again." };
  }

  revalidatePath("/jobs");
  redirect("/jobs");
}

export async function updateJob(state: JobFormState, formData: FormData) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return { message: "No company found for your account." };
  }

  const id = formData.get("id") as string;
  if (!id) {
    return { message: "Job ID is required." };
  }

  const validated = jobSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    project_id: formData.get("project_id"),
    description: formData.get("description"),
    status: formData.get("status") ?? "active",
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("jobs")
    .select("id")
    .eq("company_id", companyId)
    .eq("code", validated.data.code)
    .neq("id", id)
    .single();

  if (existing) {
    return {
      errors: {
        code: ["A job with this code already exists in your company."],
      },
    };
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      project_id: validated.data.project_id,
      code: validated.data.code,
      name: validated.data.name,
      description: validated.data.description || null,
      status: validated.data.status,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return { message: "Failed to update job. Please try again." };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  redirect("/jobs");
}

export async function toggleJobStatus(formData: FormData) {
  const companyId = await getCompanyId();
  if (!companyId) return;

  const id = formData.get("id") as string;
  const isActive = formData.get("is_active") === "true";

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("jobs")
    .update({ is_active: !isActive })
    .eq("id", id)
    .eq("company_id", companyId);

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
}
