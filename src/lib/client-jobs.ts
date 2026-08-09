"use client";

import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase/client";

const jobSchema = z.object({
  code: z
    .string()
    .min(2, { error: "Code must be at least 2 characters." })
    .trim(),
  name: z
    .string()
    .min(2, { error: "Name must be at least 2 characters." })
    .trim(),
  project_id: z.string().min(1, { error: "Please select a project." }),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export type JobFormState = {
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createJob(
  companyId: string,
  formData: FormData
): Promise<JobFormState> {
  const validated = jobSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    project_id: formData.get("project_id"),
    description: formData.get("description"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("jobs").insert({
    company_id: companyId,
    project_id: validated.data.project_id,
    code: validated.data.code,
    name: validated.data.name,
    description: validated.data.description || null,
    start_date: validated.data.start_date || null,
    end_date: validated.data.end_date || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "A job with this code already exists." };
    }
    return { message: "Failed to create job. Please try again." };
  }

  return {};
}

export async function updateJob(
  jobId: string,
  formData: FormData
): Promise<JobFormState> {
  const validated = jobSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    project_id: formData.get("project_id"),
    description: formData.get("description"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("jobs")
    .update({
      code: validated.data.code,
      name: validated.data.name,
      project_id: validated.data.project_id,
      description: validated.data.description || null,
      start_date: validated.data.start_date || null,
      end_date: validated.data.end_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    if (error.code === "23505") {
      return { message: "A job with this code already exists." };
    }
    return { message: "Failed to update job. Please try again." };
  }

  return {};
}

export async function toggleJobStatus(
  jobId: string,
  currentActive: boolean
): Promise<JobFormState> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("jobs")
    .update({
      is_active: !currentActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    return { message: "Failed to update job status." };
  }

  return {};
}
