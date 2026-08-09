"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Wrench,
  Warehouse,
  Package,
  Truck,
  FileText,
  GitBranch,
  Users,
  ListTree,
  ArrowLeftRight,
} from "lucide-react";

const navItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
  subItem?: boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/warehouses", label: "Warehouses", icon: Warehouse },
  { href: "/github", label: "GitHub", icon: GitBranch },
  { href: "/materials", label: "Materials", icon: Package },
  { href: "/materials/categories", label: "Categories", icon: ListTree, subItem: true },
  { href: "/materials/movements", label: "Stock Movements", icon: ArrowLeftRight, subItem: true },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/suppliers/classifications", label: "Classifications", icon: ListTree, subItem: true },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings/users", label: "Users & Roles", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white font-bold text-sm">
            IF
          </div>
          <span className="font-bold text-lg">InfraFlow</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted/50 cursor-not-allowed"
                title="Coming in a later phase"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="ml-auto text-xs">Soon</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-light text-primary"
                  : "text-foreground hover:bg-gray-100"
              } ${item.subItem ? "ml-6" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <div className="text-xs text-muted px-3">
          Phase 1 — Foundation
        </div>
      </div>
    </aside>
  );
}
