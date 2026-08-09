import { AppShell } from "@/components/app-shell";
import { getCurrentUser, getCurrentProfile, getUserCompanies } from "@/lib/queries";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const companies = await getUserCompanies();

  const companyName = companies[0]?.name ?? null;
  const userInitial = (profile?.full_name ?? user.email ?? "U")[0].toUpperCase();

  return (
    <AppShell
      companyName={companyName}
      companyNameFallback="InfraFlow"
      userInitial={userInitial}
    >
      {children}
    </AppShell>
  );
}
