import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Briefcase,
  Edit3,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import EditDepartmentDrawer from "../departments/EditDepartmentDrawer.jsx";
import { useDepartmentsStore } from "../departments/store.js";
import { useToast } from "../../../hooks/useToast.jsx";

export default function DepartmentsPage() {
  const items = useDepartmentsStore((s) => s.items);
  const loading = useDepartmentsStore((s) => s.loading);
  const fetchAll = useDepartmentsStore((s) => s.fetchAll);
  const remove = useDepartmentsStore((s) => s.remove);
  const toast = useToast();

  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [busyCode, setBusyCode] = useState(null);

  useEffect(() => {
    fetchAll().catch(() => toast.error("Could not load departments"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((d) => {
      if (activeFilter === "active" && !d.active) return false;
      if (activeFilter === "inactive" && d.active) return false;
      if (!q) return true;
      return (
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (d.head_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, activeFilter]);

  const handleDelete = async (d) => {
    const linked = d.users_count ?? 0;
    const force = linked > 0;
    const msg = force
      ? `Department "${d.name}" still has ${linked} user(s) assigned. Deleting will leave them without a department. Continue?`
      : `Delete department "${d.name}"?`;
    if (!window.confirm(msg)) return;

    setBusyCode(d.code);
    try {
      await remove(d.code, { force });
      toast.success(`${d.name} deleted`);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message ?? "Could not delete department";
      // 409 from controller when users are linked and force not passed —
      // we already passed force when count>0, so this only fires on race.
      if (status === 409) {
        toast.warning(message);
      } else {
        toast.error(message);
      }
    } finally {
      setBusyCode(null);
    }
  };

  const counts = useMemo(
    () => ({
      total: items.length,
      active: items.filter((d) => d.active).length,
      inactive: items.filter((d) => !d.active).length,
      withUsers: items.filter((d) => (d.users_count ?? 0) > 0).length,
    }),
    [items],
  );

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Departments"
        subtitle="Organisational units used for approval routing and reporting. HODs are tied to a department to drive the consensus + approval flows."
        actions={
          <>
            <RefreshButton onRefresh={fetchAll} loading={loading} />
            <button
              onClick={() => setEditing({})}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> New Department
            </button>
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total", value: counts.total },
          { label: "Active", value: counts.active },
          { label: "Inactive", value: counts.inactive },
          { label: "With members", value: counts.withUsers },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-surface-container-lowest border border-border rounded-lg p-4"
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
      <div className="bg-surface-container-lowest rounded-lg border border-border p-3 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, name or head…"
            className="w-full bg-transparent border border-border rounded-md focus:border-primary focus:ring-0 pl-10 pr-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="bg-transparent border border-border rounded-md focus:border-primary focus:ring-0 py-2 pl-3 pr-8 text-sm text-text outline-none"
        >
          <option value="all">All</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low text-[10px] font-bold text-text-muted uppercase tracking-widest">
              <th className="px-6 py-3 text-left">Code</th>
              <th className="px-6 py-3 text-left">Department</th>
              <th className="px-6 py-3 text-left">Head</th>
              <th className="px-6 py-3 text-left">Description</th>
              <th className="px-6 py-3 text-right">Members</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-text-muted">
                  <Loader2 className="inline-block h-5 w-5 animate-spin mr-2" />
                  Loading departments…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16">
                  <EmptyState
                    icon={Briefcase}
                    title={
                      items.length === 0
                        ? "No departments yet"
                        : "No departments match your filters"
                    }
                    description={
                      items.length === 0
                        ? "Create one to start routing approvals."
                        : "Try clearing the search or status filter."
                    }
                    action={
                      items.length === 0
                        ? { onClick: () => setEditing({}), label: "Create your first department" }
                        : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr
                  key={d.code}
                  className="hover:bg-surface-container-low cursor-pointer"
                  onClick={() => setEditing(d)}
                >
                  <td className="px-6 py-4">
                    <span className="text-info font-mono font-bold">{d.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    {d.head_name || <span className="text-text-subtle">—</span>}
                  </td>
                  <td className="px-6 py-4 text-text-muted text-xs max-w-[280px] truncate" title={d.description ?? ""}>
                    {d.description || <span className="text-text-subtle">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={
                        (d.users_count ?? 0) > 0
                          ? "font-semibold text-text"
                          : "text-text-subtle"
                      }
                    >
                      {d.users_count ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill tone={d.active ? "success" : "neutral"}>
                      {d.active ? "Active" : "Inactive"}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(d);
                        }}
                        className="text-text-muted hover:text-primary p-1"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(d);
                        }}
                        disabled={busyCode === d.code}
                        className="text-text-muted hover:text-danger p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={
                          (d.users_count ?? 0) > 0
                            ? `Will orphan ${d.users_count} user(s)`
                            : "Delete"
                        }
                      >
                        {(d.users_count ?? 0) > 0 ? (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
