"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Package, Search, X, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, SlidersHorizontal, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ActiveBadge } from "@/components/badge";
import { useCompanyData } from "@/lib/use-company-data";
import {
  getMaterials,
  getMaterialCategories,
  getUnitsOfMeasure,
  getWarehouses,
  getWarehouseStockByMaterial,
  createMaterial,
  receiveStockRpc,
  issueStockRpc,
  transferStockRpc,
  adjustStockRpc,
  returnStockRpc,
} from "@/lib/client-queries";
import type { MaterialWithDetails, MaterialCategory, UnitOfMeasure, Warehouse, WarehouseStock, StockStatus } from "@/types/database";
import { MaterialDetail } from "./material-detail";

export default function MaterialsPage() {
  const { company, loading } = useCompanyData();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedMaterialId = searchParams.get("id");
  const [materials, setMaterials] = useState<MaterialWithDetails[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, { total: number; reserved: number; available: number }>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [stockOperation, setStockOperation] = useState<{
    type: "receive" | "issue" | "transfer" | "adjust" | "return";
    material: MaterialWithDetails;
  } | null>(null);

  const canManageMaterials = useMemo(() => {
    return company?.role_name === "Company Admin" || company?.role_name === "Warehouse Manager";
  }, [company]);

  const canManageStock = useMemo(() => {
    return ["Company Admin", "Warehouse Manager", "Warehouse User"].includes(company?.role_name ?? "");
  }, [company]);

  const loadData = useCallback(async () => {
    if (!company) return;
    setDataLoading(true);
    setError(null);
    try {
      const [mats, cats, uns, whs] = await Promise.all([
        getMaterials(company.id),
        getMaterialCategories(company.id),
        getUnitsOfMeasure(company.id),
        getWarehouses(company.id),
      ]);
      setMaterials(mats);
      setCategories(cats);
      setUnits(uns);
      setWarehouses(whs.filter((w) => w.is_active));

      // Load stock for all materials
      const stockData: Record<string, { total: number; reserved: number; available: number }> = {};
      await Promise.all(
        mats.map(async (m) => {
          const stock = await getWarehouseStockByMaterial(company.id, m.id);
          const total = stock.reduce((sum, s) => sum + Number(s.quantity), 0);
          const reserved = stock.reduce((sum, s) => sum + Number(s.reserved), 0);
          stockData[m.id] = { total, reserved, available: total - reserved };
        })
      );
      setStockMap(stockData);
    } catch {
      setError("Failed to load materials.");
    }
    setDataLoading(false);
  }, [company]);

  useEffect(() => {
    if (!loading && company) {
      loadData();
    } else if (!loading && !company) {
      setDataLoading(false);
    }
  }, [loading, company, loadData]);

  const getStockStatus = (materialId: string, minLevel: number, reorderLevel: number): StockStatus => {
    const stock = stockMap[materialId];
    if (!stock || stock.total === 0) return "NO_STOCK";
    if (stock.total <= minLevel) return "OUT_OF_STOCK";
    if (stock.total <= reorderLevel) return "LOW_STOCK";
    return "IN_STOCK";
  };

  const filteredMaterials = useMemo(() => {
    let result = [...materials];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          (m.category_name?.toLowerCase().includes(q) ?? false) ||
          (m.brand?.toLowerCase().includes(q) ?? false)
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((m) => m.category_id === categoryFilter);
    }

    if (activeFilter !== "all") {
      result = result.filter((m) => (activeFilter === "active" ? m.is_active : !m.is_active));
    }

    if (statusFilter !== "all") {
      result = result.filter((m) => {
        const status = getStockStatus(m.id, m.min_stock_level, m.reorder_level);
        return status === statusFilter;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === "code") {
        cmp = a.code.localeCompare(b.code);
      } else if (sortBy === "category_name") {
        cmp = (a.category_name ?? "").localeCompare(b.category_name ?? "");
      } else {
        cmp = a.created_at.localeCompare(b.created_at);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [materials, search, categoryFilter, statusFilter, activeFilter, sortBy, sortDir, stockMap]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <EmptyState title="No Company Found" description="Your account is not associated with any company." />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-danger mb-4">{error}</p>
        <button onClick={loadData} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
          Retry
        </button>
      </div>
    );
  }

  if (selectedMaterialId && company) {
    return (
      <MaterialDetail
        materialId={selectedMaterialId}
        companyId={company.id}
        onBack={() => router.push("/materials")}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Materials"
        description="Manage your company's materials and inventory"
        actions={
          canManageMaterials && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Material
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search by name, code, category, or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-white pl-10 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">All Stock Status</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
          <option value="NO_STOCK">No Stock</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">All Active</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Materials Table */}
      {filteredMaterials.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title={materials.length === 0 ? "No Materials Yet" : "No Matching Materials"}
            description={
              materials.length === 0
                ? "Add your first material to start managing inventory."
                : "Try adjusting your search or filters."
            }
            action={
              canManageMaterials && materials.length === 0 ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Material
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("code")}>
                  Code {sortBy === "code" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>
                  Material {sortBy === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("category_name")}>
                  Category {sortBy === "category_name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Unit</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Current Stock</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Reserved</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Available</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Min Stock</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Active</th>
                {canManageStock && (
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Stock Ops</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMaterials.map((m) => {
                const stock = stockMap[m.id] ?? { total: 0, reserved: 0, available: 0 };
                const status = getStockStatus(m.id, m.min_stock_level, m.reorder_level);
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/materials?id=${m.id}`} className="font-medium text-primary hover:underline">
                        {m.code}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <span className="font-medium">{m.name}</span>
                        {m.brand && <span className="block text-xs text-muted">{m.brand}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted">{m.category_name ?? "—"}</td>
                    <td className="px-5 py-3 text-sm text-muted">{m.unit_abbreviation ?? m.unit_name ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium">{Number(stock.total).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm text-muted">{Number(stock.reserved).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium">{Number(stock.available).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm text-muted">{Number(m.min_stock_level).toLocaleString()}</td>
                    <td className="px-5 py-3"><StockStatusBadge status={status} /></td>
                    <td className="px-5 py-3"><ActiveBadge isActive={m.is_active} /></td>
                    {canManageStock && (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setStockOperation({ type: "receive", material: m })}
                            title="Receive Stock"
                            className="p-1.5 rounded text-green-600 hover:bg-green-50"
                          >
                            <ArrowDownToLine className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setStockOperation({ type: "issue", material: m })}
                            title="Issue Stock"
                            className="p-1.5 rounded text-orange-600 hover:bg-orange-50"
                          >
                            <ArrowUpFromLine className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setStockOperation({ type: "transfer", material: m })}
                            title="Transfer Stock"
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50"
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/materials?id=${m.id}`}
                            title="Details"
                            className="p-1.5 rounded text-muted hover:bg-gray-100"
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Material Modal */}
      {showAddModal && (
        <AddMaterialModal
          companyId={company.id}
          categories={categories}
          units={units}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}

      {/* Stock Operation Modal */}
      {stockOperation && (
        <StockOperationModal
          type={stockOperation.type}
          material={stockOperation.material}
          warehouses={warehouses}
          onClose={() => setStockOperation(null)}
          onSuccess={() => {
            setStockOperation(null);
            loadData();
          }}
        />
      )}
    </>
  );
}

function StockStatusBadge({ status }: { status: StockStatus }) {
  const styles: Record<StockStatus, string> = {
    IN_STOCK: "bg-green-100 text-green-700 border-green-200",
    LOW_STOCK: "bg-yellow-100 text-yellow-700 border-yellow-200",
    OUT_OF_STOCK: "bg-red-100 text-red-700 border-red-200",
    NO_STOCK: "bg-gray-100 text-gray-500 border-gray-200",
  };
  const labels: Record<StockStatus, string> = {
    IN_STOCK: "In Stock",
    LOW_STOCK: "Low Stock",
    OUT_OF_STOCK: "Out of Stock",
    NO_STOCK: "No Stock",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function AddMaterialModal({
  companyId,
  categories,
  units,
  onClose,
  onSuccess,
}: {
  companyId: string;
  categories: MaterialCategory[];
  units: UnitOfMeasure[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [unitId, setUnitId] = useState("");
  const [brand, setBrand] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [minStock, setMinStock] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [maxStock, setMaxStock] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    if (!code.trim()) {
      setFieldErrors({ code: "Material code is required." });
      setPending(false);
      return;
    }
    if (!name.trim()) {
      setFieldErrors({ name: "Material name is required." });
      setPending(false);
      return;
    }

    const result = await createMaterial({
      company_id: companyId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      subcategory: subcategory.trim() || null,
      unit_id: unitId || null,
      brand: brand.trim() || null,
      manufacturer: manufacturer.trim() || null,
      min_stock_level: parseFloat(minStock) || 0,
      reorder_level: parseFloat(reorderLevel) || 0,
      max_stock_level: parseFloat(maxStock) || 0,
      is_active: isActive,
    });

    if (!result.success) {
      setError(result.error || "Failed to create material.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <Modal title="Add Material" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Code / SKU *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="e.g. CEM-50KG"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {fieldErrors.code && <p className="mt-1 text-sm text-danger">{fieldErrors.code}</p>}
            <p className="mt-1 text-xs text-muted">Unique within your company.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Portland Cement 50kg"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {fieldErrors.name && <p className="mt-1 text-sm text-danger">{fieldErrors.name}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">— Select —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subcategory</label>
            <input
              type="text"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Unit of Measure</label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">— Select —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Manufacturer</label>
          <input
            type="text"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min Stock</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reorder Level</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Stock</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-border" />
            Active
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">
            {pending ? "Creating..." : "Create Material"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StockOperationModal({
  type,
  material,
  warehouses,
  onClose,
  onSuccess,
}: {
  type: "receive" | "issue" | "transfer" | "adjust" | "return";
  material: MaterialWithDetails;
  warehouses: Warehouse[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("IN");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titles: Record<typeof type, string> = {
    receive: "Receive Stock",
    issue: "Issue Stock",
    transfer: "Transfer Stock",
    adjust: "Adjust Stock",
    return: "Return Stock",
  };

  const icons: Record<typeof type, React.ReactNode> = {
    receive: <ArrowDownToLine className="h-5 w-5 text-green-600" />,
    issue: <ArrowUpFromLine className="h-5 w-5 text-orange-600" />,
    transfer: <ArrowLeftRight className="h-5 w-5 text-blue-600" />,
    adjust: <SlidersHorizontal className="h-5 w-5 text-purple-600" />,
    return: <Undo2 className="h-5 w-5 text-teal-600" />,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const qty = parseFloat(quantity);
    if (!warehouseId || (type === "transfer" && !toWarehouseId)) {
      setError("Please select warehouse(s).");
      setPending(false);
      return;
    }
    if (!qty || qty <= 0) {
      setError("Quantity must be a positive number.");
      setPending(false);
      return;
    }

    let result: { success: boolean; error?: string };
    const params = {
      materialId: material.id,
      quantity: qty,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    switch (type) {
      case "receive":
        result = await receiveStockRpc({ ...params, warehouseId });
        break;
      case "issue":
        result = await issueStockRpc({ ...params, warehouseId });
        break;
      case "transfer":
        result = await transferStockRpc({ ...params, fromWarehouseId: warehouseId, toWarehouseId });
        break;
      case "adjust":
        result = await adjustStockRpc({ ...params, warehouseId, adjustmentType });
        break;
      case "return":
        result = await returnStockRpc({ ...params, warehouseId });
        break;
    }

    if (!result.success) {
      setError(result.error || "Operation failed.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <Modal title={titles[type]} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
          {icons[type]}
          <div>
            <p className="font-medium">{material.name}</p>
            <p className="text-sm text-muted">{material.code} · {material.unit_abbreviation ?? material.unit_name ?? "—"}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {type === "transfer" ? (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">From Warehouse *</label>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">— Select —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Warehouse *</label>
              <select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} required className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">— Select —</option>
                {warehouses.filter((w) => w.id !== warehouseId).map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Warehouse *</label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="">— Select —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
        )}

        {type === "adjust" && (
          <div>
            <label className="block text-sm font-medium mb-1">Adjustment Type *</label>
            <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="IN">Adjustment In (+)</option>
              <option value="OUT">Adjustment Out (−)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Quantity *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            placeholder="0.00"
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reference</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="PO number, job code, etc."
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">
            {pending ? "Processing..." : "Confirm"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
