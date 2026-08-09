"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Pencil,
  FolderKanban,
  Plus,
  X,
  Package,
  ArrowDownToLine,
  CheckCircle2,
  History,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActiveBadge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import { useCompanyData } from "@/lib/use-company-data";
import {
  getJobById,
  getMaterials,
  getWarehouses,
  getJobMaterialRequirements,
  createJobMaterialRequirement,
  getJobMaterialUsage,
  issueMaterialToJobRpc,
  recordJobMaterialUsageRpc,
} from "@/lib/client-queries";
import { toggleJobStatus } from "@/lib/client-jobs";
import type {
  JobWithProject,
  MaterialWithDetails,
  Warehouse,
  JobMaterialRequirementWithDetails,
  JobMaterialUsage,
} from "@/types/database";
import { USAGE_TYPE_LABELS } from "@/types/database";

export function JobDetail({ jobId }: { jobId: string }) {
  const { company } = useCompanyData();
  const [job, setJob] = useState<JobWithProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "materials">("overview");

  useEffect(() => {
    if (!company) return;
    getJobById(company.id, jobId).then((j) => {
      setJob(j);
      setLoading(false);
    });
  }, [company, jobId]);

  const handleToggle = async () => {
    if (!job) return;
    await toggleJobStatus(job.id, job.is_active);
    setJob({ ...job, is_active: !job.is_active });
  };

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

      <div className="mb-6 flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("materials")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "materials"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Materials
        </button>
      </div>

      {activeTab === "overview" ? (
        <OverviewTab job={job} />
      ) : (
        <MaterialsTab jobId={jobId} companyId={company?.id ?? ""} />
      )}
    </>
  );
}

function OverviewTab({ job }: { job: JobWithProject }) {
  return (
    <>
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
    </>
  );
}

