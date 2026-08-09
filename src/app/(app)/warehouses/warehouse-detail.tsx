"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActiveBadge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import { useCompanyData } from "@/lib/use-company-data";
import { getWarehouseById } from "@/lib/client-queries";
import { toggleWarehouseStatus } from "@/lib/client-warehouses";
import type { Warehouse } from "@/types/database";

export function WarehouseDetail({ warehouseId }: { warehouseId: string }) {
  const { company } = useCompanyData();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    getWarehouseById(company.id, warehouseId).then((w) => {
      setWarehouse(w);
      setLoading(false);
    });
  }, [company, warehouseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <EmptyState
        title="Warehouse Not Found"
        description="This warehouse may have been deleted or you don't have access."
      />
    );
  }

  const handleToggle = async () => {
    await toggleWarehouseStatus(warehouse.id, warehouse.is_active);
    setWarehouse({ ...warehouse, is_active: !warehouse.is_active });
  };

  return (
    <>
      <PageHeader
        title={warehouse.name}
        description={`Warehouse ${warehouse.code}`}
        breadcrumbs={[
          { label: "Warehouses", href: "/warehouses" },
          { label: warehouse.code },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/warehouses/edit?id=${warehouse.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <button
              onClick={handleToggle}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {warehouse.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Active
          </div>
          <ActiveBadge isActive={warehouse.is_active} />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Location
          </div>
          <div className="text-sm font-medium flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted" />
            {warehouse.location ?? "—"}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Code
          </div>
          <div className="text-sm font-medium">{warehouse.code}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-2">Stock & Inventory</h3>
        <p className="text-sm text-muted">
          Stock management and material movements for this warehouse will be
          available in Phase 2 (Master Data) and Phase 3 (Inventory).
        </p>
      </div>
    </>
  );
}
