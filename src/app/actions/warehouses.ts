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

const warehouseSchema = z.object({
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
  location: z
    .string()
    .max(500, { error: "Location must be at most 500 characters." })
    .optional()
    .or(z.literal("")),
});

export type WarehouseFormState =
  | {
      errors?: {
        code?: string[];
        name?: string[];
        location?: string[];
      };
      message?: string;
    }
  | undefined;

export async function createWarehouse(
  state: WarehouseFormState,
  formData: FormData
) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return { message: "No company found for your account." };
  }

  const validated = warehouseSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    location: formData.get("location"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("warehouses")
    .select("id")
    .eq("company_id", companyId)
    .eq("code", validated.data.code)
    .single();

  if (existing) {
    return {
      errors: {
        code: ["A warehouse with this code already exists in your company."],
      },
    };
  }

  const { error } = await supabase.from("warehouses").insert({
    company_id: companyId,
    code: validated.data.code,
    name: validated.data.name,
    location: validated.data.location || null,
  });

  if (error) {
    return { message: "Failed to create warehouse. Please try again." };
  }

  revalidatePath("/warehouses");
  redirect("/warehouses");
}

export async function updateWarehouse(
  state: WarehouseFormState,
  formData: FormData
) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return { message: "No company found for your account." };
  }

  const id = formData.get("id") as string;
  if (!id) {
    return { message: "Warehouse ID is required." };
  }

  const validated = warehouseSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    location: formData.get("location"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("warehouses")
    .select("id")
    .eq("company_id", companyId)
    .eq("code", validated.data.code)
    .neq("id", id)
    .single();

  if (existing) {
    return {
      errors: {
        code: ["A warehouse with this code already exists in your company."],
      },
    };
  }

  const { error } = await supabase
    .from("warehouses")
    .update({
      code: validated.data.code,
      name: validated.data.name,
      location: validated.data.location || null,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return { message: "Failed to update warehouse. Please try again." };
  }

  revalidatePath("/warehouses");
  revalidatePath(`/warehouses/${id}`);
  redirect("/warehouses");
}

export async function toggleWarehouseStatus(formData: FormData) {
  const companyId = await getCompanyId();
  if (!companyId) return;

  const id = formData.get("id") as string;
  const isActive = formData.get("is_active") === "true";

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("warehouses")
    .update({ is_active: !isActive })
    .eq("id", id)
    .eq("company_id", companyId);

  revalidatePath("/warehouses");
  revalidatePath(`/warehouses/${id}`);
}
