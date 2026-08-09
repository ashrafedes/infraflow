"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Users as UsersIcon, Search, MoreVertical, X, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ActiveBadge } from "@/components/badge";
import { useCompanyData } from "@/lib/use-company-data";
import { useAuth } from "@/lib/auth-context";
import {
  getCompanyUsers,
  inviteUser,
  updateUserRoleRpc,
  setUserActiveStatusRpc,
  removeUserFromCompanyRpc,
} from "@/lib/client-queries";
import type { UserWithRole } from "@/types/database";
import { ROLE_CODES, ROLE_LABELS } from "@/types/database";

export default function UsersPage() {
  const { company, loading } = useCompanyData();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [actionMenuUserId, setActionMenuUserId] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    return company?.role_name === "Company Admin";
  }, [company]);

  const loadUsers = useCallback(async () => {
    if (!company) return;
    setDataLoading(true);
    setError(null);
    const data = await getCompanyUsers(company.id);
    setUsers(data);
    setDataLoading(false);
  }, [company]);

  useEffect(() => {
    if (!loading && company) {
      loadUsers();
    } else if (!loading && !company) {
      setDataLoading(false);
    }
  }, [loading, company, loadUsers]);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== "all") {
      result = result.filter((u) => u.role_code === roleFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((u) =>
        statusFilter === "active" ? u.is_active : !u.is_active
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "full_name") {
        cmp = (a.full_name ?? "").localeCompare(b.full_name ?? "");
      } else if (sortBy === "email") {
        cmp = (a.email ?? "").localeCompare(b.email ?? "");
      } else if (sortBy === "role_name") {
        cmp = a.role_name.localeCompare(b.role_name);
      } else {
        cmp = a.created_at.localeCompare(b.created_at);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [users, search, roleFilter, statusFilter, sortBy, sortDir]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  if (loading || dataLoading) {
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-danger mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            loadUsers();
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Manage your company's users and their roles"
        breadcrumbs={[{ label: "Settings" }, { label: "Users & Roles" }]}
        actions={
          isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-white pl-10 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">All Roles</option>
          <option value="company_admin">Company Admin</option>
          <option value="warehouse_manager">Warehouse Manager</option>
          <option value="warehouse_user">Warehouse User</option>
          <option value="project_manager">Project Manager</option>
          <option value="inspector">Inspector</option>
          <option value="viewer">Viewer</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={<UsersIcon className="h-6 w-6" />}
            title={users.length === 0 ? "No Users Yet" : "No Matching Users"}
            description={
              users.length === 0
                ? "Invite team members to your company to get started."
                : "Try adjusting your search or filters."
            }
            action={
              isAdmin && users.length === 0 ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add User
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("full_name")}
                >
                  Name {sortBy === "full_name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("email")}
                >
                  Email {sortBy === "email" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("role_name")}
                >
                  Role {sortBy === "role_name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("created_at")}
                >
                  Created {sortBy === "created_at" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                {isAdmin && (
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedUser(u)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-medium">
                        {(u.full_name ?? "U")[0].toUpperCase()}
                      </div>
                      <span className="font-medium">
                        {u.full_name ?? "—"}
                        {u.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-muted">(You)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">{u.email ?? "—"}</td>
                  <td className="px-5 py-3">
                    <RoleBadge roleCode={u.role_code} roleName={u.role_name} />
                  </td>
                  <td className="px-5 py-3">
                    <ActiveBadge isActive={u.is_active} />
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td
                      className="px-5 py-3 text-right relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          setActionMenuUserId(
                            actionMenuUserId === u.id ? null : u.id
                          )
                        }
                        className="text-muted hover:text-foreground p-1 rounded hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {actionMenuUserId === u.id && (
                        <ActionMenu
                          user={u}
                          isSelf={u.id === currentUser?.id}
                          onClose={() => setActionMenuUserId(null)}
                          onManage={() => {
                            setActionMenuUserId(null);
                            setSelectedUser(u);
                          }}
                        />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadUsers();
          }}
        />
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isAdmin={isAdmin}
          isSelf={selectedUser.id === currentUser?.id}
          onClose={() => setSelectedUser(null)}
          onChanged={() => {
            loadUsers();
          }}
        />
      )}
    </>
  );
}

function RoleBadge({
  roleCode,
  roleName,
}: {
  roleCode: string;
  roleName: string;
}) {
  const styles: Record<string, string> = {
    company_admin: "bg-purple-100 text-purple-700 border-purple-200",
    warehouse_manager: "bg-blue-100 text-blue-700 border-blue-200",
    warehouse_user: "bg-cyan-100 text-cyan-700 border-cyan-200",
    project_manager: "bg-indigo-100 text-indigo-700 border-indigo-200",
    inspector: "bg-amber-100 text-amber-700 border-amber-200",
    viewer: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        styles[roleCode] ?? styles.viewer
      }`}
    >
      {roleName}
    </span>
  );
}

function ActionMenu({
  user,
  isSelf,
  onClose,
  onManage,
}: {
  user: UserWithRole;
  isSelf: boolean;
  onClose: () => void;
  onManage: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-white shadow-lg py-1">
        <button
          onClick={() => onManage()}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-gray-50"
        >
          <UserCog className="h-4 w-4" />
          Manage User
        </button>
        {isSelf ? null : (
          <button
            onClick={() => {
              onClose();
              setUserActiveStatusRpc(user.id, !user.is_active).then((res) => {
                if (!res.success) alert(res.error);
                window.location.reload();
              });
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-gray-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {user.is_active ? "Deactivate" : "Activate"}
          </button>
        )}
      </div>
    </>
  );
}

function AddUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleCode, setRoleCode] = useState<string>("viewer");
  const [isActive, setIsActive] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    if (fullName.trim().length < 2) {
      setFieldErrors({ full_name: "Name must be at least 2 characters." });
      setPending(false);
      return;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setFieldErrors({ email: "Please enter a valid email address." });
      setPending(false);
      return;
    }

    const result = await inviteUser({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      role_code: roleCode,
      is_active: isActive,
    });

    if (!result.success) {
      setError(result.error || "Failed to invite user.");
      setPending(false);
    } else {
      onSuccess();
    }
  };

  return (
    <Modal title="Add User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {fieldErrors.full_name && (
            <p className="mt-1 text-sm text-danger">{fieldErrors.full_name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-sm text-danger">{fieldErrors.email}</p>
          )}
          <p className="mt-1 text-xs text-muted">
            An invitation email will be sent to this address.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            value={roleCode}
            onChange={(e) => setRoleCode(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {ROLE_CODES.map((code) => (
              <option key={code} value={code}>
                {ROLE_LABELS[code]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Company Admin role cannot be assigned through invite.
          </p>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border"
            />
            Active
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Sending invite..." : "Send Invite"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UserDetailsModal({
  user,
  isAdmin,
  isSelf,
  onClose,
  onChanged,
}: {
  user: UserWithRole;
  isAdmin: boolean;
  isSelf: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editingRole, setEditingRole] = useState(false);
  const [newRole, setNewRole] = useState(user.role_code);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const handleRoleChange = async () => {
    setPending(true);
    setError(null);
    const res = await updateUserRoleRpc(user.id, newRole);
    if (!res.success) {
      setError(res.error || "Failed to update role.");
    } else {
      setEditingRole(false);
      onChanged();
    }
    setPending(false);
  };

  const handleToggleActive = async () => {
    setPending(true);
    setError(null);
    const res = await setUserActiveStatusRpc(user.id, !user.is_active);
    if (!res.success) {
      setError(res.error || "Failed to update status.");
    } else {
      setConfirmAction(null);
      onChanged();
    }
    setPending(false);
  };

  const handleRemove = async () => {
    setPending(true);
    setError(null);
    const res = await removeUserFromCompanyRpc(user.id);
    if (!res.success) {
      setError(res.error || "Failed to remove user.");
    } else {
      setConfirmAction(null);
      onClose();
      onChanged();
    }
    setPending(false);
  };

  return (
    <Modal title="User Details" onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white text-lg font-medium">
            {(user.full_name ?? "U")[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{user.full_name ?? "—"}</h3>
            <p className="text-sm text-muted">{user.email ?? "—"}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <label className="text-xs font-medium text-muted uppercase">Role</label>
            <div className="mt-1 flex items-center gap-2">
              <RoleBadge roleCode={user.role_code} roleName={user.role_name} />
              {isAdmin && !isSelf && !editingRole && (
                <button
                  onClick={() => setEditingRole(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Change
                </button>
              )}
            </div>
            {editingRole && (
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="rounded-md border border-border bg-white px-2 py-1 text-sm outline-none focus:border-primary"
                >
                  <option value="company_admin">Company Admin</option>
                  {ROLE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {ROLE_LABELS[code]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRoleChange}
                  disabled={pending}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingRole(false);
                    setNewRole(user.role_code);
                  }}
                  className="text-xs text-muted hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted uppercase">Status</label>
            <div className="mt-1">
              <ActiveBadge isActive={user.is_active} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted uppercase">Created</label>
            <p className="mt-1 text-sm">
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted uppercase">Updated</label>
            <p className="mt-1 text-sm">
              {new Date(user.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin && !isSelf && (
          <div className="border-t border-border pt-4 space-y-2">
            <label className="text-xs font-medium text-muted uppercase">
              Admin Actions
            </label>

            {confirmAction === "toggleActive" ? (
              <ConfirmDialog
                message={`Are you sure you want to ${user.is_active ? "deactivate" : "activate"} ${user.full_name}?`}
                onConfirm={handleToggleActive}
                onCancel={() => setConfirmAction(null)}
                pending={pending}
              />
            ) : (
              <button
                onClick={() => setConfirmAction("toggleActive")}
                className="flex w-full items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {user.is_active ? "Deactivate User" : "Activate User"}
              </button>
            )}

            {confirmAction === "remove" ? (
              <ConfirmDialog
                message={`Are you sure you want to remove ${user.full_name} from the company? They will lose all access.`}
                onConfirm={handleRemove}
                onCancel={() => setConfirmAction(null)}
                pending={pending}
                danger
              />
            ) : (
              <button
                onClick={() => setConfirmAction("remove")}
                className="flex w-full items-center gap-2 rounded-md border border-red-200 text-red-700 px-4 py-2 text-sm font-medium hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Remove from Company
              </button>
            )}
          </div>
        )}

        {isSelf && (
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted">
              You cannot modify your own account from this panel.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  pending,
  danger,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-gray-50 p-4">
      <p className="text-sm mb-3">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={pending}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={pending}
          className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
            danger
              ? "bg-red-600 hover:bg-red-700"
              : "bg-primary hover:bg-primary-hover"
          }`}
        >
          {pending ? "Working..." : "Confirm"}
        </button>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
