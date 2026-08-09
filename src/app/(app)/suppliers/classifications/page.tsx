"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, ListTree, X, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ActiveBadge } from "@/components/badge";
import { useCompanyData } from "@/lib/use-company-data";
import {
  getSupplierClassifications,
  createSupplierClassification,
} from "@/lib/client-queries";
import type { SupplierClassification } from "@/types/database";

export default function SupplierClassificationsPage() {
  const { company, loading } = useCompanyData();
  const [classifications, setClassifications] = useState<SupplierClassification[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const canManage = company?.role_name === "Company Admin" || company?.role_name === "Warehouse Manager";

  const loadData = useCallback(async () => {
    if (!company) return;
    setDataLoading(true);
    const data = await getSupplierClassifications(company.id);
    setClassifications(data);
    setDataLoading(false);
  }, [company]);

  useEffect(() => {
    if (!loading && company) {
      loadData();
    } else if (!loading && !company) {
      setDataLoading(false);
    }
  }, [loading, company, loadData]);

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
        title="Supplier Classifications"
        description="Organize suppliers by type or category"
        breadcrumbs={[
          { label: "Suppliers", href: "/suppliers" },
          { label: "Classifications" },
        ]}
        actions={
          canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Classification
            </button>
          )
        }
      />

      {classifications.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={<ListTree className="h-6 w-6" />}
            title="No Classifications Yet"
            description="Create classifications to group your suppliers by type, region, or any criteria."
            action={
              canManage && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Classification
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Active
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classifications.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{c.name}</td>
                  <td className="px-5 py-3">
                    <ActiveBadge isActive={c.is_active} />
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddClassificationModal
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

function AddClassificationModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { company } = useCompanyData();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (!company || !name.trim()) {
      setError("Classification name is required.");
      setPending(false);
      return;
    }

    const result = await createSupplierClassification(company.id, name.trim());
    if (!result.success) {
      setError(result.error || "Failed to create classification.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Add Classification</h2>
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
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Local, International, OEM"
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
              {pending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
