"use client";

import { signOut } from "@/lib/client-auth";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({
  children,
  companyName,
  companyCode,
  userName,
  userEmail,
  userRole,
}: {
  children: React.ReactNode;
  companyName: string;
  companyCode: string;
  userName: string;
  userEmail: string;
  userRole: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const userInitial = (userName ?? "U")[0].toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0">
            <div className="relative h-full">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute -right-10 top-2 text-white"
              >
                <X className="h-6 w-6" />
              </button>
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card px-4 md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <span className="text-sm font-medium text-muted">
              {companyName}
              {companyCode && (
                <span className="ml-2 text-xs text-muted/60">
                  ({companyCode})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{userName}</div>
              <div className="text-xs text-muted">{userRole}</div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-medium">
              {userInitial}
            </div>
            <button
              onClick={handleSignOut}
              className="text-muted hover:text-foreground transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
