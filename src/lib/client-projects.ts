"use client";

import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase/client";

const projectSchema = z.object({
  code: z
    .string()
    .min(2, { error: "Code must be at least 2 characters." })
    .trim(),
  name: z
    .string()
    .min(2, { error: "Name must be at least 2 characters." })
    .trim(),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export type ProjectFormState = {
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createProject(
  companyId: string,
  formData: FormData
): Promise<ProjectFormState> {
  const validated = projectSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("projects").insert({
    company_id: companyId,
    code: validated.data.code,
    name: validated.data.name,
    description: validated.data.description || null,
    start_date: validated.data.start_date || null,
    end_date: validated.data.end_date || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "A project with this code already exists." };
    }
    return { message: "Failed to create project. Please try again." };
  }

  return {};
}

export async function updateProject(
  projectId: string,
  formData: FormData
): Promise<ProjectFormState> {
  const validated = projectSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("projects")
    .update({
      code: validated.data.code,
      name: validated.data.name,
      description: validated.data.description || null,
      start_date: validated.data.start_date || null,
      end_date: validated.data.end_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    if (error.code === "23505") {
      return { message: "A project with this code already exists." };
    }
    return { message: "Failed to update project. Please try again." };
  }

  return {};
}

export async function toggleProjectStatus(
  projectId: string,
  currentActive: boolean
): Promise<ProjectFormState> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("projects")
    .update({
      is_active: !currentActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    return { message: "Failed to update project status." };
  }

  return {};
}
