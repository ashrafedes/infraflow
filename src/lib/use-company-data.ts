"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getUserCompanies, getCurrentProfile } from "@/lib/client-queries";
import type { CompanyWithRole, Profile } from "@/types/database";

export function useCompanyData() {
  const { user, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<CompanyWithRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCompany(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    Promise.all([getUserCompanies(), getCurrentProfile()]).then(
      ([companies, prof]) => {
        setCompany(companies[0] ?? null);
        setProfile(prof);
        setLoading(false);
      }
    );
  }, [user, authLoading]);

  return { company, profile, loading: authLoading || loading };
}
