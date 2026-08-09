import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, ActiveBadge } from "@/components/badge";
import { getUserCompanies, getJobs } from "@/lib/queries";

export default async function JobsPage() {
  const companies = await getUserCompanies();
  const companyId = companies[0]?.id;

  if (!companyId) {
    return (
      <EmptyState
        title="No Company Found"
        description="Your account is not associated with any company."
      />
    );
  }

  const jobs = await getJobs(companyId);

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Manage execution units across all projects"
        actions={
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Job
          </Link>
        }
      />

      {jobs.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={<Wrench className="h-6 w-6" />}
            title="No Jobs Yet"
            description="Create your first job to track material consumption at the execution level."
            action={
              <Link
                href="/jobs/new"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Job
              </Link>
            }
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Code
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Project
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {job.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm">{job.name}</td>
                  <td className="px-5 py-3 text-sm text-muted">
                    <Link
                      href={`/projects/${job.project_id}`}
                      className="hover:underline"
                    >
                      {job.project_code}
                    </Link>
                    {" — "}
                    {job.project_name}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-5 py-3">
                    <ActiveBadge isActive={job.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
