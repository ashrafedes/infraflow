import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, ActiveBadge } from "@/components/badge";
import { toggleJobStatus } from "@/app/actions/jobs";
import { getUserCompanies, getJobById } from "@/lib/queries";

export default async function JobDetailPage({
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

  return (
    <>
      <PageHeader
        title={job.name}
        description={`Job ${job.code}`}
        breadcrumbs={[
          { label: "Jobs", href: "/jobs" },
          { label: job.code },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/jobs/${job.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={toggleJobStatus}>
              <input type="hidden" name="id" value={job.id} />
              <input
                type="hidden"
                name="is_active"
                value={String(job.is_active)}
              />
              <button
                type="submit"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {job.is_active ? "Deactivate" : "Activate"}
              </button>
            </form>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Status
          </div>
          <StatusBadge status={job.status} />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Active
          </div>
          <ActiveBadge isActive={job.is_active} />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Project
          </div>
          <Link
            href={`/projects/${job.project_id}`}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            <FolderKanban className="h-3 w-3" />
            {job.project_code}
          </Link>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Project Name
          </div>
          <div className="text-sm font-medium">{job.project_name}</div>
        </div>
      </div>

      {job.description && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-2">Description</h3>
          <p className="text-sm text-muted">{job.description}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-5 mt-6">
        <h3 className="text-sm font-semibold mb-2">Material Consumption</h3>
        <p className="text-sm text-muted">
          Material issue tracking for this job will be available in Phase 3
          (Inventory).
        </p>
      </div>
    </>
  );
}
