"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useCompanyData } from "@/lib/use-company-data";
import { getStockMovements } from "@/lib/client-queries";
import type { StockMovement } from "@/types/database";
import { MOVEMENT_TYPE_LABELS } from "@/types/database";

export default function StockMovementsPage() {
  const { company, loading } = useCompanyData();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "material">("date");

  const loadData = useCallback(async () => {
    if (!company) return;
    setDataLoading(true);
    const data = await getStockMovements(company.id, 100);
    setMovements(data);
    setDataLoading(false);
  }, [company]);

  useEffect(() => {
    if (!loading && company) {
      loadData();
    } else if (!loading && !company) {
      setDataLoading(false);
    }
  }, [loading, company, loadData]);

  const filteredMovements = useMemo(() => {
    let result = [...movements];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          (m.material_name?.toLowerCase().includes(q) ?? false) ||
          (m.material_code?.toLowerCase().includes(q) ?? false) ||
          (m.warehouse_name?.toLowerCase().includes(q) ?? false) ||
          (m.reference?.toLowerCase().includes(q) ?? false)
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((m) => m.movement_type === typeFilter);
    }
    if (sortBy === "material") {
      result.sort((a, b) => (a.material_name ?? "").localeCompare(b.material_name ?? ""));
    }
    return result;
  }, [movements, search, typeFilter, sortBy]);

  if (loading || dataLoading) {
    return <div className="flex items-center justify-center py-16"><p className="text-muted">Loading...</p></div>;
  }

  if (!company) {
    return <EmptyState title="No Company Found" description="Your account is not associated with any company." />;
  }

  return (
    <>
      <PageHeader
        title="Stock Movements"
        description="Complete audit trail of all inventory transactions"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search by material, warehouse, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-white pl-10 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
          <option value="all">All Types</option>
          {Object.entries(MOVEMENT_TYPE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "date" | "material")} className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
          <option value="date">Sort by Date</option>
          <option value="material">Sort by Material</option>
        </select>
      </div>

      {filteredMovements.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={<ArrowLeftRight className="h-6 w-6" />}
            title={movements.length === 0 ? "No Stock Movements" : "No Matching Movements"}
            description={
              movements.length === 0
                ? "Stock movements will appear here when you start receiving, issuing, or transferring materials."
                : "Try adjusting your search or filters."
            }
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Material</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Warehouse</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Quantity</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Reference</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMovements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <div>
                      <span className="font-medium text-sm">{m.material_name ?? "—"}</span>
                      <span className="block text-xs text-muted">{m.material_code ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3"><MovementTypeBadge type={m.movement_type} /></td>
                  <td className="px-5 py-3 text-sm">{m.warehouse_name ?? m.warehouse_code ?? "—"}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium">
                    {["RECEIPT", "TRANSFER_IN", "ADJUSTMENT_IN", "RETURN"].includes(m.movement_type) ? "+" : "−"}
                    {Number(m.quantity).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">{m.reference ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-muted">{m.user_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function MovementTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    RECEIPT: "bg-green-100 text-green-700 border-green-200",
    ISSUE: "bg-orange-100 text-orange-700 border-orange-200",
    TRANSFER_IN: "bg-blue-100 text-blue-700 border-blue-200",
    TRANSFER_OUT: "bg-blue-100 text-blue-700 border-blue-200",
    ADJUSTMENT_IN: "bg-purple-100 text-purple-700 border-purple-200",
    ADJUSTMENT_OUT: "bg-purple-100 text-purple-700 border-purple-200",
    RETURN: "bg-teal-100 text-teal-700 border-teal-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {MOVEMENT_TYPE_LABELS[type] ?? type}
    </span>
  );
}
