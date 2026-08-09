import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActiveBadge } from "@/components/badge";
import { toggleWarehouseStatus } from "@/app/actions/warehouses";
import { getUserCompanies, getWarehouseById } from "@/lib/queries";

export default async function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companies = await getUserCompanies();
  const companyId = companies[0]?.id;

  if (!companyId) notFound();

  const warehouse = await getWarehouseById(companyId, id);
  if (!warehouse) notFound();

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
              href={`/warehouses/${warehouse.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={toggleWarehouseStatus}>
              <input type="hidden" name="id" value={warehouse.id} />
              <input
                type="hidden"
                name="is_active"
                value={String(warehouse.is_active)}
              />
              <button
                type="submit"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {warehouse.is_active ? "Deactivate" : "Activate"}
              </button>
            </form>
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
