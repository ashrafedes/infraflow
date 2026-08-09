import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Wrench, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, ActiveBadge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import { toggleProjectStatus } from "@/app/actions/projects";
import {
  getUserCompanies,
  getProjectById,
  getJobsByProject,
} from "@/lib/queries";

export default async function ProjectDetailPage({
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

  const jobs = await getJobsByProject(companyId, id);

  return (
    <>
      <PageHeader
        title={project.name}
        description={`Project ${project.code}`}
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: project.code },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${project.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={toggleProjectStatus}>
              <input type="hidden" name="id" value={project.id} />
              <input
                type="hidden"
                name="is_active"
                value={String(project.is_active)}
              />
              <button
                type="submit"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {project.is_active ? "Deactivate" : "Activate"}
              </button>
            </form>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Status
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Active
          </div>
          <ActiveBadge isActive={project.is_active} />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Total Jobs
          </div>
          <div className="text-lg font-bold">{jobs.length}</div>
        </div>
      </div>

      {project.description && (
        <div className="bg-card border border-border rounded-lg p-5 mb-6">
          <h3 className="text-sm font-semibold mb-2">Description</h3>
          <p className="text-sm text-muted">{project.description}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Jobs
          </h2>
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Add Job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-6 w-6" />}
            title="No Jobs in This Project"
            description="Create jobs to track material consumption at the execution level."
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
        ) : (
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
        )}
      </div>
    </>
  );
}
