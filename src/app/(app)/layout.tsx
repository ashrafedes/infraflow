"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCompanyData } from "@/lib/use-company-data";
import { AppShell } from "@/components/app-shell";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const { company, profile, loading: dataLoading } = useCompanyData();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || (user && dataLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppShell
      companyName={company?.name ?? "—"}
      companyCode={company?.code ?? ""}
      userName={profile?.full_name ?? user.email ?? "User"}
      userEmail={user.email ?? ""}
      userRole={company?.role_name ?? "User"}
    >
      {children}
    </AppShell>
  );
}
