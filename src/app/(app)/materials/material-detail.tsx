"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Edit, Package, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, SlidersHorizontal, Undo2 } from "lucide-react";
import { ActiveBadge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import {
  getMaterialById,
  getWarehouseStockByMaterial,
  getStockMovementsByMaterial,
  getWarehouses,
  updateMaterial,
  receiveStockRpc,
  issueStockRpc,
  transferStockRpc,
  adjustStockRpc,
  returnStockRpc,
} from "@/lib/client-queries";
import type { MaterialWithDetails, WarehouseStock, StockMovement, Warehouse } from "@/types/database";
import { MOVEMENT_TYPE_LABELS } from "@/types/database";

export function MaterialDetail({
  materialId,
  companyId,
  onBack,
}: {
  materialId: string;
  companyId: string;
  onBack: () => void;
}) {
  const [material, setMaterial] = useState<MaterialWithDetails | null>(null);
  const [stock, setStock] = useState<WarehouseStock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [stockOperation, setStockOperation] = useState<"receive" | "issue" | "transfer" | "adjust" | "return" | null>(null);

  const canManageMaterials = true;
  const canManageStock = true;

  const loadData = useCallback(async () => {
    if (!companyId || !materialId) return;
    setLoading(true);
    const [mat, stk, mov, whs] = await Promise.all([
      getMaterialById(companyId, materialId),
      getWarehouseStockByMaterial(companyId, materialId),
      getStockMovementsByMaterial(companyId, materialId, 20),
      getWarehouses(companyId),
    ]);
    setMaterial(mat);
    setStock(stk);
    setMovements(mov);
    setWarehouses(whs.filter((w) => w.is_active));
    setLoading(false);
  }, [companyId, materialId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><p className="text-muted">Loading...</p></div>;
  }

  if (!material) {
    return (
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Materials
        </button>
        <EmptyState title="Material Not Found" description="This material may have been deleted or you don't have access." />
      </div>
    );
  }

  const totalStock = stock.reduce((sum, s) => sum + Number(s.quantity), 0);
  const totalReserved = stock.reduce((sum, s) => sum + Number(s.reserved), 0);
  const totalAvailable = totalStock - totalReserved;

  return (
    <>
      <div className="mb-4">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Materials
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{material.name}</h1>
          <p className="text-sm text-muted">{material.code} · {material.category_name ?? "Uncategorized"}</p>
        </div>
        {canManageMaterials && (
          <button onClick={() => setShowEditModal(true)} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50">
            <Edit className="h-4 w-4" /> Edit
          </button>
        )}
      </div>

      {canManageStock && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setStockOperation("receive")} className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
            <ArrowDownToLine className="h-4 w-4" /> Receive
          </button>
          <button onClick={() => setStockOperation("issue")} className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700">
            <ArrowUpFromLine className="h-4 w-4" /> Issue
          </button>
          <button onClick={() => setStockOperation("transfer")} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            <ArrowLeftRight className="h-4 w-4" /> Transfer
          </button>
          <button onClick={() => setStockOperation("adjust")} className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700">
            <SlidersHorizontal className="h-4 w-4" /> Adjust
          </button>
          <button onClick={() => setStockOperation("return")} className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
            <Undo2 className="h-4 w-4" /> Return
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Material Information</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Code</dt><dd className="font-medium">{material.code}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Name</dt><dd className="font-medium">{material.name}</dd></div>
            {material.description && <div className="flex justify-between"><dt className="text-muted">Description</dt><dd className="text-right max-w-[200px]">{material.description}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Category</dt><dd>{material.category_name ?? "—"}</dd></div>
            {material.subcategory && <div className="flex justify-between"><dt className="text-muted">Subcategory</dt><dd>{material.subcategory}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Unit</dt><dd>{material.unit_name ?? "—"} ({material.unit_abbreviation ?? "—"})</dd></div>
            {material.brand && <div className="flex justify-between"><dt className="text-muted">Brand</dt><dd>{material.brand}</dd></div>}
            {material.manufacturer && <div className="flex justify-between"><dt className="text-muted">Manufacturer</dt><dd>{material.manufacturer}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Active</dt><dd><ActiveBadge isActive={material.is_active} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Created</dt><dd>{new Date(material.created_at).toLocaleDateString()}</dd></div>
          </dl>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Stock Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-sm text-muted">Total Stock</span><span className="text-2xl font-bold">{Number(totalStock).toLocaleString()}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-muted">Reserved</span><span className="text-lg font-medium text-orange-600">{Number(totalReserved).toLocaleString()}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-muted">Available</span><span className="text-lg font-medium text-green-600">{Number(totalAvailable).toLocaleString()}</span></div>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted">Minimum Level</span><span>{Number(material.min_stock_level).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted">Reorder Level</span><span>{Number(material.reorder_level).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted">Maximum Level</span><span>{Number(material.max_stock_level).toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Warehouse Distribution</h3>
          {stock.length === 0 ? (
            <p className="text-sm text-muted">No stock in any warehouse.</p>
          ) : (
            <div className="space-y-3">
              {stock.map((s) => (
                <div key={s.id} className="border border-border rounded-md p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">{s.warehouse_name ?? s.warehouse_code ?? "—"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted">Qty:</span> <span className="font-medium">{Number(s.quantity).toLocaleString()}</span></div>
                    <div><span className="text-muted">Reserved:</span> <span className="font-medium">{Number(s.reserved).toLocaleString()}</span></div>
                    <div><span className="text-muted">Avail:</span> <span className="font-medium text-green-600">{(Number(s.quantity) - Number(s.reserved)).toLocaleString()}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Recent Movements</h3>
        </div>
        {movements.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Package className="h-8 w-8 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">No stock movements yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">Date</th>
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">Type</th>
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">Warehouse</th>
                <th className="px-5 py-2 text-right text-xs font-semibold text-muted uppercase">Quantity</th>
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">Reference</th>
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2 text-sm">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="px-5 py-2"><MovementTypeBadge type={m.movement_type} /></td>
                  <td className="px-5 py-2 text-sm">{m.warehouse_name ?? m.warehouse_code ?? "—"}</td>
                  <td className="px-5 py-2 text-right text-sm font-medium">
                    {["RECEIPT", "TRANSFER_IN", "ADJUSTMENT_IN", "RETURN"].includes(m.movement_type) ? "+" : "−"}
                    {Number(m.quantity).toLocaleString()}
                  </td>
                  <td className="px-5 py-2 text-sm text-muted">{m.reference ?? "—"}</td>
                  <td className="px-5 py-2 text-sm text-muted">{m.user_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditModal && (
        <EditMaterialModal material={material} onClose={() => setShowEditModal(false)} onSuccess={() => { setShowEditModal(false); loadData(); }} />
      )}

      {stockOperation && (
        <StockOpModal type={stockOperation} material={material} warehouses={warehouses} onClose={() => setStockOperation(null)} onSuccess={() => { setStockOperation(null); loadData(); }} />
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
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {MOVEMENT_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl">×</button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function EditMaterialModal({ material, onClose, onSuccess }: { material: MaterialWithDetails; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(material.name);
  const [description, setDescription] = useState(material.description ?? "");
  const [brand, setBrand] = useState(material.brand ?? "");
  const [manufacturer, setManufacturer] = useState(material.manufacturer ?? "");
  const [minStock, setMinStock] = useState(String(material.min_stock_level));
  const [reorderLevel, setReorderLevel] = useState(String(material.reorder_level));
  const [maxStock, setMaxStock] = useState(String(material.max_stock_level));
  const [isActive, setIsActive] = useState(material.is_active);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await updateMaterial(material.id, {
      name: name.trim(),
      description: description.trim() || null,
      brand: brand.trim() || null,
      manufacturer: manufacturer.trim() || null,
      min_stock_level: parseFloat(minStock) || 0,
      reorder_level: parseFloat(reorderLevel) || 0,
      max_stock_level: parseFloat(maxStock) || 0,
      is_active: isActive,
    });
    if (!result.success) {
      setError(result.error || "Failed to update material.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <Modal title="Edit Material" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div><label className="block text-sm font-medium mb-1">Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
        <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Brand</label><input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
          <div><label className="block text-sm font-medium mb-1">Manufacturer</label><input type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1">Min Stock</label><input type="number" step="0.01" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
          <div><label className="block text-sm font-medium mb-1">Reorder Level</label><input type="number" step="0.01" min="0" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
          <div><label className="block text-sm font-medium mb-1">Max Stock</label><input type="number" step="0.01" min="0" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
        </div>
        <div><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-border" />Active</label></div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">{pending ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </Modal>
  );
}

function StockOpModal({ type, material, warehouses, onClose, onSuccess }: { type: "receive" | "issue" | "transfer" | "adjust" | "return"; material: MaterialWithDetails; warehouses: Warehouse[]; onClose: () => void; onSuccess: () => void }) {
  const [warehouseId, setWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("IN");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titles: Record<string, string> = { receive: "Receive Stock", issue: "Issue Stock", transfer: "Transfer Stock", adjust: "Adjust Stock", return: "Return Stock" };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const qty = parseFloat(quantity);
    if (!warehouseId || (type === "transfer" && !toWarehouseId)) { setError("Please select warehouse(s)."); setPending(false); return; }
    if (!qty || qty <= 0) { setError("Quantity must be a positive number."); setPending(false); return; }

    const params = { materialId: material.id, quantity: qty, reference: reference.trim() || undefined, notes: notes.trim() || undefined };
    let result: { success: boolean; error?: string };
    switch (type) {
      case "receive": result = await receiveStockRpc({ ...params, warehouseId }); break;
      case "issue": result = await issueStockRpc({ ...params, warehouseId }); break;
      case "transfer": result = await transferStockRpc({ ...params, fromWarehouseId: warehouseId, toWarehouseId }); break;
      case "adjust": result = await adjustStockRpc({ ...params, warehouseId, adjustmentType }); break;
      case "return": result = await returnStockRpc({ ...params, warehouseId }); break;
    }
    if (!result.success) { setError(result.error || "Operation failed."); setPending(false); } else { onSuccess(); }
  };

  return (
    <Modal title={titles[type]} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-md bg-gray-50 p-3"><p className="font-medium">{material.name}</p><p className="text-sm text-muted">{material.code} · {material.unit_abbreviation ?? material.unit_name ?? "—"}</p></div>
        {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
        {type === "transfer" ? (
          <>
            <div><label className="block text-sm font-medium mb-1">From Warehouse *</label><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="">— Select —</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">To Warehouse *</label><select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} required className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="">— Select —</option>{warehouses.filter((w) => w.id !== warehouseId).map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}</select></div>
          </>
        ) : (
          <div><label className="block text-sm font-medium mb-1">Warehouse *</label><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="">— Select —</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}</select></div>
        )}
        {type === "adjust" && <div><label className="block text-sm font-medium mb-1">Adjustment Type *</label><select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="IN">Adjustment In (+)</option><option value="OUT">Adjustment Out (−)</option></select></div>}
        <div><label className="block text-sm font-medium mb-1">Quantity *</label><input type="number" step="0.01" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} required placeholder="0.00" className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
        <div><label className="block text-sm font-medium mb-1">Reference</label><input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO number, job code, etc." className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
        <div><label className="block text-sm font-medium mb-1">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">{pending ? "Processing..." : "Confirm"}</button>
        </div>
      </form>
    </Modal>
  );
}
