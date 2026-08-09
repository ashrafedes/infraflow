"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Truck, Search, X, Star } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useCompanyData } from "@/lib/use-company-data";
import {
  getSuppliers,
  getSupplierClassifications,
  createSupplier,
} from "@/lib/client-queries";
import type { SupplierWithDetails, SupplierClassification } from "@/types/database";
import { SupplierDetail } from "./supplier-detail";

export default function SuppliersPage() {
  const { company, loading } = useCompanyData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [suppliers, setSuppliers] = useState<SupplierWithDetails[]>([]);
  const [classifications, setClassifications] = useState<SupplierClassification[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAddModal, setShowAddModal] = useState(false);

  const isAdmin = useMemo(
    () => company?.role_name === "Company Admin",
    [company]
  );

  const loadData = useCallback(async () => {
    if (!company) return;
    setDataLoading(true);
    const [s, c] = await Promise.all([
      getSuppliers(company.id),
      getSupplierClassifications(company.id),
    ]);
    setSuppliers(s);
    setClassifications(c);
    setDataLoading(false);
  }, [company]);

  useEffect(() => {
    if (!loading && company) {
      loadData();
    } else if (!loading && !company) {
      setDataLoading(false);
    }
  }, [loading, company, loadData]);

  const filteredSuppliers = useMemo(() => {
    let result = [...suppliers];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.contact_person?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (classificationFilter !== "all") {
      result = result.filter((s) => s.classification_id === classificationFilter);
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "code") cmp = a.code.localeCompare(b.code);
      else if (sortBy === "status") cmp = a.status.localeCompare(b.status);
      else cmp = a.created_at.localeCompare(b.created_at);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [suppliers, search, statusFilter, classificationFilter, sortBy, sortDir]);

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
      <EmptyState
        title="No Company Found"
        description="Your account is not associated with any company."
      />
    );
  }

  if (selectedId) {
    return <SupplierDetail supplierId={selectedId} />;
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 border-green-200",
    INACTIVE: "bg-gray-100 text-gray-600 border-gray-200",
    BLOCKED: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Manage your company's suppliers and material relationships"
        actions={
          isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search by name, code, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-white pl-10 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="BLOCKED">Blocked</option>
        </select>
        {classifications.length > 0 && (
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="all">All Classifications</option>
            {classifications.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={<Truck className="h-6 w-6" />}
            title={suppliers.length === 0 ? "No Suppliers Yet" : "No Matching Suppliers"}
            description={
              suppliers.length === 0
                ? "Add your first supplier to start managing material sourcing."
                : "Try adjusting your search or filters."
            }
            action={
              isAdmin && suppliers.length === 0 ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Supplier
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
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("code")}
                >
                  Code {sortBy === "code" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("name")}
                >
                  Name {sortBy === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Classification
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Materials
                </th>
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("status")}
                >
                  Status {sortBy === "status" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSuppliers.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/suppliers?id=${s.id}`)}
                >
                  <td className="px-5 py-3 font-medium text-primary">
                    {s.code}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    <div className="font-medium">{s.name}</div>
                    {s.legal_name && (
                      <div className="text-xs text-muted">{s.legal_name}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {s.contact_person || s.email || "—"}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {s.classification_name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {s.material_count}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        statusColors[s.status] ?? statusColors.INACTIVE
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddSupplierModal
          classifications={classifications}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}
    </>
  );
}

function AddSupplierModal({
  classifications,
  onClose,
  onSuccess,
}: {
  classifications: SupplierClassification[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { company } = useCompanyData();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [classificationId, setClassificationId] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (!company) return;
    if (!code.trim() || !name.trim()) {
      setError("Supplier code and name are required.");
      setPending(false);
      return;
    }

    const result = await createSupplier({
      company_id: company.id,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      legal_name: legalName.trim() || null,
      classification_id: classificationId || null,
      contact_person: contactPerson.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      alternate_phone: null,
      website: null,
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
      setError(result.error || "Failed to create supplier.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Add Supplier</h2>
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
              <label className="block text-sm font-medium mb-1">
                Code <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="SUP001"
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Legal Name</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Net 30"
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
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
              {pending ? "Creating..." : "Create Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
