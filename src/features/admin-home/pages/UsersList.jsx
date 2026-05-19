import { useEffect, useMemo, useState } from "react";
import {
  Plus, Edit3, Trash2, Search, Users as UsersIcon,
  Crown, ShieldCheck, UserCog, User as UserIcon,
  Mail, Calendar, X,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import EditUserDrawer from "../components/EditUserDrawer.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { useUsersStore } from "../users/store.js";
import { useAuthStore } from "../../auth/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { ROLE_LABELS } from "../../../data/roles.js";
import departmentsApi from "../../masters/departments/api.js";

const ROLE_TONE = {
  admin: "danger",
  ceo: "warning",
  cfo: "warning",
  director: "warning",
  hod: "warning",
  manager: "info",
  purchase_officer: "info",
  accountant: "info",
  project_manager: "info",
  site_person: "neutral",
  employee: "neutral",
  customer: "neutral",
  vendor: "neutral",
};

const APPROVER_ROLES = new Set(["hod", "cfo", "ceo", "director"]);

// KPI buckets — clicking one filters the list to that group.
const BUCKETS = {
  all: () => true,
  admins: (u) => u.role === "admin",
  approvers: (u) => APPROVER_ROLES.has(u.role),
  others: (u) => u.role !== "admin" && !APPROVER_ROLES.has(u.role),
};

const TONE_TINT = {
  danger:  { bg: "bg-danger-soft",  fg: "text-danger" },
  warning: { bg: "bg-warning-soft", fg: "text-warning" },
  info:    { bg: "bg-info-soft",    fg: "text-info" },
  neutral: { bg: "bg-surface-container", fg: "text-text-muted" },
};

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}

function SkUserCard() {
  return (
    <div className="bg-surface-container-lowest border border-border rounded-xl p-4 flex items-center gap-4">
      <Skeleton className="h-11 w-11 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="hidden md:flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded" />
      </div>
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export default function UsersListPage() {
  const users = useUsersStore((s) => s.items);
  const loading = useUsersStore((s) => s.loading);
  const fetchAll = useUsersStore((s) => s.fetchAll);
  const remove = useUsersStore((s) => s.remove);
  const me = useAuthStore((s) => s.user);
  const toast = useToast();

  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("all");
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

  const counts = useMemo(() => ({
    total: users.length,
    admins: users.filter(BUCKETS.admins).length,
    approvers: users.filter(BUCKETS.approvers).length,
    others: users.filter(BUCKETS.others).length,
  }), [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (!BUCKETS[bucket](u)) return false;
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (deptFilter !== "all") {
        if (deptFilter === "none" && u.department_id) return false;
        if (deptFilter !== "none" && String(u.department_id) !== deptFilter) return false;
      }
      return true;
    });
  }, [users, query, bucket, roleFilter, deptFilter]);

  const roleOptions = useMemo(
    () => ["all", ...Array.from(new Set(users.map((u) => u.role)))],
    [users],
  );

  const toggleBucket = (b) => setBucket((prev) => (prev === b ? "all" : b));

  const clearFilters = () => {
    setQuery(""); setBucket("all"); setRoleFilter("all"); setDeptFilter("all");
  };

  const handleDelete = async (e, u) => {
    e.stopPropagation();
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

  const hasFilters =
    query !== "" || bucket !== "all" || roleFilter !== "all" || deptFilter !== "all";

  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      <PageHeader
        title="Users"
        subtitle="Internal users — employees, approvers, admins. Vendor accounts live in Masters → Vendors."
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

      {/* KPI strip — clickable filter buckets */}
      <div className="-mx-4 sm:mx-0 mb-5">
        <div className="flex sm:grid sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0">
          <KpiStatCard
            label="Total Users"
            value={counts.total}
            icon={UsersIcon}
            tone="info"
            active={bucket === "all"}
            onClick={() => setBucket("all")}
          />
          <KpiStatCard
            label="Administrators"
            value={counts.admins}
            icon={Crown}
            tone="danger"
            active={bucket === "admins"}
            onClick={() => toggleBucket("admins")}
          />
          <KpiStatCard
            label="Approvers"
            value={counts.approvers}
            icon={ShieldCheck}
            tone="warning"
            active={bucket === "approvers"}
            onClick={() => toggleBucket("approvers")}
          />
          <KpiStatCard
            label="Others"
            value={counts.others}
            icon={UserCog}
            tone="neutral"
            active={bucket === "others"}
            onClick={() => toggleBucket("others")}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest border border-border rounded-xl p-3 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full bg-surface-container-low border border-border rounded-md focus:border-primary focus:ring-0 pl-10 pr-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-surface-container-low border border-border rounded-md focus:border-primary focus:ring-0 py-2 pl-3 pr-8 text-sm text-text outline-none"
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
          className="bg-surface-container-low border border-border rounded-md focus:border-primary focus:ring-0 py-2 pl-3 pr-8 text-sm text-text outline-none"
        >
          <option value="all">All departments</option>
          <option value="none">— No department —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-text-muted hover:text-text inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-container-low"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* User list */}
      {loading && users.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <SkUserCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={users.length === 0 ? "No users yet" : "No users match your filters"}
          description={
            users.length === 0
              ? "Invite your first user to get started."
              : "Try clearing one of the filters or the search term."
          }
          action={
            users.length === 0
              ? { label: "Invite User", onClick: () => setEditing({}) }
              : { label: "Clear filters", onClick: clearFilters }
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((u) => {
              const tone = ROLE_TONE[u.role] ?? "neutral";
              const tint = TONE_TINT[tone];
              const isMe = u.id === me?.id;
              return (
                <div
                  key={u.id}
                  onClick={() => setEditing(u)}
                  className="group bg-surface-container-lowest border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-150"
                >
                  {/* Avatar + identity */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${tint.bg} ${tint.fg}`}
                      title={ROLE_LABELS[u.role] ?? u.role}
                    >
                      {initials(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text truncate">{u.name}</span>
                        {isMe && (
                          <span className="text-[10px] uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold">
                            you
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Role + Dept + Joined */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap pl-14 sm:pl-0">
                    <StatusPill tone={tone}>{ROLE_LABELS[u.role] ?? u.role}</StatusPill>
                    {u.department ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container border border-border text-text-muted"
                        title={u.department.name}
                      >
                        <span className="text-text">{u.department.code}</span>
                        <span className="text-text-subtle">·</span>
                        <span className="truncate max-w-[110px]">{u.department.name}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-subtle italic">No department</span>
                    )}
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-text-muted">
                      <Calendar className="h-3 w-3" />
                      {fmtDate(u.created_at)}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div
                    className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setEditing(u)}
                      className="text-text-muted hover:text-primary hover:bg-primary-soft p-2 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, u)}
                      disabled={isMe || busyId === u.id}
                      className="text-text-muted hover:text-danger hover:bg-danger-soft p-2 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted"
                      title={isMe ? "You can't delete yourself" : "Delete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-xs text-text-muted">
            Showing <strong className="text-text">{filtered.length}</strong>
            {filtered.length !== counts.total && (
              <> of <strong className="text-text">{counts.total}</strong></>
            )}{" "}
            user{filtered.length === 1 ? "" : "s"}
          </div>
        </>
      )}

      <EditUserDrawer
        open={!!editing}
        user={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
