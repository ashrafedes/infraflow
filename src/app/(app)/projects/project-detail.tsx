"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Wrench, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActiveBadge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import { useCompanyData } from "@/lib/use-company-data";
import {
  getProjectById,
  getJobsByProject,
} from "@/lib/client-queries";
import { toggleProjectStatus } from "@/lib/client-projects";
import type { Project, Job } from "@/types/database";

export function ProjectDetail({ projectId }: { projectId: string }) {
  const { company } = useCompanyData();
  const [project, setProject] = useState<Project | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!company) return;
    Promise.all([
      getProjectById(company.id, projectId),
      getJobsByProject(company.id, projectId),
    ]).then(([p, j]) => {
      setProject(p);
      setJobs(j);
      setLoading(false);
    });
  }, [company, projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        title="Project Not Found"
        description="This project may have been deleted or you don't have access."
      />
    );
  }

  const handleToggle = async () => {
    await toggleProjectStatus(project.id, project.is_active);
    setProject({ ...project, is_active: !project.is_active });
  };

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
              href={`/projects/edit?id=${project.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <button
              onClick={handleToggle}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {project.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">
            Start Date
          </div>
          <div className="text-sm font-medium">
            {project.start_date
              ? new Date(project.start_date).toLocaleDateString()
              : "—"}
          </div>
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
                  Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/jobs?id=${job.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {job.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm">{job.name}</td>
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
