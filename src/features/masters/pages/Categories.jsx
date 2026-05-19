import { useEffect, useMemo, useState } from "react";
import {
  Plus, Edit3, Trash2, Search, X,
  Tag, BarChart3, CheckCircle2, MinusCircle, Layers,
  CornerDownRight,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import GenericMasterDrawer from "../components/GenericMasterDrawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import useCategoriesStore from "../categories/store.js";
import { useAuthStore } from "../../auth/store.js";

const BUCKETS = {
  all:        () => true,
  active:     (c) => !!c.active,
  inactive:   (c) => !c.active,
  sub:        (c) => !!(c.parent && String(c.parent).trim()),
};

function SkCategoryCard() {
  return (
    <div className="bg-surface-container-lowest border border-border rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="hidden md:flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const { items, loading, fetchAll, create, update, remove } = useCategoriesStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const toast = useToast();

  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("all");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { fetchAll().catch(() => {}); }, [fetchAll]);

  // Parents are top-level categories (parent === null) or any unique parent value
  const parentOptions = useMemo(() => {
    const set = new Set(["—"]);
    items.forEach((c) => { if (!c.parent) set.add(c.name); });
    return Array.from(set);
  }, [items]);

  const FIELDS = useMemo(() => ([
    { name: "name", label: "Category Name", required: true },
    { name: "parent", label: "Parent Category", type: "select", options: parentOptions },
    { name: "description", label: "Description", type: "textarea" },
    { name: "active", label: "Status", type: "checkbox", checkboxLabel: "Active" },
  ]), [parentOptions]);

  const counts = useMemo(() => ({
    total:    items.length,
    active:   items.filter(BUCKETS.active).length,
    inactive: items.filter(BUCKETS.inactive).length,
    sub:      items.filter(BUCKETS.sub).length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (!BUCKETS[bucket](c)) return false;
      if (!q) return true;
      return (
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.parent ?? "").toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, bucket]);

  const toggleBucket = (b) => setBucket((prev) => (prev === b ? "all" : b));
  const clearFilters = () => { setQuery(""); setBucket("all"); };
  const hasFilters = query !== "" || bucket !== "all";

  const onSave = async (payload) => {
    if (drawer?.id) await update(drawer.id, payload);
    else await create(payload);
  };

  const handleDelete = async (e, c) => {
    e.stopPropagation();
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    setBusyId(c.id);
    try {
      await remove(c.id);
      toast.success(`${c.name} deleted`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Could not delete category");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      <PageHeader
        title="Categories"
        subtitle="Organise items into a catalog hierarchy. Used by item search, RFQ vendor auto-selection, and reporting."
        actions={
          isAdmin && (
            <button
              onClick={() => setDrawer({})}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> New Category
            </button>
          )
        }
      />

      {/* KPI strip */}
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
            label="Sub-categories"
            value={counts.sub}
            icon={Layers}
            tone="warning"
            active={bucket === "sub"}
            onClick={() => toggleBucket("sub")}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest border border-border rounded-xl p-3 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, parent, or description…"
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
          {Array.from({ length: 6 }).map((_, i) => <SkCategoryCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={items.length === 0 ? "No categories yet" : "No categories match your filters"}
          description={
            items.length === 0
              ? (isAdmin ? "Add your first category to organise the catalog." : "Ask an admin to add categories.")
              : "Try clearing the search or bucket filter."
          }
          action={
            items.length === 0
              ? (isAdmin ? { onClick: () => setDrawer({}), label: "Add your first category" } : undefined)
              : { onClick: clearFilters, label: "Clear filters" }
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((c) => {
              const isSub = BUCKETS.sub(c);
              const isBusy = busyId === c.id;
              const clickable = isAdmin;
              return (
                <div
                  key={c.id}
                  onClick={() => clickable && setDrawer(c)}
                  className={`group bg-surface-container-lowest border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all duration-150 ${
                    clickable ? "cursor-pointer hover:border-primary hover:shadow-md" : ""
                  }`}
                >
                  {/* Icon + identity */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                        c.active ? "bg-primary-soft text-primary" : "bg-surface-container text-text-muted"
                      }`}
                      title={c.active ? "Active category" : "Inactive category"}
                    >
                      <Tag className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text truncate">{c.name}</span>
                        {isSub && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-warning-soft text-warning">
                            <CornerDownRight className="h-3 w-3" />
                            under {c.parent}
                          </span>
                        )}
                      </div>
                      {c.description ? (
                        <div
                          className="text-xs text-text-muted mt-1 truncate"
                          title={c.description}
                        >
                          {c.description}
                        </div>
                      ) : (
                        !isSub && (
                          <div className="text-xs text-text-subtle italic mt-1">
                            Top-level category
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap pl-14 sm:pl-0">
                    <StatusPill tone={c.active ? "success" : "neutral"}>
                      {c.active ? "Active" : "Inactive"}
                    </StatusPill>
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div
                      className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setDrawer(c)}
                        className="text-text-muted hover:text-primary hover:bg-primary-soft p-2 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, c)}
                        disabled={isBusy}
                        className="text-text-muted hover:text-danger hover:bg-danger-soft p-2 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-xs text-text-muted">
            Showing <strong className="text-text">{filtered.length}</strong>
            {filtered.length !== counts.total && (
              <> of <strong className="text-text">{counts.total}</strong></>
            )}{" "}
            categor{filtered.length === 1 ? "y" : "ies"}
          </div>
        </>
      )}

      {drawer && isAdmin && (
        <GenericMasterDrawer
          open
          onClose={() => { setDrawer(null); fetchAll().catch(() => {}); }}
          entity="Category"
          fields={FIELDS}
          values={drawer}
          isNew={!drawer?.id}
          onSave={onSave}
          onDelete={drawer?.id ? () => remove(drawer.id) : undefined}
        />
      )}
    </div>
  );
}
