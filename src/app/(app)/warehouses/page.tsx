"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Warehouse as WarehouseIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ActiveBadge } from "@/components/badge";
import { useCompanyData } from "@/lib/use-company-data";
import { getWarehouses } from "@/lib/client-queries";
import type { Warehouse } from "@/types/database";
import { WarehouseDetail } from "./warehouse-detail";

export default function WarehousesPage() {
  const { company, loading } = useCompanyData();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  useEffect(() => {
    if (!company) return;
    getWarehouses(company.id).then(setWarehouses);
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
      <EmptyState
        title="No Company Found"
        description="Your account is not associated with any company."
      />
    );
  }

  if (selectedId) {
    return <WarehouseDetail warehouseId={selectedId} />;
  }

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Manage your company's warehouses"
        actions={
          <Link
            href="/warehouses/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Warehouse
          </Link>
        }
      />

      {warehouses.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={<WarehouseIcon className="h-6 w-6" />}
            title="No Warehouses Yet"
            description="Create your first warehouse to start managing stock and material movements."
            action={
              <Link
                href="/warehouses/new"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Warehouse
              </Link>
            }
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Code
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Location
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {warehouses.map((wh) => (
                <tr key={wh.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/warehouses?id=${wh.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {wh.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm">{wh.name}</td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {wh.location ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <ActiveBadge isActive={wh.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
