import { useEffect, useMemo, useState } from "react";
import {
  Plus, Upload, Edit3, Trash2, Search, X,
  Package2, CheckCircle2, MinusCircle, AlertTriangle,
  BarChart3,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import EditItemDrawer from "../components/EditItemDrawer.jsx";
import ImportItemsModal from "../components/ImportItemsModal.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { useItemsStore } from "../items/store.js";
import { useToast } from "../../../hooks/useToast.jsx";

const BUCKETS = {
  all:        () => true,
  active:     (i) => !!i.active,
  inactive:   (i) => !i.active,
  missingHsn: (i) => !i.hsn_code || String(i.hsn_code).trim() === "",
};

function fmtPrice(n) {
  const v = Number(n ?? 0);
  if (!v) return "—";
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SkItemCard() {
  return (
    <div className="bg-surface-container-lowest border border-border rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="hidden md:flex items-center gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function ItemsListPage() {
  const items = useItemsStore((s) => s.items);
  const loading = useItemsStore((s) => s.loading);
  const fetchAll = useItemsStore((s) => s.fetchAll);
  const remove = useItemsStore((s) => s.remove);
  const toast = useToast();

  const [drawer, setDrawer] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("all");
  const [category, setCategory] = useState("all");
  const [busyCode, setBusyCode] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const counts = useMemo(() => ({
    total:      items.length,
    active:     items.filter(BUCKETS.active).length,
    inactive:   items.filter(BUCKETS.inactive).length,
    missingHsn: items.filter(BUCKETS.missingHsn).length,
  }), [items]);

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => { if (i.category) set.add(i.category); });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (!BUCKETS[bucket](it)) return false;
      if (category !== "all" && (it.category ?? "") !== category) return false;
      if (!q) return true;
      return (
        (it.code ?? "").toLowerCase().includes(q) ||
        (it.name ?? "").toLowerCase().includes(q) ||
        (it.category ?? "").toLowerCase().includes(q) ||
        (it.hsn_code ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, bucket, category]);

  const toggleBucket = (b) => setBucket((prev) => (prev === b ? "all" : b));
  const clearFilters = () => { setQuery(""); setBucket("all"); setCategory("all"); };
  const hasFilters = query !== "" || bucket !== "all" || category !== "all";

  const handleDelete = async (e, it) => {
    e.stopPropagation();
    if (!window.confirm(`Delete item ${it.code}?`)) return;
    setBusyCode(it.code);
    try {
      await remove(it.code);
      toast.success(`Item ${it.code} deleted`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Could not delete item");
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      <PageHeader
        title="Items Master"
        subtitle="All SKUs in the catalog. Used to populate PRs, RFQs, and POs."
        actions={
          <>
            <RefreshButton onRefresh={fetchAll} loading={loading} />
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low"
            >
              <Upload className="h-4 w-4" /> Import
            </button>
            <button
              onClick={() => setDrawer({})}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> New Item
            </button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="-mx-4 sm:mx-0 mb-5">
        <div className="flex sm:grid sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0">
          <KpiStatCard
            label="Total SKUs"
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
            label="Missing HSN"
            value={counts.missingHsn}
            icon={AlertTriangle}
            tone="warning"
            active={bucket === "missingHsn"}
            onClick={() => toggleBucket("missingHsn")}
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
            placeholder="Search by code, name, category, HSN…"
            className="w-full bg-surface-container-low border border-border rounded-md focus:border-primary focus:ring-0 pl-10 pr-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-surface-container-low border border-border rounded-md focus:border-primary focus:ring-0 py-2 pl-3 pr-8 text-sm text-text outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
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

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <SkItemCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package2}
          title={items.length === 0 ? "No items yet" : "No items match your filters"}
          description={
            items.length === 0
              ? "Add your first SKU or import a catalog to get started."
              : "Try clearing the search, category, or bucket filter."
          }
          action={
            items.length === 0
              ? { onClick: () => setDrawer({}), label: "Add your first item" }
              : { onClick: clearFilters, label: "Clear filters" }
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((it) => {
              const missingHsn = !it.hsn_code || String(it.hsn_code).trim() === "";
              const isBusy = busyCode === it.code;
              return (
                <div
                  key={it.code}
                  onClick={() => setDrawer(it)}
                  className="group bg-surface-container-lowest border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-150"
                >
                  {/* Icon + identity */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                        it.active ? "bg-primary-soft text-primary" : "bg-surface-container text-text-muted"
                      }`}
                      title={it.active ? "Active SKU" : "Inactive SKU"}
                    >
                      <Package2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-info text-xs px-1.5 py-0.5 rounded bg-info-soft">
                          {it.code}
                        </span>
                        <span className="font-semibold text-text truncate">{it.name}</span>
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-1.5 mt-1 truncate">
                        <span className="truncate">{it.category || <span className="italic text-text-subtle">No category</span>}</span>
                        <span className="text-text-subtle">·</span>
                        {missingHsn ? (
                          <span className="inline-flex items-center gap-1 text-warning">
                            <AlertTriangle className="h-3 w-3" /> Missing HSN
                          </span>
                        ) : (
                          <span className="font-mono">HSN {it.hsn_code}</span>
                        )}
                        <span className="text-text-subtle hidden md:inline">·</span>
                        <span className="hidden md:inline">UOM {it.uom || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price + Status */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap pl-14 sm:pl-0">
                    <span className="text-sm font-semibold text-text tabular-nums">
                      {fmtPrice(it.price)}
                    </span>
                    <StatusPill tone={it.active ? "success" : "neutral"}>
                      {it.active ? "Active" : "Inactive"}
                    </StatusPill>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setDrawer(it)}
                      className="text-text-muted hover:text-primary hover:bg-primary-soft p-2 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, it)}
                      disabled={isBusy}
                      className="text-text-muted hover:text-danger hover:bg-danger-soft p-2 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Delete"
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
            item{filtered.length === 1 ? "" : "s"}
          </div>
        </>
      )}

      <EditItemDrawer
        open={!!drawer}
        item={drawer}
        onClose={() => setDrawer(null)}
      />
      <ImportItemsModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
