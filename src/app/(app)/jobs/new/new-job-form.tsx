"use client";

import { useActionState, useEffect } from "react";
import {
  createJob,
  type JobFormState,
} from "@/app/actions/jobs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Project } from "@/types/database";

export default function NewJobForm({ projects }: { projects: Project[] }) {
  const [state, action, pending] = useActionState<JobFormState, FormData>(
    createJob,
    undefined
  );

  return (
    <div className="max-w-2xl">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>

      <h1 className="text-2xl font-bold mb-6">New Job</h1>

      {state?.message && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md px-4 py-3 text-sm text-yellow-700">
          You need to create a project before you can create jobs.{" "}
          <Link href="/projects/new" className="font-medium underline">
            Create a project
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-6">
          <form action={action} className="space-y-4">
            <div>
              <label
                htmlFor="project_id"
                className="block text-sm font-medium mb-1"
              >
                Project <span className="text-danger">*</span>
              </label>
              <select
                id="project_id"
                name="project_id"
                required
                defaultValue=""
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="" disabled>
                  Select a project...
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              {state?.errors?.project_id && (
                <p className="mt-1 text-sm text-danger">
                  {state.errors.project_id[0]}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-1">
                Code <span className="text-danger">*</span>
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                placeholder="e.g. JOB-001"
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {state?.errors?.code && (
                <p className="mt-1 text-sm text-danger">
                  {state.errors.code[0]}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name <span className="text-danger">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {state?.errors?.name && (
                <p className="mt-1 text-sm text-danger">
                  {state.errors.name[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {state?.errors?.description && (
                <p className="mt-1 text-sm text-danger">
                  {state.errors.description[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium mb-1"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="active"
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {state?.errors?.status && (
                <p className="mt-1 text-sm text-danger">
                  {state.errors.status[0]}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pending ? "Creating..." : "Create Job"}
              </button>
              <Link
                href="/jobs"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
