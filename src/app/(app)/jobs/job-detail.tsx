"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActiveBadge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import { useCompanyData } from "@/lib/use-company-data";
import { getJobById } from "@/lib/client-queries";
import { toggleJobStatus } from "@/lib/client-jobs";
import type { JobWithProject } from "@/types/database";

export function JobDetail({ jobId }: { jobId: string }) {
  const { company } = useCompanyData();
  const [job, setJob] = useState<JobWithProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    getJobById(company.id, jobId).then((j) => {
      setJob(j);
      setLoading(false);
    });
  }, [company, jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <EmptyState
        title="Job Not Found"
        description="This job may have been deleted or you don't have access."
      />
    );
  }

  const handleToggle = async () => {
    await toggleJobStatus(job.id, job.is_active);
    setJob({ ...job, is_active: !job.is_active });
  };

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
              href={`/jobs/edit?id=${job.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <button
              onClick={handleToggle}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {job.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Start Date
          </div>
          <div className="text-sm font-medium">
            {job.start_date
              ? new Date(job.start_date).toLocaleDateString()
              : "—"}
          </div>
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
            href={`/projects?id=${job.project_id}`}
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
