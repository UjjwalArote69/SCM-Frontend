import { useEffect, useMemo, useState } from "react";
import {
  Plus, Briefcase, Edit3, Trash2, Search, AlertTriangle,
  CheckCircle2, MinusCircle, Users as UsersIcon, BarChart3,
  UserCircle2, X,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import EditDepartmentDrawer from "../departments/EditDepartmentDrawer.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { useDepartmentsStore } from "../departments/store.js";
import { useToast } from "../../../hooks/useToast.jsx";

const BUCKETS = {
  all:      () => true,
  active:   (d) => !!d.active,
  inactive: (d) => !d.active,
  staffed:  (d) => (d.users_count ?? 0) > 0,
};

function SkDeptCard() {
  return (
    <div className="bg-surface-container-lowest border border-border rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="hidden md:flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const items = useDepartmentsStore((s) => s.items);
  const loading = useDepartmentsStore((s) => s.loading);
  const fetchAll = useDepartmentsStore((s) => s.fetchAll);
  const remove = useDepartmentsStore((s) => s.remove);
  const toast = useToast();

  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("all");
  const [busyCode, setBusyCode] = useState(null);

  useEffect(() => {
    fetchAll().catch(() => toast.error("Could not load departments"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(
    () => ({
      total:    items.length,
      active:   items.filter(BUCKETS.active).length,
      inactive: items.filter(BUCKETS.inactive).length,
      staffed:  items.filter(BUCKETS.staffed).length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((d) => {
      if (!BUCKETS[bucket](d)) return false;
      if (!q) return true;
      return (
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (d.head_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, bucket]);

  const toggleBucket = (b) => setBucket((prev) => (prev === b ? "all" : b));

  const clearFilters = () => { setQuery(""); setBucket("all"); };

  const hasFilters = query !== "" || bucket !== "all";

  const handleDelete = async (e, d) => {
    e.stopPropagation();
    const linked = d.users_count ?? 0;
    const force = linked > 0;
    const msg = force
      ? `Department "${d.name}" still has ${linked} user${linked === 1 ? "" : "s"} assigned. Deleting will leave them without a department. Continue?`
      : `Delete department "${d.name}"?`;
    if (!window.confirm(msg)) return;

    setBusyCode(d.code);
    try {
      await remove(d.code, { force });
      toast.success(`${d.name} deleted`);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message ?? "Could not delete department";
      if (status === 409) toast.warning(message);
      else toast.error(message);
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      <PageHeader
        title="Departments"
        subtitle="Organisational units used for approval routing and reporting. HODs are tied to a department to drive consensus and approvals."
        actions={
          <>
            <RefreshButton onRefresh={fetchAll} loading={loading} />
            <button
              onClick={() => setEditing({})}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> New Department
            </button>
          </>
        }
      />

      {/* KPI strip — clickable buckets */}
      <div className="-mx-4 sm:mx-0 mb-5">
        <div className="flex sm:grid sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0">
          <KpiStatCard
            label="Total"
            value={counts.total}
            icon={BarChart3}
            tone="info"
            active={bucket === "all"}
            onClick={() => setBucket("all")}
          />
          <KpiStatCard
            label="Active"
            value={counts.active}
            icon={CheckCircle2}
            tone="success"
            active={bucket === "active"}
            onClick={() => toggleBucket("active")}
          />
          <KpiStatCard
            label="Inactive"
            value={counts.inactive}
            icon={MinusCircle}
            tone="neutral"
            active={bucket === "inactive"}
            onClick={() => toggleBucket("inactive")}
          />
          <KpiStatCard
            label="With Members"
            value={counts.staffed}
            icon={UsersIcon}
            tone="warning"
            active={bucket === "staffed"}
            onClick={() => toggleBucket("staffed")}
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
            placeholder="Search by code, name or head…"
            className="w-full bg-surface-container-low border border-border rounded-md focus:border-primary focus:ring-0 pl-10 pr-3 py-2 text-sm text-text outline-none"
          />
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-text-muted hover:text-text inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-container-low"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <SkDeptCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={items.length === 0 ? "No departments yet" : "No departments match your filters"}
          description={
            items.length === 0
              ? "Create one to start routing approvals."
              : "Try clearing the search or filter."
          }
          action={
            items.length === 0
              ? { onClick: () => setEditing({}), label: "Create your first department" }
              : { onClick: clearFilters, label: "Clear filters" }
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((d) => {
              const memberCount = d.users_count ?? 0;
              const isBusy = busyCode === d.code;
              return (
                <div
                  key={d.code}
                  onClick={() => setEditing(d)}
                  className="group bg-surface-container-lowest border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-150"
                >
                  {/* Icon + identity */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                        d.active ? "bg-primary-soft text-primary" : "bg-surface-container text-text-muted"
                      }`}
                      title={d.active ? "Active department" : "Inactive department"}
                    >
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-info text-xs px-1.5 py-0.5 rounded bg-info-soft">
                          {d.code}
                        </span>
                        <span className="font-semibold text-text truncate">{d.name}</span>
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-1.5 mt-1 truncate">
                        {d.head_name ? (
                          <>
                            <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-text-subtle" />
                            <span className="truncate">
                              <span className="text-text-subtle">Head:</span>{" "}
                              <span className="text-text">{d.head_name}</span>
                            </span>
                          </>
                        ) : (
                          <span className="italic text-text-subtle">No head assigned</span>
                        )}
                        {d.description && (
                          <>
                            <span className="text-text-subtle hidden md:inline">·</span>
                            <span className="hidden md:inline truncate text-text-subtle" title={d.description}>
                              {d.description}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Members count + Status */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap pl-14 sm:pl-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        memberCount > 0
                          ? "bg-warning-soft text-warning"
                          : "bg-surface-container text-text-subtle"
                      }`}
                      title={`${memberCount} user${memberCount === 1 ? "" : "s"} assigned`}
                    >
                      <UsersIcon className="h-3 w-3" />
                      {memberCount} {memberCount === 1 ? "member" : "members"}
                    </span>
                    <StatusPill tone={d.active ? "success" : "neutral"}>
                      {d.active ? "Active" : "Inactive"}
                    </StatusPill>
                  </div>

                  {/* Action buttons */}
                  <div
                    className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setEditing(d)}
                      className="text-text-muted hover:text-primary hover:bg-primary-soft p-2 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, d)}
                      disabled={isBusy}
                      className="text-text-muted hover:text-danger hover:bg-danger-soft p-2 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={memberCount > 0 ? `Will orphan ${memberCount} user${memberCount === 1 ? "" : "s"}` : "Delete"}
                    >
                      {memberCount > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
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
            department{filtered.length === 1 ? "" : "s"}
          </div>
        </>
      )}

      <EditDepartmentDrawer
        open={!!editing}
        dept={editing}
        onClose={() => {
          setEditing(null);
          // refresh users_count after a save (members may have shifted via user edits)
          fetchAll().catch(() => {});
        }}
      />
    </div>
  );
}
