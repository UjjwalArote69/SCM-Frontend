import { useEffect, useMemo, useState } from "react";
import {
  Plus, Building2, Edit3, Trash2, Search, X,
  BarChart3, CheckCircle2, MinusCircle, AlertTriangle,
  MapPin,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import GenericMasterDrawer from "../components/GenericMasterDrawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import useCompaniesStore from "../companies/store.js";
import { useAuthStore } from "../../auth/store.js";

const COUNTRIES = ["", "India", "USA", "Germany", "Singapore", "UAE", "UK", "Japan"];

const BUCKETS = {
  all:         () => true,
  active:      (c) => !!c.active,
  inactive:    (c) => !c.active,
  missingGst:  (c) => !c.gstin || String(c.gstin).trim() === "",
};

function SkCompanyCard() {
  return (
    <div className="bg-surface-container-lowest border border-border rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="hidden md:flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const { items, loading, fetchAll, create, update, remove } = useCompaniesStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const toast = useToast();

  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("all");
  const [country, setCountry] = useState("all");
  const [busyCode, setBusyCode] = useState(null);

  useEffect(() => { fetchAll().catch(() => {}); }, [fetchAll]);

  const FIELDS = useMemo(() => ([
    { name: "code", label: "Company Code", required: true, lockOnEdit: true, placeholder: "CMP-001" },
    { name: "name", label: "Legal Name", required: true },
    { name: "gstin", label: "GSTIN / Tax ID" },
    { name: "country", label: "Country", type: "select", options: COUNTRIES },
    { name: "address", label: "Registered Address", type: "textarea" },
    { name: "active", label: "Status", type: "checkbox", checkboxLabel: "Active" },
  ]), []);

  const counts = useMemo(() => ({
    total:      items.length,
    active:     items.filter(BUCKETS.active).length,
    inactive:   items.filter(BUCKETS.inactive).length,
    missingGst: items.filter(BUCKETS.missingGst).length,
  }), [items]);

  const distinctCountries = useMemo(() => {
    const set = new Set();
    items.forEach((c) => { if (c.country) set.add(c.country); });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (!BUCKETS[bucket](c)) return false;
      if (country !== "all" && (c.country ?? "") !== country) return false;
      if (!q) return true;
      return (
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.code ?? "").toLowerCase().includes(q) ||
        (c.gstin ?? "").toLowerCase().includes(q) ||
        (c.country ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, bucket, country]);

  const toggleBucket = (b) => setBucket((prev) => (prev === b ? "all" : b));
  const clearFilters = () => { setQuery(""); setBucket("all"); setCountry("all"); };
  const hasFilters = query !== "" || bucket !== "all" || country !== "all";

  const onSave = async (payload) => {
    if (drawer?.code) {
      const { code, ...rest } = payload;
      await update(drawer.code, rest);
    } else {
      await create(payload);
    }
  };

  const handleDelete = async (e, c) => {
    e.stopPropagation();
    if (!window.confirm(`Delete company "${c.name}" (${c.code})?`)) return;
    setBusyCode(c.code);
    try {
      await remove(c.code);
      toast.success(`${c.name} deleted`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Could not delete company");
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      <PageHeader
        title="Companies"
        subtitle="Legal entities within your organization. Used as PR/PO requesters and on PDF letterheads."
        actions={
          isAdmin && (
            <button
              onClick={() => setDrawer({})}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> New Company
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
            label="Missing GSTIN"
            value={counts.missingGst}
            icon={AlertTriangle}
            tone="warning"
            active={bucket === "missingGst"}
            onClick={() => toggleBucket("missingGst")}
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
            placeholder="Search by code, name, GSTIN, country…"
            className="w-full bg-surface-container-low border border-border rounded-md focus:border-primary focus:ring-0 pl-10 pr-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="bg-surface-container-low border border-border rounded-md focus:border-primary focus:ring-0 py-2 pl-3 pr-8 text-sm text-text outline-none"
        >
          <option value="all">All countries</option>
          {distinctCountries.map((c) => (
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
          {Array.from({ length: 6 }).map((_, i) => <SkCompanyCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={items.length === 0 ? "No companies yet" : "No companies match your filters"}
          description={
            items.length === 0
              ? (isAdmin ? "Add your first legal entity to get started." : "Ask an admin to add companies.")
              : "Try clearing the search, country, or status bucket."
          }
          action={
            items.length === 0
              ? (isAdmin ? { onClick: () => setDrawer({}), label: "Add your first company" } : undefined)
              : { onClick: clearFilters, label: "Clear filters" }
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((c) => {
              const missingGst = BUCKETS.missingGst(c);
              const isBusy = busyCode === c.code;
              const clickable = isAdmin;
              return (
                <div
                  key={c.code}
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
                      title={c.active ? "Active company" : "Inactive company"}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-info text-xs px-1.5 py-0.5 rounded bg-info-soft">
                          {c.code}
                        </span>
                        <span className="font-semibold text-text truncate">{c.name}</span>
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-1.5 mt-1 truncate">
                        {c.country ? (
                          <>
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{c.country}</span>
                          </>
                        ) : (
                          <span className="italic text-text-subtle">No country</span>
                        )}
                        <span className="text-text-subtle">·</span>
                        {missingGst ? (
                          <span className="inline-flex items-center gap-1 text-warning">
                            <AlertTriangle className="h-3 w-3" /> Missing GSTIN
                          </span>
                        ) : (
                          <span className="font-mono">GSTIN {c.gstin}</span>
                        )}
                        {c.address && (
                          <>
                            <span className="text-text-subtle hidden md:inline">·</span>
                            <span
                              className="hidden md:inline truncate text-text-subtle"
                              title={c.address}
                            >
                              {c.address}
                            </span>
                          </>
                        )}
                      </div>
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
            compan{filtered.length === 1 ? "y" : "ies"}
          </div>
        </>
      )}

      {drawer && isAdmin && (
        <GenericMasterDrawer
          open
          onClose={() => { setDrawer(null); fetchAll().catch(() => {}); }}
          entity="Company"
          fields={FIELDS}
          values={drawer}
          isNew={!drawer?.code}
          onSave={onSave}
          onDelete={drawer?.code ? () => remove(drawer.code) : undefined}
        />
      )}
    </div>
  );
}
