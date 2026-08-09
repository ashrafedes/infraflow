"use client";

import { signout } from "@/app/actions/auth";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({
  children,
  companyName,
  companyNameFallback,
  userInitial,
}: {
  children: React.ReactNode;
  companyName: string | null;
  companyNameFallback: string;
  userInitial: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
              {companyName ?? companyNameFallback}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-medium">
              {userInitial}
            </div>
            <form action={signout}>
              <button
                type="submit"
                className="text-muted hover:text-foreground transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
