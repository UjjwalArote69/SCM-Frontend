import { useEffect, useMemo, useState } from "react";
import {
  Plus, Star, Search, Edit3, Trash2, CheckCircle2, Ban, X,
  BarChart3, Clock, AlertOctagon, Building2, Mail,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import VendorDrawer from "../components/VendorDrawer.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { useVendorsStore } from "../vendors/store.js";
import { useToast } from "../../../hooks/useToast.jsx";

const TONE = {
  approved:  "success",
  pending:   "warning",
  suspended: "danger",
};

const TONE_TINT = {
  success: { bg: "bg-success-soft",  fg: "text-success" },
  warning: { bg: "bg-warning-soft",  fg: "text-warning" },
  danger:  { bg: "bg-danger-soft",   fg: "text-danger" },
  neutral: { bg: "bg-surface-container", fg: "text-text-muted" },
};

const BUCKETS = {
  all:       () => true,
  approved:  (v) => v.approval_status === "approved",
  pending:   (v) => v.approval_status === "pending",
  suspended: (v) => v.approval_status === "suspended",
};

function SkVendorCard() {
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
      <div className="hidden md:flex items-center gap-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-7 w-20 rounded" />
      </div>
    </div>
  );
}

export default function VendorsListPage() {
  const vendors = useVendorsStore((s) => s.items);
  const loading = useVendorsStore((s) => s.loading);
  const fetchAll = useVendorsStore((s) => s.fetchAll);
  const update = useVendorsStore((s) => s.update);
  const remove = useVendorsStore((s) => s.remove);
  const toast = useToast();

  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("all");
  const [busyCode, setBusyCode] = useState(null);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const counts = useMemo(() => ({
    total:     vendors.length,
    approved:  vendors.filter(BUCKETS.approved).length,
    pending:   vendors.filter(BUCKETS.pending).length,
    suspended: vendors.filter(BUCKETS.suspended).length,
  }), [vendors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vendors.filter((v) => {
      if (!BUCKETS[bucket](v)) return false;
      if (!q) return true;
      return (
        (v.code ?? "").toLowerCase().includes(q) ||
        (v.vendor_name ?? "").toLowerCase().includes(q) ||
        (v.email_address_1 ?? "").toLowerCase().includes(q) ||
        (v.contact_person_1 ?? "").toLowerCase().includes(q) ||
        (v.deals_in ?? "").toLowerCase().includes(q)
      );
    });
  }, [vendors, query, bucket]);

  const toggleBucket = (b) => setBucket((prev) => (prev === b ? "all" : b));
  const clearFilters = () => { setQuery(""); setBucket("all"); };
  const hasFilters = query !== "" || bucket !== "all";

  const handleQuickStatus = async (e, v, newStatus) => {
    e.stopPropagation();
    setBusyCode(v.code);
    try {
      await update(v.code, { approval_status: newStatus });
      toast.success(
        newStatus === "approved"
          ? `${v.vendor_name} approved — now eligible for RFQs`
          : `${v.vendor_name} set to ${newStatus}`,
      );
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not update status");
    } finally {
      setBusyCode(null);
    }
  };

  const handleDelete = async (e, v) => {
    e.stopPropagation();
    if (!window.confirm(`Delete vendor ${v.code} (${v.vendor_name})?`)) return;
    setBusyCode(v.code);
    try {
      await remove(v.code);
      toast.success(`Vendor ${v.code} deleted`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Could not delete vendor");
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      <PageHeader
        title="Vendors Master"
        subtitle="All registered suppliers. Approved vendors become eligible for RFQs and POs."
        actions={
          <>
            <RefreshButton onRefresh={fetchAll} loading={loading} />
            <button
              onClick={() => setDrawer({})}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> New Vendor
            </button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="-mx-4 sm:mx-0 mb-5">
        <div className="flex sm:grid sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0">
          <KpiStatCard
            label="Total Vendors"
            value={counts.total}
            icon={BarChart3}
            tone="info"
            active={bucket === "all"}
            onClick={() => setBucket("all")}
          />
          <KpiStatCard
            label="Approved"
            value={counts.approved}
            icon={CheckCircle2}
            tone="success"
            active={bucket === "approved"}
            onClick={() => toggleBucket("approved")}
          />
          <KpiStatCard
            label="Pending"
            value={counts.pending}
            icon={Clock}
            tone="warning"
            active={bucket === "pending"}
            onClick={() => toggleBucket("pending")}
          />
          <KpiStatCard
            label="Suspended"
            value={counts.suspended}
            icon={AlertOctagon}
            tone="danger"
            active={bucket === "suspended"}
            onClick={() => toggleBucket("suspended")}
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
            placeholder="Search by code, name, email, contact, deals in…"
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
      {loading && vendors.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <SkVendorCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={vendors.length === 0 ? "No vendors yet" : "No vendors match your filters"}
          description={
            vendors.length === 0
              ? "Add your first supplier to start sourcing."
              : "Try clearing the search or status bucket."
          }
          action={
            vendors.length === 0
              ? { onClick: () => setDrawer({}), label: "Add your first vendor" }
              : { onClick: clearFilters, label: "Clear filters" }
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((v) => {
              const tone = TONE[v.approval_status] ?? "neutral";
              const tint = TONE_TINT[tone];
              const isBusy = busyCode === v.code;
              return (
                <div
                  key={v.code}
                  onClick={() => setDrawer(v)}
                  className="group bg-surface-container-lowest border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-150"
                >
                  {/* Icon + identity */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${tint.bg} ${tint.fg}`}
                      title={v.approval_status}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-info text-xs px-1.5 py-0.5 rounded bg-info-soft">
                          {v.code}
                        </span>
                        <span className="font-semibold text-text truncate">{v.vendor_name}</span>
                        {v.rating > 0 && (
                          <span className="inline-flex items-center gap-1 text-warning text-xs">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {v.rating}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-1.5 mt-1 truncate">
                        {v.contact_person_1 ? (
                          <>
                            <span className="text-text">{v.contact_person_1}</span>
                            {v.email_address_1 && (
                              <>
                                <span className="text-text-subtle">·</span>
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{v.email_address_1}</span>
                              </>
                            )}
                          </>
                        ) : v.email_address_1 ? (
                          <>
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{v.email_address_1}</span>
                          </>
                        ) : (
                          <span className="italic text-text-subtle">No contact info</span>
                        )}
                        {v.deals_in && (
                          <>
                            <span className="text-text-subtle hidden md:inline">·</span>
                            <span className="hidden md:inline truncate text-text-subtle">
                              Deals in {v.deals_in}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status + quick action */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap pl-14 sm:pl-0">
                    <StatusPill tone={tone}>{v.approval_status}</StatusPill>
                    <div onClick={(e) => e.stopPropagation()}>
                      {v.approval_status === "pending" && (
                        <button
                          onClick={(e) => handleQuickStatus(e, v, "approved")}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-success-soft text-success border border-success/30 rounded-md hover:bg-success hover:text-white transition-colors disabled:opacity-60"
                          title="Approve vendor — makes them eligible for RFQs"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Approve
                        </button>
                      )}
                      {v.approval_status === "approved" && (
                        <button
                          onClick={(e) => handleQuickStatus(e, v, "suspended")}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-surface-container-low text-text-muted border border-border rounded-md hover:bg-danger-soft hover:text-danger hover:border-danger/30 transition-colors disabled:opacity-60"
                          title="Suspend vendor"
                        >
                          <Ban className="h-3 w-3" /> Suspend
                        </button>
                      )}
                      {v.approval_status === "suspended" && (
                        <button
                          onClick={(e) => handleQuickStatus(e, v, "approved")}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-success-soft text-success border border-success/30 rounded-md hover:bg-success hover:text-white transition-colors disabled:opacity-60"
                          title="Re-activate vendor"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Reinstate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setDrawer(v)}
                      className="text-text-muted hover:text-primary hover:bg-primary-soft p-2 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, v)}
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
            vendor{filtered.length === 1 ? "" : "s"}
          </div>
        </>
      )}

      <VendorDrawer
        open={!!drawer}
        vendor={drawer}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}
