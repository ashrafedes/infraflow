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
});

const onboardingSchema = z.object({
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

export async function initiateSignup(
  formData: FormData
): Promise<{ message?: string; errors?: Record<string, string[]> }> {
  const validated = signupSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
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

  return {};
}

export async function completeOnboarding(
  formData: FormData
): Promise<{ message?: string; errors?: Record<string, string[]> }> {
  const validated = onboardingSchema.safeParse({
    company_name: formData.get("company_name"),
    company_code: formData.get("company_code"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session?.access_token) {
    return { message: "Authentication session not found. Please sign in again." };
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboard-company`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        company_name: validated.data.company_name,
        company_code: validated.data.company_code,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return { message: result.error || "Failed to create company. Please try again." };
  }

  return {};
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}
