"use client";

import { PageHeader } from "@/components/page-header";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Star,
  GitFork,
  CircleDot,
  FileCode2,
  CircleDashed,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const REPO_URL = "https://github.com/ashrafedes/infraflow";
const REPO_NAME = "ashrafedes/infraflow";

const localCommits = [
  {
    message: "feat: add GitHub sample page with repo overview",
    author: "ashrafedes",
    sha: "local",
    time: "just now",
  },
  {
    message: "feat: add warehouse CRUD pages with RLS policies",
    author: "ashrafedes",
    sha: "local",
    time: "earlier today",
  },
  {
    message: "feat: add jobs CRUD pages with project association",
    author: "ashrafedes",
    sha: "local",
    time: "earlier today",
  },
  {
    message: "feat: add projects CRUD pages with Zod validation",
    author: "ashrafedes",
    sha: "local",
    time: "earlier today",
  },
  {
    message: "feat: build dashboard with overview stats",
    author: "ashrafedes",
    sha: "local",
    time: "earlier today",
  },
  {
    message: "feat: implement Supabase auth with server actions",
    author: "ashrafedes",
    sha: "local",
    time: "earlier today",
  },
  {
    message: "feat: create database migrations with RLS policies",
    author: "ashrafedes",
    sha: "local",
    time: "earlier today",
  },
  {
    message: "chore: initialize Next.js 16 with TypeScript and Tailwind",
    author: "ashrafedes",
    sha: "local",
    time: "earlier today",
  },
];

const projectFiles = [
  { path: "src/app/", description: "Next.js App Router pages and layouts" },
  { path: "src/app/(app)/", description: "Authenticated route group" },
  { path: "src/app/(app)/dashboard/", description: "Dashboard with stats" },
  { path: "src/app/(app)/projects/", description: "Project CRUD (list, new, edit, detail)" },
  { path: "src/app/(app)/jobs/", description: "Job CRUD (list, new, edit, detail)" },
  { path: "src/app/(app)/warehouses/", description: "Warehouse CRUD (list, new, edit, detail)" },
  { path: "src/components/", description: "Shared UI components (sidebar, badges, etc.)" },
  { path: "src/lib/supabase/client.ts", description: "Client-side Supabase singleton" },
  { path: "src/lib/auth-context.tsx", description: "Client-side auth context provider" },
  { path: "src/lib/client-queries.ts", description: "Client-side data queries" },
  { path: "src/lib/client-auth.ts", description: "Client-side auth mutations" },
  { path: "src/lib/client-projects.ts", description: "Client-side project mutations" },
  { path: "src/lib/client-jobs.ts", description: "Client-side job mutations" },
  { path: "src/lib/client-warehouses.ts", description: "Client-side warehouse mutations" },
  { path: "src/types/database.ts", description: "TypeScript interfaces for DB models" },
  { path: "supabase/migrations/", description: "SQL migration files with RLS" },
];

export default function GitHubPage() {
  return (
    <>
      <PageHeader
        title="GitHub"
        description={`Repository: ${REPO_NAME}`}
        actions={
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            <FileCode2 className="h-4 w-4" />
            View on GitHub
          </a>
        }
      />

      {/* Repo status banner */}
      <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-yellow-800">
            Repository is empty on GitHub
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            Your local code has not been pushed yet. Run the following commands
            to publish:
          </p>
          <pre className="mt-2 text-xs bg-yellow-100 border border-yellow-200 rounded-md p-3 overflow-x-auto">
            <code>{`git remote add origin https://github.com/ashrafedes/infraflow.git
git branch -M main
git push -u origin main`}</code>
          </pre>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Repository card */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Repository
          </h2>

          <div className="bg-card border border-border rounded-lg p-5 hover:border-primary transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-primary hover:underline">
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {REPO_NAME}
                  </a>
                </h3>
                <p className="text-sm text-muted mt-1">
                  Construction Material Management &amp; Warehouse Control —
                  multi-tenant SaaS platform built with Next.js 16, TypeScript,
                  Tailwind CSS v4, and Supabase.
                </p>
              </div>
              <span
                className="inline-flex items-center gap-1.5 text-xs text-muted shrink-0"
                title="Primary language"
              >
                <CircleDot
                  className="h-3 w-3"
                  style={{ fill: "#3178c6" }}
                />
                TypeScript
              </span>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                0
              </span>
              <span className="inline-flex items-center gap-1">
                <GitFork className="h-3.5 w-3.5" />
                0
              </span>
              <span className="inline-flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5" />
                main
              </span>
              <span className="inline-flex items-center gap-1">
                <CircleDashed className="h-3.5 w-3.5" />
                0 issues
              </span>
              <span className="inline-flex items-center gap-1">
                <GitPullRequest className="h-3.5 w-3.5" />
                0 PRs
              </span>
              <span className="ml-auto">Not yet pushed</span>
            </div>
          </div>

          {/* Project structure */}
          <h2 className="text-lg font-semibold flex items-center gap-2 pt-2">
            <FileCode2 className="h-5 w-5" />
            Project Structure
          </h2>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                {projectFiles.map((file) => (
                  <tr key={file.path} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5">
                      <code className="text-sm font-mono text-primary">
                        {file.path}
                      </code>
                    </td>
                    <td className="px-5 py-2.5 text-sm text-muted">
                      {file.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Local commits + push status */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Local Commits
          </h2>

          <div className="bg-card border border-border rounded-lg">
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {localCommits.map((commit, i) => (
                <div key={i} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary text-xs font-medium">
                      {commit.author[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {commit.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                        <span>{commit.author}</span>
                        <span>·</span>
                        <span>{commit.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Push checklist */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Push Checklist
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>Code builds successfully</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>README.md created</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>.env.example created (no secrets)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                <span>Git remote not yet configured</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                <span>Code not yet committed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
