import { getUserCompanies, getProjects } from "@/lib/queries";
import NewJobForm from "./new-job-form";

export default async function NewJobPage() {
  const companies = await getUserCompanies();
  const companyId = companies[0]?.id;

  if (!companyId) {
    return <NewJobForm projects={[]} />;
  }

  const projects = await getProjects(companyId);
  return <NewJobForm projects={projects} />;
}
