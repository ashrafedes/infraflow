"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signupWithCompany } from "@/lib/client-auth";
import Link from "next/link";

export default function SignupPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const result = await signupWithCompany(formData);

    if (result.message) {
      setError(result.message);
      setPending(false);
    } else if (result.errors) {
      setFieldErrors(result.errors);
      setPending(false);
    } else {
      router.replace("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">InfraFlow</h1>
          <p className="text-muted mt-2">
            Create your company account to get started
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Create Account</h2>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium mb-1"
              >
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {fieldErrors.full_name && (
                <p className="mt-1 text-sm text-danger">
                  {fieldErrors.full_name[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-danger">
                  {fieldErrors.email[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted">
                At least 8 characters with one letter and one number.
              </p>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-danger">
                  {fieldErrors.password[0]}
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-3">Company Details</h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="company_name"
                    className="block text-sm font-medium mb-1"
                  >
                    Company Name
                  </label>
                  <input
                    id="company_name"
                    name="company_name"
                    type="text"
                    required
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  {fieldErrors.company_name && (
                    <p className="mt-1 text-sm text-danger">
                      {fieldErrors.company_name[0]}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="company_code"
                    className="block text-sm font-medium mb-1"
                  >
                    Company Code
                  </label>
                  <input
                    id="company_code"
                    name="company_code"
                    type="text"
                    required
                    placeholder="e.g. ACME-CO"
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  {fieldErrors.company_code && (
                    <p className="mt-1 text-sm text-danger">
                      {fieldErrors.company_code[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
