"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  FileText,
  Package,
  ArrowLeftRight,
  Truck,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useCompanyData } from "@/lib/use-company-data";
import {
  getMaterials,
  getStockMovements,
  getWarehouses,
  getSuppliers,
} from "@/lib/client-queries";
import type {
  MaterialWithDetails,
  StockMovement,
  Warehouse,
  SupplierWithDetails,
} from "@/types/database";
import { MOVEMENT_TYPE_LABELS } from "@/types/database";

type ReportType = "inventory" | "movements" | "lowstock" | "suppliers";

export default function ReportsPage() {
  const { company, loading } = useCompanyData();
  const [reportType, setReportType] = useState<ReportType>("inventory");
  const [materials, setMaterials] = useState<MaterialWithDetails[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierWithDetails[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    if (!company) return;
    setDataLoading(true);
    const [mats, movs, whs, sups] = await Promise.all([
      getMaterials(company.id),
      getStockMovements(company.id, 100),
      getWarehouses(company.id),
      getSuppliers(company.id),
    ]);
    setMaterials(mats);
    setMovements(movs);
    setWarehouses(whs);
    setSuppliers(sups);
    setDataLoading(false);
  }, [company]);

  useEffect(() => {
    if (!loading && company) {
      loadData();
    } else if (!loading && !company) {
      setDataLoading(false);
    }
  }, [loading, company, loadData]);

  const reportTypes: { id: ReportType; label: string; icon: typeof FileText }[] = [
    { id: "inventory", label: "Inventory Report", icon: Package },
    { id: "movements", label: "Stock Movements", icon: ArrowLeftRight },
    { id: "lowstock", label: "Low Stock Report", icon: AlertTriangle },
    { id: "suppliers", label: "Supplier Report", icon: Truck },
  ];

  if (loading || dataLoading) {
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

  return (
    <>
      <PageHeader
        title="Reports"
        description="View inventory, movement, and supplier reports"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {reportTypes.map((rt) => {
          const Icon = rt.icon;
          return (
            <button
              key={rt.id}
              onClick={() => setReportType(rt.id)}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                reportType === rt.id
                  ? "bg-primary text-white"
                  : "border border-border bg-white text-foreground hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {rt.label}
            </button>
          );
        })}
      </div>

      {reportType === "inventory" && (
        <InventoryReport
          materials={materials}
          warehouses={warehouses}
          search={search}
          setSearch={setSearch}
        />
      )}

      {reportType === "movements" && (
        <MovementsReport
          movements={movements}
          warehouses={warehouses}
          warehouseFilter={warehouseFilter}
          setWarehouseFilter={setWarehouseFilter}
        />
      )}

      {reportType === "lowstock" && (
        <LowStockReport materials={materials} />
      )}

      {reportType === "suppliers" && (
        <SupplierReport suppliers={suppliers} />
      )}
    </>
  );
}

function InventoryReport({
  materials,
  warehouses,
  search,
  setSearch,
}: {
  materials: MaterialWithDetails[];
  warehouses: Warehouse[];
  search: string;
  setSearch: (v: string) => void;
}) {
  const filtered = useMemo(() => {
    if (!search) return materials;
    const q = search.toLowerCase();
    return materials.filter(
      (m) =>
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.category_name?.toLowerCase().includes(q)
    );
  }, [materials, search]);

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState icon={<Package className="h-6 w-6" />} title="No Materials" description="No materials match your search." />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Total Stock</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Min Level</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Reorder Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => {
                const totalStock = Number(m.total_stock ?? 0);
                const minLevel = Number(m.min_stock_level ?? 0);
                const reorderLevel = Number(m.reorder_level ?? 0);
                let status = "OK";
                let statusColor = "bg-green-100 text-green-700 border-green-200";
                if (totalStock === 0) {
                  status = "OUT OF STOCK";
                  statusColor = "bg-red-100 text-red-700 border-red-200";
                } else if (totalStock <= reorderLevel) {
                  status = "LOW STOCK";
                  statusColor = "bg-amber-100 text-amber-700 border-amber-200";
                } else if (totalStock <= minLevel) {
                  status = "BELOW MIN";
                  statusColor = "bg-orange-100 text-orange-700 border-orange-200";
                }
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-sm">{m.code}</td>
                    <td className="px-4 py-3 text-sm">{m.name}</td>
                    <td className="px-4 py-3 text-sm text-muted">{m.category_name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted">{m.unit_abbreviation ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">{totalStock.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm text-muted">{minLevel.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm text-muted">{reorderLevel.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function MovementsReport({
  movements,
  warehouses,
  warehouseFilter,
  setWarehouseFilter,
}: {
  movements: StockMovement[];
  warehouses: Warehouse[];
  warehouseFilter: string;
  setWarehouseFilter: (v: string) => void;
}) {
  const filtered = useMemo(() => {
    if (warehouseFilter === "all") return movements;
    return movements.filter((m) => m.warehouse_id === warehouseFilter);
  }, [movements, warehouseFilter]);

  return (
    <>
      <div className="mb-4">
        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState icon={<ArrowLeftRight className="h-6 w-6" />} title="No Movements" description="No stock movements found." />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Material</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Warehouse</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{m.material_code}</div>
                    <div className="text-xs text-muted">{m.material_name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{MOVEMENT_TYPE_LABELS[m.movement_type as keyof typeof MOVEMENT_TYPE_LABELS] ?? m.movement_type}</td>
                  <td className="px-4 py-3 text-sm text-muted">{m.warehouse_name ?? m.warehouse_code ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    {["RECEIPT", "TRANSFER_IN", "ADJUSTMENT_IN", "RETURN"].includes(m.movement_type) ? "+" : "−"}
                    {Number(m.quantity).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{m.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted">{m.user_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function LowStockReport({ materials }: { materials: MaterialWithDetails[] }) {
  const lowStockItems = useMemo(() => {
    return materials
      .filter((m) => {
        const totalStock = Number(m.total_stock ?? 0);
        const reorderLevel = Number(m.reorder_level ?? 0);
        return totalStock <= reorderLevel;
      })
      .sort((a, b) => {
        const aStock = Number(a.total_stock ?? 0);
        const bStock = Number(b.total_stock ?? 0);
        return aStock - bStock;
      });
  }, [materials]);

  return (
    <>
      {lowStockItems.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="No Low Stock Items" description="All materials are above their reorder levels." />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-amber-50">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{lowStockItems.length}</span> material(s) at or below reorder level.
            </p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Current Stock</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Reorder Level</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Min Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lowStockItems.map((m) => {
                const totalStock = Number(m.total_stock ?? 0);
                const reorderLevel = Number(m.reorder_level ?? 0);
                const minLevel = Number(m.min_stock_level ?? 0);
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-sm">{m.code}</td>
                    <td className="px-4 py-3 text-sm">{m.name}</td>
                    <td className={`px-4 py-3 text-right text-sm font-bold ${totalStock === 0 ? "text-red-600" : "text-amber-600"}`}>
                      {totalStock.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">{reorderLevel.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm text-muted">{minLevel.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-muted">{m.unit_abbreviation ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SupplierReport({ suppliers }: { suppliers: SupplierWithDetails[] }) {
  return (
    <>
      {suppliers.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState icon={<Truck className="h-6 w-6" />} title="No Suppliers" description="No suppliers found." />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Classification</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Email</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Materials</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-sm">{s.code}</td>
                  <td className="px-4 py-3 text-sm">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-muted">{s.classification_name ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted">{s.contact_person ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted">{s.email ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm">{s.material_count}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      s.status === "ACTIVE" ? "bg-green-100 text-green-700 border-green-200" :
                      s.status === "BLOCKED" ? "bg-red-100 text-red-700 border-red-200" :
                      "bg-gray-100 text-gray-600 border-gray-200"
                    }`}>
                      {s.status}
                    </span>
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
