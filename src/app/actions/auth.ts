"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email({ error: "Please enter a valid email address." }),
  password: z.string().min(1, { error: "Password is required." }),
});

export type LoginState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export async function login(state: LoginState, formData: FormData) {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error) {
    return { message: "Invalid email or password." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

const signupSchema = z.object({
  full_name: z
    .string()
    .min(2, { error: "Name must be at least 2 characters long." })
    .trim(),
  email: z.email({ error: "Please enter a valid email address." }).trim(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters long." })
    .regex(/[a-zA-Z]/, { error: "Password must contain at least one letter." })
    .regex(/[0-9]/, { error: "Password must contain at least one number." })
    .trim(),
  company_name: z
    .string()
    .min(2, { error: "Company name must be at least 2 characters long." })
    .trim(),
  company_code: z
    .string()
    .min(2, { error: "Company code must be at least 2 characters long." })
    .max(20, { error: "Company code must be at most 20 characters." })
    .regex(/^[A-Za-z0-9_-]+$/, {
      error: "Company code may only contain letters, numbers, hyphens, and underscores.",
    })
    .trim(),
});

export type SignupState =
  | {
      errors?: {
        full_name?: string[];
        email?: string[];
        password?: string[];
        company_name?: string[];
        company_code?: string[];
      };
      message?: string;
    }
  | undefined;

export async function signup(state: SignupState, formData: FormData) {
  const validated = signupSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    company_name: formData.get("company_name"),
    company_code: formData.get("company_code"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();

  // Check if company code already exists
  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("code", validated.data.company_code)
    .single();

  if (existingCompany) {
    return {
      errors: {
        company_code: ["This company code is already taken."],
      },
    };
  }

  // Sign up the user with metadata for the profile trigger
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        full_name: validated.data.full_name,
      },
    },
  });

  if (authError) {
    return { message: authError.message };
  }

  if (!authData.user) {
    return { message: "Failed to create user account." };
  }

  // Create the company
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

  // Assign Company Admin role to the signing user
  const { data: adminRole } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "Company Admin")
    .single();

  if (!adminRole) {
    return { message: "Role configuration error. Please contact support." };
  }

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: authData.user.id,
    company_id: company.id,
    role_id: adminRole.id,
  });

  if (roleError) {
    return { message: "Failed to assign role. Please contact support." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/login");
}
