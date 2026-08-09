import { notFound } from "next/navigation";
import { getUserCompanies, getProjectById } from "@/lib/queries";
import EditProjectForm from "./edit-project-form";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companies = await getUserCompanies();
  const companyId = companies[0]?.id;

  if (!companyId) notFound();

  const project = await getProjectById(companyId, id);
  if (!project) notFound();

  return <EditProjectForm project={project} />;
}
