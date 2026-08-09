"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  X,
  Plus,
  Star,
  Trash2,
  Mail,
  Phone,
  MapPin,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useCompanyData } from "@/lib/use-company-data";
import {
  getSupplierById,
  updateSupplier,
  getMaterialSuppliersBySupplier,
  getSupplierClassifications,
  removeMaterialSupplier,
  updateMaterialSupplier,
  getMaterials,
} from "@/lib/client-queries";
import type {
  Supplier,
  MaterialSupplierWithDetails,
  SupplierClassification,
  MaterialWithDetails,
} from "@/types/database";

export function SupplierDetail({ supplierId }: { supplierId: string }) {
  const { company } = useCompanyData();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [materialSuppliers, setMaterialSuppliers] = useState<MaterialSupplierWithDetails[]>([]);
  const [classifications, setClassifications] = useState<SupplierClassification[]>([]);
  const [materials, setMaterials] = useState<MaterialWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const isAdmin = useMemo(
    () => company?.role_name === "Company Admin",
    [company]
  );

  const loadData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    const [s, ms, c, m] = await Promise.all([
      getSupplierById(company.id, supplierId),
      getMaterialSuppliersBySupplier(supplierId),
      getSupplierClassifications(company.id),
      getMaterials(company.id),
    ]);
    setSupplier(s);
    setMaterialSuppliers(ms);
    setClassifications(c);
    setMaterials(m);
    setLoading(false);
  }, [company, supplierId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <EmptyState
        title="Supplier Not Found"
        description="This supplier may have been deleted or you don't have access."
      />
    );
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 border-green-200",
    INACTIVE: "bg-gray-100 text-gray-600 border-gray-200",
    BLOCKED: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <>
      <PageHeader
        title={supplier.name}
        description={`Supplier ${supplier.code}`}
        breadcrumbs={[
          { label: "Suppliers", href: "/suppliers" },
          { label: supplier.code },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/suppliers")}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3">Supplier Information</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted">Code: </span>
              <span className="font-medium">{supplier.code}</span>
            </div>
            <div>
              <span className="text-muted">Legal Name: </span>
              <span>{supplier.legal_name ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted">Status: </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                  statusColors[supplier.status] ?? statusColors.INACTIVE
                }`}
              >
                {supplier.status}
              </span>
            </div>
            <div>
              <span className="text-muted">Currency: </span>
              <span>{supplier.currency}</span>
            </div>
            <div>
              <span className="text-muted">Payment Terms: </span>
              <span>{supplier.payment_terms ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted">Tax/VAT: </span>
              <span>{supplier.tax_number ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3">Contact</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted">Contact:</span>
              <span>{supplier.contact_person ?? "—"}</span>
            </div>
            {supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted" />
                <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">
                  {supplier.email}
                </a>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted" />
                <span>{supplier.phone}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3">Address</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted mt-0.5" />
              <div>
                <div>{supplier.address ?? "—"}</div>
                <div className="text-muted">
                  {[supplier.city, supplier.country].filter(Boolean).join(", ") || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {supplier.notes && (
        <div className="bg-card border border-border rounded-lg p-5 mb-6">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </h3>
          <p className="text-sm text-muted">{supplier.notes}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Supplied Materials</h3>
          {isAdmin && (
            <button
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Link Material
            </button>
          )}
        </div>
        {materialSuppliers.length === 0 ? (
          <EmptyState
            title="No Materials Linked"
            description="Link materials to this supplier to track pricing and sourcing."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Material
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Supplier SKU
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  MOQ
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Lead Time
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Preferred
                </th>
                {isAdmin && (
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {materialSuppliers.map((ms) => (
                <tr key={ms.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium">{ms.material_code}</div>
                    <div className="text-xs text-muted">{ms.material_name}</div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {ms.supplier_sku ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {ms.unit_price.toLocaleString()} {ms.currency}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {ms.minimum_order_quantity > 0
                      ? ms.minimum_order_quantity.toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {ms.lead_time_days > 0 ? `${ms.lead_time_days} days` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {ms.is_preferred ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        Preferred
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={async () => {
                            if (ms.is_preferred) return;
                            const res = await updateMaterialSupplier(ms.id, {
                              is_preferred: true,
                            });
                            if (!res.success) alert(res.error);
                            else loadData();
                          }}
                          className="text-muted hover:text-amber-600 p-1 rounded hover:bg-gray-100"
                          title="Set as preferred"
                          disabled={ms.is_preferred}
                        >
                          <Star className={`h-4 w-4 ${ms.is_preferred ? "fill-amber-400 text-amber-400" : ""}`} />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Remove this material link?")) return;
                            const res = await removeMaterialSupplier(ms.id);
                            if (!res.success) alert(res.error);
                            else loadData();
                          }}
                          className="text-muted hover:text-red-600 p-1 rounded hover:bg-gray-100"
                          title="Remove link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-5 mt-6">
        <h3 className="text-sm font-semibold mb-2">Supplier Performance</h3>
        <p className="text-sm text-muted">
          Performance metrics will be available once purchase orders are implemented.
        </p>
      </div>

      {showEditModal && supplier && (
        <EditSupplierModal
          supplier={supplier}
          classifications={classifications}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadData();
          }}
        />
      )}

      {showLinkModal && (
        <LinkMaterialModal
          supplierId={supplier.id}
          materials={materials}
          existingMaterialIds={materialSuppliers.map((ms) => ms.material_id)}
          onClose={() => setShowLinkModal(false)}
          onSuccess={() => {
            setShowLinkModal(false);
            loadData();
          }}
        />
      )}
    </>
  );
}

function EditSupplierModal({
  supplier,
  classifications,
  onClose,
  onSuccess,
}: {
  supplier: Supplier;
  classifications: SupplierClassification[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(supplier.name);
  const [legalName, setLegalName] = useState(supplier.legal_name ?? "");
  const [classificationId, setClassificationId] = useState(supplier.classification_id ?? "");
  const [contactPerson, setContactPerson] = useState(supplier.contact_person ?? "");
  const [email, setEmail] = useState(supplier.email ?? "");
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [address, setAddress] = useState(supplier.address ?? "");
  const [city, setCity] = useState(supplier.city ?? "");
  const [country, setCountry] = useState(supplier.country ?? "");
  const [taxNumber, setTaxNumber] = useState(supplier.tax_number ?? "");
  const [paymentTerms, setPaymentTerms] = useState(supplier.payment_terms ?? "");
  const [currency, setCurrency] = useState(supplier.currency);
  const [notes, setNotes] = useState(supplier.notes ?? "");
  const [status, setStatus] = useState(supplier.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await updateSupplier(supplier.id, {
      name: name.trim(),
      legal_name: legalName.trim() || null,
      classification_id: classificationId || null,
      contact_person: contactPerson.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      tax_number: taxNumber.trim() || null,
      payment_terms: paymentTerms.trim() || null,
      currency,
      notes: notes.trim() || null,
      status,
    });

    if (!result.success) {
      setError(result.error || "Failed to update supplier.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Edit Supplier</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Legal Name</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Classification</label>
              <select
                value={classificationId}
                onChange={(e) => setClassificationId(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">None</option>
                {classifications.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax/VAT Number</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
                <option value="EGP">EGP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Terms</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
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
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LinkMaterialModal({
  supplierId,
  materials,
  existingMaterialIds,
  onClose,
  onSuccess,
}: {
  supplierId: string;
  materials: MaterialWithDetails[];
  existingMaterialIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { company } = useCompanyData();
  const [materialId, setMaterialId] = useState("");
  const [supplierSku, setSupplierSku] = useState("");
  const [supplierMaterialName, setSupplierMaterialName] = useState("");
  const [unitPrice, setUnitPrice] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [moq, setMoq] = useState("0");
  const [leadTimeDays, setLeadTimeDays] = useState("0");
  const [isPreferred, setIsPreferred] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableMaterials = materials.filter(
    (m) => !existingMaterialIds.includes(m.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (!company || !materialId) {
      setError("Please select a material.");
      setPending(false);
      return;
    }

    const { addMaterialSupplier } = await import("@/lib/client-queries");
    const result = await addMaterialSupplier({
      company_id: company.id,
      material_id: materialId,
      supplier_id: supplierId,
      supplier_sku: supplierSku.trim() || null,
      supplier_material_name: supplierMaterialName.trim() || null,
      unit_price: parseFloat(unitPrice) || 0,
      currency,
      minimum_order_quantity: parseFloat(moq) || 0,
      lead_time_days: parseInt(leadTimeDays) || 0,
      is_preferred: isPreferred,
      is_active: true,
      notes: notes.trim() || null,
      effective_date: new Date().toISOString().split("T")[0],
      expiry_date: null,
    });

    if (!result.success) {
      setError(result.error || "Failed to link material.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Link Material</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {availableMaterials.length === 0 ? (
            <p className="text-sm text-muted">
              All materials are already linked to this supplier.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Material</label>
                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  required
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select material...</option>
                  {availableMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier SKU</label>
                  <input
                    type="text"
                    value={supplierSku}
                    onChange={(e) => setSupplierSku(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier Material Name</label>
                  <input
                    type="text"
                    value={supplierMaterialName}
                    onChange={(e) => setSupplierMaterialName(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="SAR">SAR</option>
                    <option value="AED">AED</option>
                    <option value="EGP">EGP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lead Time (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">MOQ</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={moq}
                    onChange={(e) => setMoq(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium pt-6">
                    <input
                      type="checkbox"
                      checked={isPreferred}
                      onChange={(e) => setIsPreferred(e.target.checked)}
                      className="rounded border-border"
                    />
                    Set as Preferred Supplier
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending ? "Linking..." : "Link Material"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
