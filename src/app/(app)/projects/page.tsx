"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ActiveBadge } from "@/components/badge";
import { useCompanyData } from "@/lib/use-company-data";
import { getProjects, type ProjectWithCounts } from "@/lib/client-queries";
import { ProjectDetail } from "./project-detail";

export default function ProjectsPage() {
  const { company, loading } = useCompanyData();
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  useEffect(() => {
    if (!company) return;
    getProjects(company.id).then(setProjects);
  }, [company]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <EmptyState
        title="No Company Found"
        description="Your account is not associated with any company."
      />
    );
  }

  if (selectedId) {
    return <ProjectDetail projectId={selectedId} />;
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Manage your company's projects"
        actions={
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        }
      />

      {projects.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={<FolderKanban className="h-6 w-6" />}
            title="No Projects Yet"
            description="Create your first project to start managing jobs and material consumption."
            action={
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Project
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
                  Jobs
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/projects?id=${project.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {project.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm">{project.name}</td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {project.job_count}
                  </td>
                  <td className="px-5 py-3">
                    <ActiveBadge isActive={project.is_active} />
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