function MaterialsTab({ jobId, companyId }: { jobId: string; companyId: string }) {
  const [requirements, setRequirements] = useState<JobMaterialRequirementWithDetails[]>([]);
  const [usage, setUsage] = useState<JobMaterialUsage[]>([]);
  const [materials, setMaterials] = useState<MaterialWithDetails[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReqModal, setShowReqModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [reqs, usages, mats, whs] = await Promise.all([
      getJobMaterialRequirements(jobId),
      getJobMaterialUsage(jobId),
      getMaterials(companyId),
      getWarehouses(companyId),
    ]);
    setRequirements(reqs);
    setUsage(usages);
    setMaterials(mats);
    setWarehouses(whs.filter((w) => w.is_active));
    setLoading(false);
  }, [companyId, jobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summaries = useMemo(() => {
    const map = new Map<
      string,
      {
        material_id: string;
        material_code: string;
        material_name: string;
        unit_abbreviation: string | null;
        planned: number;
        issued: number;
        used: number;
        returned: number;
        wasted: number;
      }
    >();

    for (const r of requirements) {
      map.set(r.material_id, {
        material_id: r.material_id,
        material_code: r.material_code ?? "—",
        material_name: r.material_name ?? "—",
        unit_abbreviation: r.unit_abbreviation ?? null,
        planned: Number(r.planned_quantity),
        issued: 0,
        used: 0,
        returned: 0,
        wasted: 0,
      });
    }

    for (const u of usage) {
      let s = map.get(u.material_id);
      if (!s) {
        s = {
          material_id: u.material_id,
          material_code: u.material_code ?? "—",
          material_name: u.material_name ?? "—",
          unit_abbreviation: null,
          planned: 0,
          issued: 0,
          used: 0,
          returned: 0,
          wasted: 0,
        };
        map.set(u.material_id, s);
      }
      if (u.usage_type === "ISSUED") s.issued += Number(u.quantity);
      else if (u.usage_type === "USED") s.used += Number(u.quantity);
      else if (u.usage_type === "RETURNED") s.returned += Number(u.quantity);
      else if (u.usage_type === "WASTED") s.wasted += Number(u.quantity);
    }

    return Array.from(map.values()).map((s) => {
      const remaining = s.issued - s.used - s.wasted;
      const variance = s.planned - s.used;
      let status = "NOT_STARTED";
      if (s.issued > 0 && s.used === 0) status = "ON_TRACK";
      else if (s.used > 0 && s.used <= s.planned) status = "ON_TRACK";
      else if (s.used > s.planned) status = "OVER_USED";
      else if (s.planned > 0 && s.used >= s.planned) status = "COMPLETED";
      return { ...s, remaining, variance, status };
    });
  }, [requirements, usage]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><p className="text-muted">Loading...</p></div>;
  }

  const statusColors: Record<string, string> = {
    NOT_STARTED: "bg-gray-100 text-gray-600 border-gray-200",
    ON_TRACK: "bg-green-100 text-green-700 border-green-200",
    OVER_USED: "bg-red-100 text-red-700 border-red-200",
    COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Material Requirements & Usage</h2>
        <button
          onClick={() => setShowReqModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Requirement
        </button>
      </div>

      {summaries.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title="No Materials Tracked"
            description="Add material requirements and issue materials to track consumption for this job."
            action={
              <button
                onClick={() => setShowReqModal(true)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Requirement
              </button>
            }
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Material</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Planned</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Issued</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Used</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Returned</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Wasted</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Remaining</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Variance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summaries.map((s) => (
                <tr key={s.material_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{s.material_code}</div>
                    <div className="text-xs text-muted">{s.material_name}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">{s.planned.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-blue-600">{s.issued.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-green-600">{s.used.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm text-teal-600">{s.returned.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">{s.wasted.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">{s.remaining.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${s.variance < 0 ? "text-red-600" : "text-muted"}`}>
                    {s.variance > 0 ? "+" : ""}{s.variance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[s.status] ?? statusColors.NOT_STARTED}`}>
                      {s.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setSelectedMaterialId(s.material_id);
                          setShowIssueModal(true);
                        }}
                        className="text-muted hover:text-blue-600 p-1 rounded hover:bg-gray-100"
                        title="Issue material to job"
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowUsageModal(s.material_id)}
                        className="text-muted hover:text-green-600 p-1 rounded hover:bg-gray-100"
                        title="Record usage"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
            <History className="h-4 w-4" />
            Material Usage History
          </h3>
        </div>
        {usage.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted">No material usage recorded yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">Date</th>
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">Material</th>
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">Type</th>
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">Warehouse</th>
                <th className="px-5 py-2 text-right text-xs font-semibold text-muted uppercase">Quantity</th>
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">Reference</th>
                <th className="px-5 py-2 text-left text-xs font-semibold text-muted uppercase">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usage.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2 text-sm">{new Date(u.created_at).toLocaleString()}</td>
                  <td className="px-5 py-2 text-sm">
                    <div className="font-medium">{u.material_code}</div>
                    <div className="text-xs text-muted">{u.material_name}</div>
                  </td>
                  <td className="px-5 py-2">
                    <UsageTypeBadge type={u.usage_type} />
                  </td>
                  <td className="px-5 py-2 text-sm text-muted">{u.warehouse_name ?? u.warehouse_code ?? "—"}</td>
                  <td className="px-5 py-2 text-right text-sm font-medium">{Number(u.quantity).toLocaleString()}</td>
                  <td className="px-5 py-2 text-sm text-muted">{u.reference ?? "—"}</td>
                  <td className="px-5 py-2 text-sm text-muted">{u.user_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showReqModal && (
        <AddRequirementModal
          jobId={jobId}
          companyId={companyId}
          materials={materials}
          existingMaterialIds={requirements.map((r) => r.material_id)}
          onClose={() => setShowReqModal(false)}
          onSuccess={() => {
            setShowReqModal(false);
            loadData();
          }}
        />
      )}

      {showIssueModal && selectedMaterialId && (
        <IssueToJobModal
          jobId={jobId}
          materialId={selectedMaterialId}
          materials={materials}
          warehouses={warehouses}
          onClose={() => {
            setShowIssueModal(false);
            setSelectedMaterialId(null);
          }}
          onSuccess={() => {
            setShowIssueModal(false);
            setSelectedMaterialId(null);
            loadData();
          }}
        />
      )}

      {showUsageModal && (
        <RecordUsageModal
          jobId={jobId}
          materialId={showUsageModal}
          materials={materials}
          warehouses={warehouses}
          onClose={() => setShowUsageModal(null)}
          onSuccess={() => {
            setShowUsageModal(null);
            loadData();
          }}
        />
      )}
    </>
  );
}

function UsageTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    ISSUED: "bg-blue-100 text-blue-700 border-blue-200",
    USED: "bg-green-100 text-green-700 border-green-200",
    RETURNED: "bg-teal-100 text-teal-700 border-teal-200",
    WASTED: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {USAGE_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function AddRequirementModal({
  jobId,
  companyId,
  materials,
  existingMaterialIds,
  onClose,
  onSuccess,
}: {
  jobId: string;
  companyId: string;
  materials: MaterialWithDetails[];
  existingMaterialIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [materialId, setMaterialId] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableMaterials = materials.filter(
    (m) => !existingMaterialIds.includes(m.id) && m.is_active
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (!materialId) {
      setError("Please select a material.");
      setPending(false);
      return;
    }

    const selectedMaterial = materials.find((m) => m.id === materialId);

    const result = await createJobMaterialRequirement({
      company_id: companyId,
      job_id: jobId,
      material_id: materialId,
      planned_quantity: parseFloat(plannedQuantity) || 0,
      unit_id: selectedMaterial?.unit_id ?? null,
      required_date: requiredDate || null,
      notes: notes.trim() || null,
      status: "PLANNED",
    });

    if (!result.success) {
      setError(result.error || "Failed to add requirement.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Add Material Requirement</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {availableMaterials.length === 0 ? (
            <p className="text-sm text-muted">All materials already have requirements for this job.</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Material</label>
                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  required
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select material...</option>
                  {availableMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Planned Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={plannedQuantity}
                  onChange={(e) => setPlannedQuantity(e.target.value)}
                  required
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Required Date</label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">
                  {pending ? "Adding..." : "Add Requirement"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function IssueToJobModal({
  jobId,
  materialId,
  materials,
  warehouses,
  onClose,
  onSuccess,
}: {
  jobId: string;
  materialId: string;
  materials: MaterialWithDetails[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const material = materials.find((m) => m.id === materialId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (!warehouseId) {
      setError("Please select a warehouse.");
      setPending(false);
      return;
    }

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError("Quantity must be positive.");
      setPending(false);
      return;
    }

    const result = await issueMaterialToJobRpc({
      p_job_id: jobId,
      p_material_id: materialId,
      p_warehouse_id: warehouseId,
      p_quantity: qty,
      p_reference: reference.trim() || null,
      p_notes: notes.trim() || null,
    });

    if (!result.success) {
      setError(result.error || "Failed to issue material.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Issue Material to Job</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="rounded-md bg-gray-50 p-3">
            <p className="font-medium">{material?.name}</p>
            <p className="text-sm text-muted">{material?.code} · {material?.unit_abbreviation ?? "—"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Warehouse *</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Select warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Job code, request number, etc."
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">
              {pending ? "Issuing..." : "Issue to Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordUsageModal({
  jobId,
  materialId,
  materials,
  warehouses,
  onClose,
  onSuccess,
}: {
  jobId: string;
  materialId: string;
  materials: MaterialWithDetails[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState("");
  const [usageType, setUsageType] = useState("USED");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const material = materials.find((m) => m.id === materialId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (!warehouseId) {
      setError("Please select a warehouse.");
      setPending(false);
      return;
    }

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError("Quantity must be positive.");
      setPending(false);
      return;
    }

    const result = await recordJobMaterialUsageRpc({
      p_job_id: jobId,
      p_material_id: materialId,
      p_warehouse_id: warehouseId,
      p_usage_type: usageType,
      p_quantity: qty,
      p_reference: reference.trim() || null,
      p_notes: notes.trim() || null,
    });

    if (!result.success) {
      setError(result.error || "Failed to record usage.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Record Material Usage</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="rounded-md bg-gray-50 p-3">
            <p className="font-medium">{material?.name}</p>
            <p className="text-sm text-muted">{material?.code}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Usage Type *</label>
            <select
              value={usageType}
              onChange={(e) => setUsageType(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="USED">Used</option>
              <option value="RETURNED">Returned</option>
              <option value="WASTED">Wasted</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Warehouse *</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Select warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">
              {pending ? "Recording..." : "Record Usage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
