import { notFound } from "next/navigation";
import { getUserCompanies, getWarehouseById } from "@/lib/queries";
import EditWarehouseForm from "./edit-warehouse-form";

export default async function EditWarehousePage({
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

  return <EditWarehouseForm warehouse={warehouse} />;
}
