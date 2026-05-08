import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronRight, Package, Loader2, AlertTriangle, ShieldCheck, Camera,
  CheckCircle2, XCircle, Clock, FileText, Download, RefreshCcw, Eye,
} from "lucide-react";
import StatusPill from "../../../components/data/StatusPill.jsx";
import { useGRNStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import grnApi from "../api.js";
import { DocumentPreviewModal } from "../../../components/misc/DocumentPreview.jsx";
import PrintLetterhead from "../../../components/print/PrintLetterhead.jsx";
import PrintFooter from "../../../components/print/PrintFooter.jsx";
import PrintActions from "../../../components/print/PrintActions.jsx";

function Meta({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-base font-medium text-text">{value ?? "—"}</div>
    </div>
  );
}

const INVOICE_LABEL = {
  tax_invoice: "Tax Invoice",
  proforma:    "Proforma",
  invoice:     "Invoice",
  none:        "No invoice",
};

export default function GRNDetailPage() {
  const { id: number } = useParams();
  const inStore = useGRNStore((s) => s.items.find((g) => g.number === number));
  const [grn, setGrn] = useState(inStore ?? null);
  const [loading, setLoading] = useState(!inStore);
  const [acting, setActing] = useState(false);
  const [previewing, setPreviewing] = useState(null); // { url, name, kind }
  const previewDoc = async (doc) => {
    const guess = doc.mime_type === "application/pdf" ? "pdf"
      : doc.mime_type?.startsWith("image/") ? "image" : "other";
    setPreviewing({ url: null, name: doc.original_name, kind: guess });
    try {
      const blob = await grnApi.documents.getBlob(doc.id);
      const url = URL.createObjectURL(blob);
      const kind = blob.type === "application/pdf" ? "pdf"
        : blob.type?.startsWith("image/") ? "image" : "other";
      setPreviewing({ url, name: doc.original_name, kind });
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Couldn't load preview");
      setPreviewing(null);
    }
  };
  const closePreview = () => {
    if (previewing?.url) URL.revokeObjectURL(previewing.url);
    setPreviewing(null);
  };
  const downloadDoc = async (doc) => {
    try {
      const blob = await grnApi.documents.getBlob(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = doc.original_name; document.body.appendChild(a);
      a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Download failed");
    }
  };
  const [showPmModal, setShowPmModal] = useState(false);
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (inStore) {
      setGrn(inStore); setLoading(false); return;
    }
    let cancelled = false;
    setLoading(true);
    grnApi.get(number)
      .then((data) => { if (!cancelled) { setGrn(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [number, inStore]);

  const refresh = async () => {
    try { setGrn(await grnApi.get(number)); }
    catch (err) { toast.error("Failed to refresh"); }
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }
  if (!grn) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-text mb-2">GRN not found</h2>
        <Link to="/app/grn" className="text-primary font-bold hover:underline">Back to list</Link>
      </div>
    );
  }

  const items = Array.isArray(grn.items) ? grn.items : [];
  const documents = Array.isArray(grn.documents) ? grn.documents : [];
  const isPM = user?.role === "project_manager" || user?.role === "admin";
  const isVendor = user?.role === "vendor";
  const canPmAct = isPM && grn.chain_stage === "pending_pm";
  const canAcceptReplacement = isVendor && grn.replacement_status === "pending";
  const totalDamaged = items.reduce((s, it) => s + (Number(it.damaged) || 0), 0);

  // Stage banner
  const chainCfg = grn.chain_stage === "done" && grn.status === "rejected"
    ? { tone: "danger",  Icon: XCircle,      title: "Rejected by PM",       body: grn.inspection_notes ?? "GRN rejected during inspection." }
    : grn.chain_stage === "done"
    ? { tone: "success", Icon: CheckCircle2, title: "PM approved",          body: grn.pm_approver?.name ? `Approved by ${grn.pm_approver.name}.` : "GRN finalised." }
    : { tone: "warning", Icon: Clock,        title: "Awaiting PM approval", body: "A Project Manager must inspect and approve the goods before this GRN is finalised." };

  const onPmAction = async (action, comments) => {
    setActing(true);
    try {
      const updated = await grnApi.updateStatus(grn.number, { action, comments });
      setGrn(updated);
      setShowPmModal(false);
      toast.success(`GRN ${action === "approve" ? "approved" : "rejected"}.`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not update");
    } finally { setActing(false); }
  };

  const onAcceptReplacement = async () => {
    const note = window.prompt("Add a commitment note (optional, e.g. ETA for replacement):") ?? "";
    setActing(true);
    try {
      const updated = await grnApi.acceptReplacement(grn.number, { commitment_note: note });
      setGrn(updated);
      toast.success("Replacement acknowledged.");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not acknowledge");
    } finally { setActing(false); }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-8">
      <PrintLetterhead docType="Goods Receipt Note" docNumber={grn.number}
        subtitle={grn.po_number ? `PO: ${grn.po_number}` : null} />

      <nav className="text-sm font-medium text-text-muted mb-2 flex items-center gap-2 print:hidden">
        <Link to="/app/grn" className="hover:text-primary">GRN</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-text">{grn.number}</span>
      </nav>

      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-3xl font-bold text-text tracking-tight flex items-center gap-3 flex-wrap">
          {grn.number}
          <StatusPill tone={grn.status === "full" ? "success" : grn.status === "rejected" ? "danger" : "warning"}>
            {grn.status === "full" ? "Full Receipt" : grn.status === "rejected" ? "Rejected" : "Partial"}
          </StatusPill>
          {totalDamaged > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-soft text-warning text-xs font-bold border border-warning/30">
              <AlertTriangle className="h-3 w-3" /> {totalDamaged} damaged
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="text-text-muted hover:text-text p-2 rounded-md hover:bg-surface-container-low" title="Refresh">
            <RefreshCcw className="h-4 w-4" />
          </button>
          <PrintActions
            pdfFetcher={() => grnApi.downloadPdf(grn.number)}
            pdfFilename={`${grn.number}.pdf`}
            onError={(msg) => toast.error(msg)}
            onPdfHint={(msg) => toast.info(msg)}
          />
        </div>
      </div>

      {/* ── Chain banner ───────────────────────────────────────────── */}
      <ChainBanner cfg={chainCfg} canAct={canPmAct} onActionClick={() => setShowPmModal(true)} acting={acting} />

      {/* ── Vendor replacement banner ──────────────────────────────── */}
      {(grn.replacement_status === "pending" || grn.replacement_status === "accepted") && (
        <ReplacementBanner
          status={grn.replacement_status}
          isVendor={isVendor}
          onAccept={onAcceptReplacement}
          acting={acting}
          totalDamaged={totalDamaged}
        />
      )}

      {/* ── Receipt info ───────────────────────────────────────────── */}
      <section className="bg-surface-container-lowest rounded-md p-6 border border-border mb-6">
        <h2 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" /> Receipt Info
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Meta label="PO" value={
            <Link to={`/app/purchase-orders/${grn.po_number}`} className="text-info hover:underline">{grn.po_number}</Link>
          } />
          <Meta label="Vendor" value={grn.vendor} />
          <Meta label="Receipt Date" value={grn.received_date} />
          <Meta label="Challan / DN" value={grn.challan_no} />
          <Meta label="Invoice Type" value={INVOICE_LABEL[grn.invoice_type] ?? "—"} />
          {grn.pm_approved_at && (
            <Meta label="PM Approved" value={new Date(grn.pm_approved_at).toLocaleString()} />
          )}
        </div>
      </section>

      {/* ── Items table — Order/Received/Damaged/Accepted/Balance ──── */}
      <section className="bg-surface-container-lowest rounded-md overflow-hidden border border-border mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-3 py-3 text-right">Order</th>
              <th className="px-3 py-3 text-right">Received</th>
              <th className="px-3 py-3 text-right">Damaged</th>
              <th className="px-3 py-3 text-right">Accepted</th>
              <th className="px-3 py-3 text-right">Balance</th>
              <th className="px-3 py-3 text-left">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it, i) => {
              const ordered = Number(it.ordered) || 0;
              const received = Number(it.received) || 0;
              const damaged = Number(it.damaged) || 0;
              const accepted = Math.max(0, received - damaged);
              const balance = Math.max(0, ordered - accepted);
              return (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{it.name}</div>
                    {it.code && <div className="text-xs text-info">{it.code}</div>}
                  </td>
                  <td className="px-3 py-3 text-right text-text-muted">{ordered}</td>
                  <td className="px-3 py-3 text-right font-medium">{received}</td>
                  <td className={`px-3 py-3 text-right font-medium ${damaged > 0 ? "text-warning" : "text-text-subtle"}`}>{damaged}</td>
                  <td className="px-3 py-3 text-right font-semibold text-success">{accepted}</td>
                  <td className={`px-3 py-3 text-right ${balance === 0 ? "text-success" : "text-warning"}`}>{balance}</td>
                  <td className="px-3 py-3 text-xs text-text-muted">{it.remark ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── Damage report ───────────────────────────────────────────── */}
      {totalDamaged > 0 && (
        <section className="bg-warning-soft/30 border border-warning/30 rounded-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-bold text-text">Damage Report</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <Meta label="By whom" value={grn.damage_by} />
            <Meta label="Remark" value={grn.damage_remark} />
            <Meta label="Replacement status" value={
              grn.replacement_status
                ? grn.replacement_status.replace(/_/g, " ")
                : "—"
            } />
          </div>
          {grn.damage_comment && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Detailed comment</div>
              <p className="text-sm text-text bg-surface-container-lowest border border-border rounded-md p-3">{grn.damage_comment}</p>
            </div>
          )}
          {/* Damage photos */}
          {documents.filter((d) => d.doc_type === "damage_photo").length > 0 && (
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" /> Damage photos
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {documents.filter((d) => d.doc_type === "damage_photo").map((d) => (
                  <DamagePhotoTile
                    key={d.id}
                    doc={d}
                    items={items}
                    onPreview={() => previewDoc(d)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Other documents (invoice / proforma / tax_invoice) ─────── */}
      {documents.filter((d) => d.doc_type !== "damage_photo").length > 0 && (
        <section className="bg-surface-container-lowest rounded-md p-6 border border-border mb-6">
          <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Documents
          </h2>
          <ul className="space-y-2">
            {documents.filter((d) => d.doc_type !== "damage_photo").map((d) => (
              <li key={d.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-md">
                <FileText className="h-4 w-4 text-text-muted" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.original_name}</div>
                  <div className="text-xs text-text-muted">
                    {d.doc_type.replace(/_/g, " ")} · {(d.size_bytes / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button type="button" onClick={() => previewDoc(d)}
                   className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-md hover:bg-primary-soft">
                  <Eye className="h-3 w-3" /> Preview
                </button>
                <button type="button" onClick={() => downloadDoc(d)}
                   className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-text-muted border border-border rounded-md hover:bg-surface-container-low">
                  <Download className="h-3 w-3" /> Download
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── PM approval history ────────────────────────────────────── */}
      {grn.approval_history?.length > 0 && (
        <section className="bg-surface-container-lowest rounded-md p-6 border border-border mb-6">
          <h2 className="text-base font-bold text-text mb-4">Activity</h2>
          <ol className="space-y-2">
            {grn.approval_history.map((h, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  h.action === "approve" ? "bg-success-soft text-success"
                  : h.action === "reject" ? "bg-danger-soft text-danger"
                  : "bg-info-soft text-info"
                }`}>
                  {h.action === "approve" ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : h.action === "reject" ? <XCircle className="h-3.5 w-3.5" />
                    : <CheckCircle2 className="h-3.5 w-3.5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-text">
                    <span className="font-semibold">{h.by_user_name ?? "—"}</span>
                    {h.by_role && <span className="text-text-muted"> ({h.by_role})</span>}
                    {" "}
                    <span className="text-text-muted">{actionVerb(h.action)} at {h.stage}</span>
                  </div>
                  {h.comment && <div className="text-xs text-text-muted mt-0.5 italic">"{h.comment}"</div>}
                  <div className="text-[10px] text-text-subtle">{h.at && new Date(h.at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <PrintFooter docNumber={grn.number} signatures={[
        { label: "Site Person" },
        { label: "Vendor / Driver", name: grn.vendor },
        { label: "Project Manager", name: grn.pm_approver?.name ?? "" },
      ]} />

      {showPmModal && (
        <PmActionModal acting={acting} onCancel={() => setShowPmModal(false)} onSubmit={onPmAction} />
      )}

      {previewing && (
        <DocumentPreviewModal
          url={previewing.url}
          name={previewing.name}
          kind={previewing.kind}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

// ── Damage photo tile — placeholder + click-to-preview (no auto-fetch) ─────
function DamagePhotoTile({ doc, items, onPreview }) {
  // Lazy: don't pre-fetch the photo blob just to show a thumbnail. The
  // preview modal handles the auth-gated load on click.
  return (
    <button
      type="button"
      onClick={onPreview}
      className="group block text-left bg-surface-container-lowest border border-border rounded-md p-3 hover:border-primary transition-colors w-full"
    >
      <div className="aspect-square bg-surface-container-low rounded mb-2 flex items-center justify-center overflow-hidden relative">
        <Camera className="h-8 w-8 text-text-subtle" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg/95 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-text inline-flex items-center gap-1">
            <Eye className="h-3 w-3" /> Preview
          </div>
        </div>
      </div>
      <div className="text-xs font-medium text-text truncate">{doc.original_name}</div>
      {doc.caption && <div className="text-xs text-text-muted truncate">{doc.caption}</div>}
      {doc.item_index !== null && doc.item_index !== undefined && items[doc.item_index] && (
        <div className="text-[10px] text-text-subtle mt-1">Linked to: {items[doc.item_index].name}</div>
      )}
    </button>
  );
}

function actionVerb(a) {
  if (a === "approve") return "approved";
  if (a === "reject") return "rejected";
  if (a === "vendor_accepted") return "accepted replacement";
  return a;
}

function ChainBanner({ cfg, canAct, onActionClick, acting }) {
  const tones = {
    success: { bg: "bg-success-soft/30", border: "border-success/30", icon: "text-success" },
    warning: { bg: "bg-warning-soft/30", border: "border-warning/30", icon: "text-warning" },
    danger:  { bg: "bg-danger-soft/30",  border: "border-danger/30",  icon: "text-danger" },
  };
  const t = tones[cfg.tone];
  const Icon = cfg.Icon;
  return (
    <section className={`${t.bg} border ${t.border} rounded-md p-4 mb-6 print:hidden`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${t.icon} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text">{cfg.title}</h3>
          <p className="text-sm text-text-muted">{cfg.body}</p>
        </div>
        {canAct && (
          <button
            onClick={onActionClick}
            disabled={acting}
            className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md flex items-center gap-2 disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" /> Inspect &amp; act
          </button>
        )}
      </div>
    </section>
  );
}

function ReplacementBanner({ status, isVendor, onAccept, acting, totalDamaged }) {
  const isAccepted = status === "accepted";
  return (
    <section className={`${isAccepted ? "bg-info-soft/30 border-info/30" : "bg-warning-soft/30 border-warning/30"} border rounded-md p-4 mb-6 print:hidden`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${isAccepted ? "text-info" : "text-warning"}`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text">
            {isAccepted ? "Vendor committed to replacement" : "Vendor must accept replacement"}
          </h3>
          <p className="text-sm text-text-muted">
            {isAccepted
              ? "Replacement is being arranged by the vendor."
              : `${totalDamaged} unit${totalDamaged === 1 ? "" : "s"} flagged as damaged. Vendor needs to acknowledge and replace.`}
          </p>
        </div>
        {isVendor && !isAccepted && (
          <button
            onClick={onAccept}
            disabled={acting}
            className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md disabled:opacity-60"
          >
            Accept &amp; arrange replacement
          </button>
        )}
      </div>
    </section>
  );
}

function PmActionModal({ acting, onCancel, onSubmit }) {
  const [comments, setComments] = useState("");
  const [action, setAction] = useState("approve");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-surface-container-lowest border border-border rounded-lg w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-text">PM inspection</h3>
          <p className="text-xs text-text-muted">After approval, PO fulfilment is recalculated automatically.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {["approve", "reject"].map((a) => (
              <button key={a} type="button" onClick={() => setAction(a)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold border ${
                  action === a
                    ? a === "approve"
                      ? "bg-success text-primary-foreground border-success"
                      : "bg-danger text-primary-foreground border-danger"
                    : "border-border text-text hover:border-primary"
                }`}
              >{a === "approve" ? "Approve" : "Reject"}</button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Inspection notes</label>
            <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)}
              placeholder="What did you check? Any concerns?"
              className="w-full bg-surface-container-low border border-border focus:border-primary rounded-md px-3 py-2 text-sm outline-none resize-none" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onCancel} disabled={acting} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
          <button onClick={() => onSubmit(action, comments)} disabled={acting}
            className="px-5 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md flex items-center gap-2 disabled:opacity-60">
            {acting && <Loader2 className="h-4 w-4 animate-spin" />}
            {action === "approve" ? "Approve GRN" : "Reject GRN"}
          </button>
        </div>
      </div>
    </div>
  );
}
