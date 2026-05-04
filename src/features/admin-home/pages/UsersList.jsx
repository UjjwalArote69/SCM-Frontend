import { useEffect, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Loader2,
  Users as UsersIcon,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import EditUserDrawer from "../components/EditUserDrawer.jsx";
import { useUsersStore } from "../users/store.js";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { ROLE_LABELS } from "../../../data/roles.js";
import departmentsApi from "../../masters/departments/api.js";

const ROLE_TONE = {
  admin: "danger",
  manager: "info",
  hod: "warning",
  cfo: "warning",
  ceo: "warning",
  director: "warning",
  employee: "neutral",
  accountant: "info",
  purchase_officer: "info",
  customer: "neutral",
};

export default function UsersListPage() {
  const users = useUsersStore((s) => s.items);
  const loading = useUsersStore((s) => s.loading);
  const fetchAll = useUsersStore((s) => s.fetchAll);
  const remove = useUsersStore((s) => s.remove);
  const me = useAuthStore((s) => s.user);
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    departmentsApi
      .list()
      .then((rows) => setDepartments((rows ?? []).filter((d) => d.active !== false)))
      .catch(() => {});
  }, []);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchR = roleFilter === "all" || u.role === roleFilter;
    const matchD =
      deptFilter === "all" ||
      (deptFilter === "none" ? !u.department_id : String(u.department_id) === deptFilter);
    return matchQ && matchR && matchD;
  });

  const roleOptions = ["all", ...Array.from(new Set(users.map((u) => u.role)))];

  const handleDelete = async (u) => {
    if (u.id === me?.id) {
      toast.error("You can't delete your own account.");
      return;
    }
    if (!window.confirm(`Delete user ${u.name} (${u.email})?`)) return;
    setBusyId(u.id);
    try {
      await remove(u.id);
      toast.success(`${u.name} deleted`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not delete user");
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    approvers: users.filter((u) =>
      ["hod", "cfo", "ceo", "director"].includes(u.role),
    ).length,
    other: users.filter(
      (u) => !["admin", "hod", "cfo", "ceo", "director"].includes(u.role),
    ).length,
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Users"
        subtitle="Internal users (employees, approvers, admins). Vendor accounts are managed in Masters → Vendors."
        actions={
          <>
            <RefreshButton onRefresh={fetchAll} loading={loading} />
            <button
              onClick={() => setEditing({})}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> Invite User
            </button>
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total", value: counts.total, tone: "info" },
          { label: "Admins", value: counts.admins, tone: "danger" },
          { label: "Approvers (HOD/CFO/CEO/Director)", value: counts.approvers, tone: "warning" },
          { label: "Others", value: counts.other, tone: "neutral" },
        ].map((s) => (
          <div
            key={s.label}
            className="glass-card rounded-2xl p-4"
          >
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
              {s.label}
            </div>
            <div className="text-2xl font-black tracking-tight mt-1">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-3 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full bg-transparent border border-border rounded-md focus:border-primary focus:ring-0 pl-10 pr-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-transparent border border-border rounded-md focus:border-primary focus:ring-0 py-2 pl-3 pr-8 text-sm text-text outline-none"
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r === "all" ? "All roles" : (ROLE_LABELS[r] ?? r)}
            </option>
          ))}
        </select>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="bg-transparent border border-border rounded-md focus:border-primary focus:ring-0 py-2 pl-3 pr-8 text-sm text-text outline-none"
        >
          <option value="all">All departments</option>
          <option value="none">— No department —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Role</th>
              <th className="px-6 py-3 text-left">Department</th>
              <th className="px-6 py-3 text-left">Joined</th>
              <th className="px-6 py-3 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-text-muted">
                  <Loader2 className="inline-block h-5 w-5 animate-spin mr-2" />
                  Loading users…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <UsersIcon
                    className="h-10 w-10 mx-auto mb-3 text-text-subtle"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm text-text-muted">
                    {users.length === 0
                      ? "No internal users yet. Invite one to get started."
                      : "No users match your filters."}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const tone = ROLE_TONE[u.role] ?? "neutral";
                const joined = u.created_at
                  ? new Date(u.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";
                const isMe = u.id === me?.id;
                return (
                  <tr
                    key={u.id}
                    className="hover:bg-surface-container-low cursor-pointer"
                    onClick={() => setEditing(u)}
                  >
                    <td className="px-6 py-4 font-medium">
                      {u.name}
                      {isMe && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider bg-primary-soft text-primary px-1.5 py-0.5 rounded font-bold">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-muted">{u.email}</td>
                    <td className="px-6 py-4">
                      <StatusPill tone={tone}>{ROLE_LABELS[u.role] ?? u.role}</StatusPill>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {u.department ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-semibold bg-surface-container border border-border text-text"
                          title={u.department.name}
                        >
                          <span className="text-text-subtle">{u.department.code}</span>
                          <span>·</span>
                          <span>{u.department.name}</span>
                        </span>
                      ) : (
                        <span className="text-text-subtle">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-muted text-xs">
                      {joined}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(u);
                          }}
                          className="text-text-muted hover:text-primary p-1"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(u);
                          }}
                          disabled={isMe || busyId === u.id}
                          className="text-text-muted hover:text-danger p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isMe ? "You can't delete yourself" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <EditUserDrawer
        open={!!editing}
        user={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
