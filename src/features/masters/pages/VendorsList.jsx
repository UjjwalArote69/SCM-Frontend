import { useEffect, useState } from "react";
import {
  Plus,
  Star,
  Search,
  Loader2,
  Edit3,
  Trash2,
  CheckCircle2,
  Ban,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import VendorDrawer from "../components/VendorDrawer.jsx";
import { useVendorsStore } from "../vendors/store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";

const TONE = {
  approved: "success",
  pending: "warning",
  suspended: "danger",
};

export default function VendorsListPage() {
  const vendors = useVendorsStore((s) => s.items);
  const loading = useVendorsStore((s) => s.loading);
  const fetchAll = useVendorsStore((s) => s.fetchAll);
  const update = useVendorsStore((s) => s.update);
  const remove = useVendorsStore((s) => s.remove);
  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");
  const [busyCode, setBusyCode] = useState(null);
  const toast = useToast();

  const pendingCount = vendors.filter(
    (v) => v.approval_status === "pending",
  ).length;

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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = vendors.filter((v) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (v.code ?? "").toLowerCase().includes(q) ||
      (v.vendor_name ?? "").toLowerCase().includes(q) ||
      (v.email_address_1 ?? "").toLowerCase().includes(q) ||
      (v.deals_in ?? "").toLowerCase().includes(q)
    );
  });

  const handleDelete = async (e, code) => {
    e.stopPropagation();
    if (!window.confirm(`Delete vendor ${code}?`)) return;
    try {
      await remove(code);
      toast.success(`Vendor ${code} deleted`);
    } catch (err) {
      toast.error(err?.message ?? "Could not delete vendor");
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Vendors Master"
        subtitle="All approved and pending vendors"
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

      {pendingCount > 0 && (
        <div className="mb-4 bg-warning-soft/60 border border-warning/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm">
            <strong className="text-warning">{pendingCount} pending vendor{pendingCount === 1 ? "" : "s"}</strong>
            <span className="text-text-muted ml-1">
              — approve them to make them available for RFQs.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-xs font-semibold text-warning hover:text-warning/80 underline"
          >
            Show all
          </button>
        </div>
      )}

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code, name, email, deals in…"
          className="w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary focus:ring-0 pl-10 pr-3 py-2 text-sm text-text outline-none"
        />
      </div>

      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
              <th className="px-6 py-3 text-left">Code</th>
              <th className="px-6 py-3 text-left">Vendor</th>
              <th className="px-6 py-3 text-left">Primary Contact</th>
              <th className="px-6 py-3 text-left">Deals In</th>
              <th className="px-6 py-3 text-left">Rating</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 w-56 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && vendors.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-16 text-center text-text-muted"
                >
                  <Loader2 className="inline-block h-5 w-5 animate-spin mr-2" />
                  Loading vendors…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-16 text-center text-text-muted text-sm"
                >
                  {vendors.length === 0
                    ? "No vendors yet. Click New Vendor to add your first one."
                    : "No vendors match your search."}
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr
                  key={v.code}
                  className="hover:bg-surface-container-low cursor-pointer"
                  onClick={() => setDrawer(v)}
                >
                  <td className="px-6 py-4 font-medium text-info">{v.code}</td>
                  <td className="px-6 py-4 font-medium">{v.vendor_name}</td>
                  <td className="px-6 py-4 text-text-muted">
                    {v.contact_person_1 ?? "—"}
                    <div className="text-xs">{v.email_address_1 ?? ""}</div>
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    {v.deals_in ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    {v.rating > 0 ? (
                      <span className="inline-flex items-center gap-1 text-warning">
                        <Star className="h-4 w-4 fill-current" /> {v.rating}
                      </span>
                    ) : (
                      <span className="text-text-subtle text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill tone={TONE[v.approval_status] ?? "warning"}>
                      {v.approval_status}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {v.approval_status === "pending" && (
                        <button
                          onClick={(e) => handleQuickStatus(e, v, "approved")}
                          disabled={busyCode === v.code}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-success-soft text-success border border-success/30 rounded hover:bg-success hover:text-white transition-colors disabled:opacity-60"
                          title="Approve vendor"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Approve
                        </button>
                      )}
                      {v.approval_status === "approved" && (
                        <button
                          onClick={(e) => handleQuickStatus(e, v, "suspended")}
                          disabled={busyCode === v.code}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-surface-container-low text-text-muted border border-border rounded hover:bg-danger-soft hover:text-danger hover:border-danger/30 transition-colors disabled:opacity-60"
                          title="Suspend vendor"
                        >
                          <Ban className="h-3 w-3" /> Suspend
                        </button>
                      )}
                      {v.approval_status === "suspended" && (
                        <button
                          onClick={(e) => handleQuickStatus(e, v, "approved")}
                          disabled={busyCode === v.code}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-success-soft text-success border border-success/30 rounded hover:bg-success hover:text-white transition-colors disabled:opacity-60"
                          title="Re-activate vendor"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Reinstate
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawer(v);
                        }}
                        aria-label={`Edit ${v.code}`}
                        className="text-text-muted hover:text-primary p-1"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, v.code)}
                        aria-label={`Delete ${v.code}`}
                        className="text-text-muted hover:text-danger p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <VendorDrawer
        open={!!drawer}
        vendor={drawer}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}
