import { notFound } from "next/navigation";
import {
  getUserCompanies,
  getJobById,
  getProjects,
} from "@/lib/queries";
import EditJobForm from "./edit-job-form";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companies = await getUserCompanies();
  const companyId = companies[0]?.id;

  if (!companyId) notFound();

  const job = await getJobById(companyId, id);
  if (!job) notFound();

  const projects = await getProjects(companyId);

  return <EditJobForm job={job} projects={projects} />;
}
