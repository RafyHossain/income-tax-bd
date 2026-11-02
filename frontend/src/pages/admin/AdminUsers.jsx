import React, { useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  UserRound,
  Trash2,
  FileCheck2,
  CreditCard,
  Phone,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import AdminService from "@/services/adminService";
import useAuth from "@/hooks/useAuth";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import LoadingState from "@/components/admin/LoadingState";
import ErrorState from "@/components/admin/ErrorState";

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [confirmDialog, setConfirmDialog] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await AdminService.getAllUsers();
      if (res?.success) {
        setUsers(res.data || []);
      } else {
        throw new Error(res?.message || "Failed to load users.");
      }
    } catch (err) {
      console.error("Admin users error:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleRole = (targetUser) => {
    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    const isSelf = Number(targetUser.id) === Number(currentUser?.id);

    if (isSelf) {
      toast.error("You cannot change your own administrator role.");
      return;
    }

    setConfirmDialog({
      title: `${nextRole === "admin" ? "Promote to Admin" : "Demote to Standard User"}`,
      message: `Are you sure you want to change ${targetUser.full_name}'s role from ${targetUser.role} to ${nextRole}?`,
      variant: nextRole === "admin" ? "primary" : "warning",
      confirmText: `Set as ${nextRole.toUpperCase()}`,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await AdminService.updateUserRole(targetUser.id, nextRole);
          toast.success(res?.message || `User role updated to ${nextRole}.`);
          setConfirmDialog(null);
          loadUsers();
        } catch (err) {
          console.error(err);
          toast.error(err?.response?.data?.message || err?.message || "Failed to update role.");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleDeleteUser = (targetUser) => {
    const isSelf = Number(targetUser.id) === Number(currentUser?.id);
    if (isSelf) {
      toast.error("You cannot delete your own account while logged in.");
      return;
    }

    setConfirmDialog({
      title: "Delete User Account",
      message: `Are you sure you want to permanently delete ${targetUser.full_name} (${targetUser.email})? All associated income, expenses, and calculation simulations will be removed.`,
      variant: "danger",
      confirmText: "Delete Account",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await AdminService.deleteUser(targetUser.id);
          toast.success(res?.message || "User account deleted successfully.");
          setConfirmDialog(null);
          loadUsers();
        } catch (err) {
          console.error(err);
          toast.error(err?.response?.data?.message || err?.message || "Failed to delete user.");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const filteredUsers = users.filter((u) => {
    return !roleFilter || u.role === roleFilter;
  });

  const columns = [
    {
      title: "Taxpayer Identity",
      key: "full_name",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
            {val
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-sm">{val}</span>
              {Number(row.id) === Number(currentUser?.id) && (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  You
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">User ID: #{row.id}</p>
          </div>
        </div>
      ),
    },
    {
      title: "Contact Info",
      key: "email",
      render: (val, row) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Mail className="h-3 w-3 text-slate-400" />
            <span>{val}</span>
          </div>
          {row.phone && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <Phone className="h-3 w-3 text-slate-400" />
              <span>{row.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "NID & e-TIN",
      key: "tin_number",
      render: (val, row) => (
        <div className="text-xs space-y-1">
          {val ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                TIN: {val}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 font-mono text-[11px]">No e-TIN</span>
          )}
          {row.nid && <p className="text-slate-500 font-mono text-[10px]">NID: {row.nid}</p>}
        </div>
      ),
    },
    {
      title: "Filing Status",
      key: "filing_history_status",
      render: (val, row) => {
        const isVerified = row.filing_history_verified === 1;
        return (
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-1">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 border border-slate-200">
                  <HelpCircle className="h-3 w-3" />
                  Unverified
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              {val ? val.replace(/_/g, " ") : "No profile record"}
            </p>
          </div>
        );
      },
    },
    {
      title: "System Role",
      key: "role",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, row) => {
        const isSelf = Number(row.id) === Number(currentUser?.id);
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              disabled={isSelf}
              onClick={() => handleToggleRole(row)}
              title={row.role === "admin" ? "Demote to User" : "Promote to Admin"}
              className={`rounded-lg p-1.5 transition ${
                isSelf
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              <Shield className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isSelf}
              onClick={() => handleDeleteUser(row)}
              title={isSelf ? "Cannot delete self" : "Delete User"}
              className={`rounded-lg p-1.5 transition ${
                isSelf
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-400 hover:text-red-600 hover:bg-red-50"
              }`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  if (loading && users.length === 0) {
    return <LoadingState message="Loading users & taxpayer profiles..." />;
  }

  if (error && users.length === 0) {
    return <ErrorState message={error} onRetry={loadUsers} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Users className="h-4 w-4 text-emerald-600" />
            <span>Taxpayer Directory & Access Control</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            User & Taxpayer Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage system accounts, administrator privileges, and authoritative return-filing verification statuses.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="admin">Administrators</option>
          <option value="user">Standard Taxpayers</option>
        </select>
        <span className="ml-auto text-xs font-medium text-slate-500">
          Showing {filteredUsers.length} of {users.length} accounts
        </span>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        emptyTitle="No users found"
        emptyDescription="No registered users found."
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        variant={confirmDialog?.variant}
        confirmText={confirmDialog?.confirmText}
        loading={actionLoading}
        onConfirm={confirmDialog?.onConfirm}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  );
};

export default AdminUsers;
