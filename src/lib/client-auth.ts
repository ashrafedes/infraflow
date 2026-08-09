"use client";

import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.email({ error: "Please enter a valid email address." }).trim(),
  password: z
    .string()
    .min(6, { error: "Password must be at least 6 characters long." }),
});

export async function loginWithPassword(
  formData: FormData
): Promise<{ message?: string; errors?: Record<string, string[]> }> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error) {
    return { message: "Invalid email or password." };
  }

  return {};
}

const signupSchema = z.object({
  full_name: z
    .string()
    .min(2, { error: "Name must be at least 2 characters long." })
    .trim(),
  email: z.email({ error: "Please enter a valid email address." }).trim(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters long." }),
  company_name: z
    .string()
    .min(2, { error: "Company name must be at least 2 characters long." })
    .trim(),
  company_code: z
    .string()
    .min(2, { error: "Company code must be at least 2 characters long." })
    .trim()
    .toUpperCase(),
});

export async function signupWithCompany(
  formData: FormData
): Promise<{ message?: string; errors?: Record<string, string[]> }> {
  const validated = signupSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    company_name: formData.get("company_name"),
    company_code: formData.get("company_code"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const supabase = getSupabaseClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: { full_name: validated.data.full_name },
    },
  });

  if (authError) {
    return { message: authError.message };
  }

  if (!authData.user) {
    return { message: "Signup failed. Please try again." };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: validated.data.company_name,
      code: validated.data.company_code,
    })
    .select()
    .single();

  if (companyError) {
    return { message: "Failed to create company. Please contact support." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      company_id: company.id,
      full_name: validated.data.full_name,
      email: validated.data.email,
    })
    .eq("id", authData.user.id);

  if (profileError) {
    return { message: "Failed to create profile. Please contact support." };
  }

  const { data: adminRole } = await supabase
    .from("roles")
    .select("id")
    .eq("code", "company_admin")
    .single();

  if (!adminRole) {
    return { message: "Admin role not found. Please contact support." };
  }

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: authData.user.id,
    company_id: company.id,
    role_id: adminRole.id,
  });

  if (roleError) {
    return { message: "Failed to assign role. Please contact support." };
  }

  return {};
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}
