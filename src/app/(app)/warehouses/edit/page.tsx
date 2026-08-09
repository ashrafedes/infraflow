"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateWarehouse, type WarehouseFormState } from "@/lib/client-warehouses";
import { useCompanyData } from "@/lib/use-company-data";
import { getWarehouseById } from "@/lib/client-queries";
import type { Warehouse } from "@/types/database";

export default function EditWarehousePage() {
  const { company } = useCompanyData();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<WarehouseFormState>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get("id");

  useEffect(() => {
    if (!company || !warehouseId) return;
    getWarehouseById(company.id, warehouseId).then((w) => {
      setWarehouse(w);
      setLoading(false);
    });
  }, [company, warehouseId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setState({});
    if (!warehouseId) return;

    const formData = new FormData(e.currentTarget);
    const result = await updateWarehouse(warehouseId, formData);

    if (result.message || result.errors) {
      setState(result);
      setPending(false);
    } else {
      router.push("/warehouses");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-16">
        <p className="text-muted">Warehouse not found.</p>
        <Link href="/warehouses" className="text-primary hover:underline mt-2 inline-block">
          Back to Warehouses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link
        href={`/warehouses?id=${warehouse.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Warehouse
      </Link>

      <h1 className="text-2xl font-bold mb-6">Edit Warehouse</h1>

      {state.message && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-1">
              Code <span className="text-danger">*</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              defaultValue={warehouse.code}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {state.errors?.code && (
              <p className="mt-1 text-sm text-danger">{state.errors.code[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name <span className="text-danger">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={warehouse.name}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {state.errors?.name && (
              <p className="mt-1 text-sm text-danger">{state.errors.name[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium mb-1">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              defaultValue={warehouse.location ?? ""}
              placeholder="e.g. Riyadh, Saudi Arabia"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={`/warehouses?id=${warehouse.id}`}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
