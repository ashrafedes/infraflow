"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Wrench,
  Warehouse as WarehouseIcon,
  Package,
  Truck,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useCompanyData } from "@/lib/use-company-data";
import {
  getProjects,
  getJobs,
  getWarehouses,
  getMaterials,
  getSuppliers,
  type ProjectWithCounts,
} from "@/lib/client-queries";
import type { JobWithProject, Warehouse, MaterialWithDetails, SupplierWithDetails } from "@/types/database";

export default function DashboardPage() {
  const { company, profile, loading } = useCompanyData();
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [jobs, setJobs] = useState<JobWithProject[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materials, setMaterials] = useState<MaterialWithDetails[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierWithDetails[]>([]);

  useEffect(() => {
    if (!company) return;
    Promise.all([
      getProjects(company.id),
      getJobs(company.id),
      getWarehouses(company.id),
      getMaterials(company.id),
      getSuppliers(company.id),
    ]).then(([p, j, w, m, s]) => {
      setProjects(p);
      setJobs(j);
      setWarehouses(w);
      setMaterials(m);
      setSuppliers(s);
    });
  }, [company]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-warning mb-4" />
        <h2 className="text-xl font-semibold">No Company Assigned</h2>
        <p className="text-muted text-sm mt-1 max-w-sm">
          Your account is not associated with any company. Please contact
          support to resolve this issue.
        </p>
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.is_active).length;
  const activeJobs = jobs.filter((j) => j.is_active).length;
  const activeWarehouses = warehouses.filter((w) => w.is_active).length;
  const activeMaterials = materials.filter((m) => m.is_active).length;
  const activeSuppliers = suppliers.filter((s) => s.status === "ACTIVE").length;
  const lowStockItems = materials.filter((m) => {
    const stock = Number(m.total_stock ?? 0);
    const reorder = Number(m.reorder_level ?? 0);
    return stock <= reorder;
  });

  const stats = [
    { label: "Projects", value: projects.length, active: activeProjects, href: "/projects", icon: FolderKanban },
    { label: "Jobs", value: jobs.length, active: activeJobs, href: "/jobs", icon: Wrench },
    { label: "Warehouses", value: warehouses.length, active: activeWarehouses, href: "/warehouses", icon: WarehouseIcon },
    { label: "Materials", value: materials.length, active: activeMaterials, href: "/materials", icon: Package },
    { label: "Suppliers", value: suppliers.length, active: activeSuppliers, href: "/suppliers", icon: Truck },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile?.full_name ?? "User"}`}
        description={`${company.name} — ${company.role_name}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-card border border-border rounded-lg p-5 hover:border-primary transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted">
              {stat.active} active
            </div>
          </Link>
        ))}
      </div>

      {lowStockItems.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">
              {lowStockItems.length} material(s) at or below reorder level
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {lowStockItems.slice(0, 3).map((m) => `${m.code} (${Number(m.total_stock ?? 0)})`).join(", ")}
              {lowStockItems.length > 3 && ` and ${lowStockItems.length - 3} more`}
            </p>
            <Link href="/reports" className="text-sm text-amber-800 font-medium hover:underline mt-1 inline-block">
              View low stock report →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Recent Projects</h2>
            <Link href="/projects" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {projects.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted text-center">
                No projects yet. Create your first project to get started.
              </p>
            ) : (
              projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects?id=${project.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium">{project.name}</div>
                    <div className="text-xs text-muted">{project.code}</div>
                  </div>
                  <div className="text-xs text-muted">
                    {project.job_count} job{project.job_count !== 1 ? "s" : ""}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Recent Warehouses</h2>
            <Link href="/warehouses" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {warehouses.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted text-center">
                No warehouses yet. Create your first warehouse to get started.
              </p>
            ) : (
              warehouses.slice(0, 5).map((wh) => (
                <Link
                  key={wh.id}
                  href={`/warehouses?id=${wh.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium">{wh.name}</div>
                    <div className="text-xs text-muted">{wh.code}</div>
                  </div>
                  {wh.location && (
                    <div className="text-xs text-muted">{wh.location}</div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
