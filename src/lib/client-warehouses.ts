"use client";

import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase/client";

const warehouseSchema = z.object({
  code: z
    .string()
    .min(2, { error: "Code must be at least 2 characters." })
    .trim(),
  name: z
    .string()
    .min(2, { error: "Name must be at least 2 characters." })
    .trim(),
  location: z.string().optional(),
});

export type WarehouseFormState = {
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createWarehouse(
  companyId: string,
  formData: FormData
): Promise<WarehouseFormState> {
  const validated = warehouseSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    location: formData.get("location"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("warehouses").insert({
    company_id: companyId,
    code: validated.data.code,
    name: validated.data.name,
    location: validated.data.location || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "A warehouse with this code already exists." };
    }
    return { message: "Failed to create warehouse. Please try again." };
  }

  return {};
}

export async function updateWarehouse(
  warehouseId: string,
  formData: FormData
): Promise<WarehouseFormState> {
  const validated = warehouseSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    location: formData.get("location"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("warehouses")
    .update({
      code: validated.data.code,
      name: validated.data.name,
      location: validated.data.location || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", warehouseId);

  if (error) {
    if (error.code === "23505") {
      return { message: "A warehouse with this code already exists." };
    }
    return { message: "Failed to update warehouse. Please try again." };
  }

  return {};
}

export async function toggleWarehouseStatus(
  warehouseId: string,
  currentActive: boolean
): Promise<WarehouseFormState> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("warehouses")
    .update({
      is_active: !currentActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", warehouseId);

  if (error) {
    return { message: "Failed to update warehouse status." };
  }

  return {};
}
