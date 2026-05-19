import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Download, Warehouse } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import StatusPill from "../../../components/data/StatusPill.jsx";
import RefreshButton from "../../../components/data/RefreshButton.jsx";
import KpiStatCard from "../../../components/data/KpiStatCard.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import client from "../../../api/client.js";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

function SkInventoryRow() {
  return (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-44" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-10 ml-auto" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
    </tr>
  );
}

/**
 * Inventory is computed server-side from approved GRNs (no inventory table).
 * GET /api/inventory returns one row per active master item with the
 * accumulated `on_hand` qty, plus orphan codes that appeared in receipts but
 * aren't in the master catalog. We fetch once on mount and on Refresh.
 */
export default function InventoryListPage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | low | in_stock

  const fetchRows = async () => {
    setLoading(true);
    try {
      const r = await client.get("/inventory");
      setRows(Array.isArray(r.data?.data) ? r.data.data : []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.category ?? "").toLowerCase().includes(q),
      );
    }
    if (filter === "low") list = list.filter((r) => r.low);
    if (filter === "in_stock") list = list.filter((r) => !r.low && r.on_hand > 0);
    return list;
  }, [rows, query, filter]);

  const counts = useMemo(() => {
    const c = { total: rows.length, low: 0, in_stock: 0 };
    for (const r of rows) {
      if (r.low) c.low += 1;
      else if (r.on_hand > 0) c.in_stock += 1;
    }
    return c;
  }, [rows]);

  const toggleFilter = (f) => setFilter((prev) => (prev === f ? "all" : f));

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 sm:space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Real-time stock derived from approved goods receipts"
        actions={
          <>
            <RefreshButton onRefresh={fetchRows} loading={loading} />
            <button
              onClick={() => toast.success(`Exported ${filtered.length} items`)}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-text text-sm font-semibold hover:bg-surface-container-low"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <Link
              to="/app/grn/new"
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-primary-foreground text-sm font-bold"
            >
              <Warehouse className="h-4 w-4" /> Receive Stock
            </Link>
          </>
        }
      />

      {/* KPI strip — same active treatment as PR/PO/RFQ/GRN */}
      <div className="-mx-4 sm:mx-0">
        <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 px-4 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0">
          <KpiStatCard
            label="SKUs Tracked"
            value={counts.total}
            icon={TrendingUp}
            tone="neutral"
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <KpiStatCard
            label="In Stock"
            value={counts.in_stock}
            icon={CheckCircle2}
            tone="success"
            active={filter === "in_stock"}
            onClick={() => toggleFilter("in_stock")}
          />
          <KpiStatCard
            label="Low / Out"
            value={counts.low}
            icon={AlertTriangle}
            tone="danger"
            active={filter === "low"}
            onClick={() => toggleFilter("low")}
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-lg flex gap-3 items-center border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items, code, category…"
            className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary pl-10 pr-4 py-2 text-sm text-text outline-none rounded"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-border">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
                  <th className="px-6 py-3 text-left">Code</th>
                  <th className="px-6 py-3 text-left">Item</th>
                  <th className="px-6 py-3 text-left">Category</th>
                  <th className="px-6 py-3 text-right">On Hand</th>
                  <th className="px-6 py-3 text-right">Min</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from({ length: 6 }).map((_, i) => <SkInventoryRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            {rows.length === 0
              ? "No items in catalog yet."
              : "No items match the current filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
                <th className="px-6 py-3 text-left">Code</th>
                <th className="px-6 py-3 text-left">Item</th>
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-right">On Hand</th>
                <th className="px-6 py-3 text-right">Min</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const onHand = Number(r.on_hand) || 0;
                const min = Number(r.min_stock) || 0;
                return (
                  <tr key={r.code} className="hover:bg-surface-container-low">
                    <td className="px-6 py-4 font-medium text-info font-mono">
                      {r.code}
                    </td>
                    <td className="px-6 py-4 font-medium">{r.name}</td>
                    <td className="px-6 py-4 text-text-muted">{r.category}</td>
                    <td
                      className={`px-6 py-4 text-right font-semibold tabular-nums ${
                        r.low ? "text-danger" : "text-text"
                      }`}
                    >
                      {onHand} {r.uom}
                    </td>
                    <td className="px-6 py-4 text-right text-text-muted tabular-nums">
                      {min}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill tone={r.low ? "danger" : onHand === 0 ? "neutral" : "success"}>
                        {r.low ? (onHand === 0 ? "Out of Stock" : "Low") : "In Stock"}
                      </StatusPill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && !loading && (
        <div className="text-xs text-text-muted">
          Showing <strong className="text-text">{filtered.length}</strong>
          {filtered.length !== counts.total && (
            <> of <strong className="text-text">{counts.total}</strong></>
          )}{" "}
          item{filtered.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
