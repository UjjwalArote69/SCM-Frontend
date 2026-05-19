import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronRight, Package, Loader2, AlertTriangle, ShieldCheck, Camera,
  CheckCircle2, XCircle, Clock, FileText, Download, RefreshCcw, Eye,
  Truck, CalendarCheck, MessageSquare, Image as ImageIcon, FileWarning,
  Link2, Circle, Handshake, Building2, Wallet, Crown, Sparkles,
} from "lucide-react";
import StatusPill from "../../../components/data/StatusPill.jsx";
import ReopenRejectedButton from "../../../components/admin/ReopenRejectedButton.jsx";
import { useGRNStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import { useAuthStore } from "../../auth/store.js";
import grnApi from "../api.js";
import { DocumentPreviewModal } from "../../../components/misc/DocumentPreview.jsx";
import PrintLetterhead from "../../../components/print/PrintLetterhead.jsx";
import PrintFooter from "../../../components/print/PrintFooter.jsx";
import PrintActions from "../../../components/print/PrintActions.jsx";
import VoiceRecorder from "../../../components/forms/VoiceRecorder.jsx";
import VoiceNotesPanel from "../../../components/data/VoiceNotesPanel.jsx";
import SendGrnVoiceNotePanel from "../components/SendGrnVoiceNotePanel.jsx";
import AdminGrnChainOverridePanel from "../components/AdminGrnChainOverridePanel.jsx";

function Meta({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-base font-medium text-text">{value ?? "—"}</div>
    </div>
  );
}

/**
 * Tiny tabular stat used inside the mobile line-item cards.
 */
function Stat({ label, value, tone = "default", muted = false }) {
  const valueCls =
    tone === "success" ? "text-success"
    : tone === "warning" ? "text-warning"
    : tone === "muted" || muted ? "text-text-muted" : "text-text";
  return (
    <div className="text-center">
      <div className="text-[9px] font-bold uppercase tracking-wider text-text-subtle">
        {label}
      </div>
      <div className={`text-[13px] font-bold tabular-nums leading-tight ${valueCls}`}>
        {value}
      </div>
    </div>
  );
}

/**
 * Compact key/value fact shown in the GRN hero facts strip. Mirrors
 * PoFact / PrFact so the three detail pages read as a single visual family.
 */
function GrnFact({ label, value, accent = false }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-subtle">
        {label}
      </span>
      <span
        className={`text-[13px] font-semibold truncate ${
          accent ? "text-primary font-mono" : "text-text"
        }`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

const INVOICE_LABEL = {
  tax_invoice: "Tax Invoice",
  proforma:    "Proforma",
};

// Tone-coded chip styling for invoice docs in the Documents list.
// Tax Invoice = success/green (final, GST-bearing).
// Proforma    = warning/amber (provisional, not yet billable).
// Anything else falls back to neutral surface tones.
function docChipTone(docType) {
  if (docType === "tax_invoice") {
    return {
      label:  "TAX INVOICE",
      strip:  "bg-success",
      chip:   "bg-success-soft text-success border-success/30",
      icon:   "text-success",
      border: "border-success/30",
    };
  }
  if (docType === "proforma") {
    return {
      label:  "PROFORMA",
      strip:  "bg-warning",
      chip:   "bg-warning-soft text-warning border-warning/30",
      icon:   "text-warning",
      border: "border-warning/30",
    };
  }
  return {
    label:  (docType ?? "doc").replace(/_/g, " ").toUpperCase(),
    strip:  "bg-text-subtle",
    chip:   "bg-surface-container text-text-muted border-border",
    icon:   "text-text-muted",
    border: "border-border",
  };
}

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
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSiteCounterModal, setShowSiteCounterModal] = useState(false);
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  // The list / create endpoints return GRN rows WITHOUT the eager-loaded
  // `documents` array — show() is the only call that includes them. So a
  // freshly-created GRN sitting in the store has documents=undefined, which
  // would silently hide everything the site person just uploaded. Always
  // fetch fresh on mount; render the cached version meanwhile to avoid a
  // loading flash when navigating from the list.
  useEffect(() => {
    let cancelled = false;
    if (!inStore) setLoading(true);
    grnApi.get(number)
      .then((data) => { if (!cancelled) { setGrn(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [number, inStore]);

  const refresh = async () => {
    try { setGrn(await grnApi.get(number)); }
    catch (err) { toast.error("Failed to refresh"); }
  };

  // Vendors view this page under /vendor/grn — back-link + breadcrumb must
  // respect that or they'll bounce to /403 trying to reach /app/grn.
  const listPath = user?.role === "vendor" ? "/vendor/grn" : "/app/grn";

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
        <Link to={listPath} className="text-primary font-bold hover:underline">Back to list</Link>
      </div>
    );
  }

  const items = Array.isArray(grn.items) ? grn.items : [];
  const documents = Array.isArray(grn.documents) ? grn.documents : [];
  const damagePhotos = documents.filter((d) => d.doc_type === "damage_photo");
  const isAdmin = user?.role === "admin";
  const isPM = user?.role === "project_manager" || isAdmin;
  const isPurchaseHod =
    user?.role === "hod" && user?.department?.code === "PURCH";
  const isVendor = user?.role === "vendor";

  // Chain (item 52, updated for Case 2): pending_pm → pending_purchase_hod
  //   → (if damaged) pending_vendor_replacement → pending_pm (restart)
  //   → pending_finance_hod → pending_cfo → pending_ceo → done
  const isFinHod = user?.role === "hod" && user?.department?.code === "FIN";
  const isCfo = user?.role === "cfo";
  const isCeo = user?.role === "ceo";
  const canPmAct = (isPM || isAdmin) && grn.chain_stage === "pending_pm";
  const canPurchaseHodAct = (isPurchaseHod || isAdmin) && grn.chain_stage === "pending_purchase_hod";
  const canFinHodAct = (isFinHod || isAdmin) && grn.chain_stage === "pending_finance_hod";
  const canCfoAct = (isCfo || isAdmin) && grn.chain_stage === "pending_cfo";
  const canCeoAct = (isCeo || isAdmin) && grn.chain_stage === "pending_ceo";
  const canAct = canPmAct || canPurchaseHodAct || canFinHodAct || canCfoAct || canCeoAct;
  // Case 2: replacement workflow now opens at pending_vendor_replacement
  // (after Purchase HOD approves a damaged GRN) instead of waiting for the
  // full chain to finish. Legacy GRNs that already cleared to 'done' with
  // an open replacement are still honoured.
  const inReplacementStage =
    grn.chain_stage === "pending_vendor_replacement"
    || (grn.chain_stage === "done" && grn.replacement_status === "pending");
  const fullyApproved = grn.chain_stage === "done" && grn.status !== "rejected";
  // Date negotiation state (item 38).
  const dateAgreed = !!grn.target_date_agreed;
  const proposer = grn.target_date_proposed_by; // 'site' | 'vendor' | null
  const hasOpenProposal =
    inReplacementStage
    && grn.replacement_status === "pending"
    && !dateAgreed;
  const isSiteOrPm =
    user?.role === "site_person"
    || user?.role === "project_manager"
    || isAdmin;
  // Vendor can respond when there's an open proposal — either to accept site's
  // date, or to counter / propose their own. They can also respond if the
  // proposer is themselves (still no commitment from site) — gives them a way
  // to revise their counter.
  const canRespondToReplacement = isVendor && hasOpenProposal;
  // Site/PM can respond when the vendor has countered (or made the first move).
  const canSiteRespondToCounter =
    isSiteOrPm && hasOpenProposal && proposer === "vendor";
  // Item 48: once vendor has accepted replacement and a date is agreed, the
  // site person logs a follow-up GRN against the same PO when the replacement
  // arrives. Visible when this GRN is the *original* damaged one (not itself
  // a replacement) and not yet superseded by a 'replaced' status.
  const canLogReplacement =
    isSiteOrPm
    && fullyApproved
    && grn.replacement_status === "accepted"
    && dateAgreed
    && !grn.replaces_grn_number;

  const totalDamaged = items.reduce((s, it) => s + (Number(it.damaged) || 0), 0);
  const damagedLines = items.filter((it) => (Number(it.damaged) || 0) > 0);
  // Transportation accountability (item 27)
  const transportArrangedBy = grn.transport_arranged_by ?? "vendor";
  const accountableVendor = grn.accountable_vendor ?? grn.vendor;

  // Stage banner — surfaces what's needed next, by whom, with the right action.
  // 5-stage chain (item 52) — table-driven so each stage has the same shape.
  const STAGE_META = {
    pending_pm:           { label: "PM Inspection",          actor: "Project Manager",  canActFlag: "canPmAct",          actionLabel: "Inspect & act" },
    pending_purchase_hod: { label: "Purchase HOD Approval",  actor: "Purchase HOD",     canActFlag: "canPurchaseHodAct", actionLabel: "Approve & forward" },
    pending_vendor_replacement: { label: "Vendor Agreement", actor: "Vendor",           canActFlag: null,                actionLabel: null },
    pending_finance_hod:  { label: "Finance HOD Approval",   actor: "Finance HOD",      canActFlag: "canFinHodAct",      actionLabel: "Approve & forward" },
    pending_cfo:          { label: "CFO Approval",           actor: "CFO",              canActFlag: "canCfoAct",         actionLabel: "Approve & forward" },
    pending_ceo:          { label: "CEO Approval",           actor: "CEO",              canActFlag: "canCeoAct",         actionLabel: "Final approval" },
  };
  const stageFlags = { canPmAct, canPurchaseHodAct, canFinHodAct, canCfoAct, canCeoAct };
  const chainCfg = (() => {
    if (grn.chain_stage === "done" && grn.status === "rejected") {
      return { tone: "danger", Icon: XCircle, title: "GRN Rejected",
        body: grn.inspection_notes ?? "GRN rejected — no replacement workflow.",
        actionLabel: null };
    }
    if (grn.chain_stage === "done") {
      return { tone: "success", Icon: CheckCircle2, title: "Fully approved",
        body: "All 5 approval stages cleared. The GRN can now be settled via payment.",
        actionLabel: null };
    }
    // Special-case the negotiation stage — no one in the chain acts; the
    // path forward is the vendor + site agreeing on the replacement plan.
    if (grn.chain_stage === "pending_vendor_replacement") {
      return {
        tone: "warning",
        Icon: AlertTriangle,
        title: "Awaiting vendor agreement on replacement",
        body: "Purchase HOD has approved the damaged receipt and routed it to the vendor. Once vendor + site agree on the redelivery plan, the chain restarts at PM for re-approval.",
        actionLabel: null,
      };
    }
    const meta = STAGE_META[grn.chain_stage];
    if (!meta) {
      return { tone: "warning", Icon: Clock, title: `Pending (${grn.chain_stage})`,
        body: "Awaiting next approver.", actionLabel: null };
    }
    const myTurn = stageFlags[meta.canActFlag];
    // Case 2: at Purchase HOD on a damaged-and-not-yet-agreed GRN the next
    // step is the vendor agreement detour — not Finance HOD. Soften the
    // wording so the approver knows what they're approving into.
    const damageDetour =
      grn.replacement_status === "pending"
      && !grn.target_date_agreed
      && (grn.chain_stage === "pending_pm" || grn.chain_stage === "pending_purchase_hod");
    return {
      tone: myTurn ? "info" : "warning",
      Icon: Clock,
      title: myTurn ? `${meta.label} needed — your action` : `Awaiting ${meta.actor}`,
      body: myTurn
        ? (grn.chain_stage === "pending_ceo"
            ? "Review the receipt and give the final approval."
            : damageDetour
              ? "Damaged receipt — approve to route it to the vendor for the replacement decision."
              : "Review the receipt and pass it to the next approver.")
        : `Waiting on the ${meta.actor} to ${grn.chain_stage === "pending_pm" ? "inspect" : "approve"} this GRN.`,
      actionLabel: myTurn
        ? (damageDetour ? "Approve" : meta.actionLabel)
        : null,
    };
  })();

  const onPmAction = async (action, comments) => {
    setActing(true);
    try {
      const updated = await grnApi.updateStatus(grn.number, { action, comments });
      setGrn(updated);
      setShowPmModal(false);
      if (action === "reject") {
        toast.success("GRN rejected.");
      } else if (updated?.chain_stage === "done") {
        toast.success("GRN fully approved. Ready for payment.");
      } else {
        const nextLabel = STAGE_META[updated?.chain_stage]?.actor ?? "the next approver";
        toast.success(`Approved — passed to ${nextLabel}.`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not update");
    } finally { setActing(false); }
  };

  // Vendor counter / first-proposal — picks a new date + optional qty + comment + voice note.
  const onAcceptReplacement = async (targetDate, commitmentNote, items, voiceNote) => {
    setActing(true);
    try {
      const updated = await grnApi.acceptReplacement(grn.number, {
        action: "counter",
        target_date: targetDate,
        commitment_note: commitmentNote || null,
        items: Array.isArray(items) && items.length ? items : undefined,
        voice_note: voiceNote || null,
      });
      setGrn(updated);
      setShowAcceptModal(false);
      toast.success(`Proposed ${targetDate} — waiting on site/PM to confirm.`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not submit");
    } finally { setActing(false); }
  };

  // Vendor one-click accept of site's existing proposal (item 38).
  const onVendorAcceptSiteDate = async () => {
    setActing(true);
    try {
      const updated = await grnApi.acceptReplacement(grn.number, { action: "accept" });
      setGrn(updated);
      toast.success("Replacement date locked.");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not accept");
    } finally { setActing(false); }
  };

  // Site/PM one-click accept of vendor's counter.
  const onSiteAcceptVendorDate = async () => {
    setActing(true);
    try {
      const updated = await grnApi.siteRespondTargetDate(grn.number, { action: "accept" });
      setGrn(updated);
      toast.success("Replacement date confirmed.");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not confirm");
    } finally { setActing(false); }
  };

  // Site/PM counter-proposal — picks a new date back.
  const onSiteCounter = async (targetDate, note) => {
    setActing(true);
    try {
      const updated = await grnApi.siteRespondTargetDate(grn.number, {
        action: "counter",
        target_date: targetDate,
        note: note || null,
      });
      setGrn(updated);
      setShowSiteCounterModal(false);
      toast.success(`Countered with ${targetDate}.`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not counter");
    } finally { setActing(false); }
  };

  const onRejectReplacement = async (comment, voiceNote) => {
    setActing(true);
    try {
      const updated = await grnApi.rejectReplacement(grn.number, {
        comment,
        voice_note: voiceNote || null,
      });
      setGrn(updated);
      setShowRejectModal(false);
      toast.success("Damage report disputed.");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not submit");
    } finally { setActing(false); }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-8">
      <PrintLetterhead docType="Goods Receipt Note" docNumber={grn.number}
        subtitle={grn.po_number ? `PO: ${grn.po_number}` : null} />

      <nav className="text-[11px] sm:text-[12px] font-medium text-text-muted mb-3 sm:mb-4 flex items-center gap-1.5 print:hidden">
        <Link to={listPath} className="hover:text-primary transition-colors">
          <span className="hidden sm:inline">Goods Receipts</span>
          <span className="sm:hidden">GRN</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
        <span className="text-text font-mono truncate">{grn.number}</span>
      </nav>

      {/* ── Hero card — same visual treatment as PR/PO Detail ─────────────
          Top section: status chips + big mono number + sub-line + facts strip.
          Bottom action bar: pill buttons (refresh / print / pdf). */}
      <div className="mb-4 sm:mb-6 glass-card rounded-2xl overflow-hidden print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 sm:gap-6 p-3 sm:p-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <StatusPill tone={
                grn.status === "full" ? "success"
                : grn.status === "rejected" ? "danger" : "warning"
              }>
                {grn.status === "full"
                  ? "Full Receipt"
                  : grn.status === "rejected" ? "Rejected" : "Partial"}
              </StatusPill>
              {totalDamaged > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-soft text-warning text-xs font-bold border border-warning/30">
                  <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
                  {totalDamaged} damaged
                </span>
              )}
              {grn.replacement_status && grn.replacement_status !== "replaced" && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  grn.replacement_status === "accepted" ? "bg-info-soft text-info border-info/30"
                  : grn.replacement_status === "rejected" ? "bg-danger-soft text-danger border-danger/30"
                  : "bg-warning-soft text-warning border-warning/30"
                }`}>
                  {grn.replacement_status === "pending" ? "Replacement pending"
                    : grn.replacement_status === "accepted" ? "Replacement scheduled"
                    : "Disputed"}
                </span>
              )}
              {grn.chain_stage === "done" && grn.status !== "rejected" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-soft text-success text-xs font-bold border border-success/20">
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                  Approved
                </span>
              )}
            </div>
            <h1 className="text-[20px] sm:text-[28px] font-bold tracking-tight text-text font-mono break-all leading-tight">
              {grn.number}
            </h1>
            {grn.po_number && (
              <p className="text-text-muted text-[12px] sm:text-[13px] mt-1 inline-flex items-center gap-1.5">
                <span className="text-text-subtle">against</span>
                <Link
                  to={`/app/purchase-orders/${grn.po_number}`}
                  className="font-mono font-semibold text-info hover:underline"
                >
                  {grn.po_number}
                </Link>
              </p>
            )}
            {/* Facts strip — 2-col grid on mobile, free-flowing on sm+ */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2 mt-3 sm:mt-4 text-xs">
              <GrnFact label="Vendor" value={grn.vendor} />
              <GrnFact label="Receipt Date" value={grn.received_date} />
              <GrnFact label="Challan / DN" value={grn.challan_no} />
              {grn.pm_approver?.name && (
                <GrnFact label="PM" value={grn.pm_approver.name} />
              )}
              <GrnFact
                label="Total Received"
                value={items.reduce((s, it) => s + (Number(it.received) || 0), 0)}
                accent
              />
            </div>
          </div>
        </div>

        {/* Bottom action bar — pill-style buttons matching PR/PO */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 px-3 sm:px-6 py-3 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={refresh}
              className="px-3 py-1.5 text-[12px] font-semibold text-text-muted border border-border rounded-full bg-surface-container-low/60 hover:text-text hover:border-white/20 transition-colors flex items-center gap-1.5"
              aria-label="Refresh"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 text-[12px] font-semibold text-text-muted border border-border rounded-full bg-surface-container-low/60 hover:text-text hover:border-white/20 transition-colors flex items-center gap-1.5"
              aria-label="Print"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const blob = await grnApi.downloadPdf(grn.number);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${grn.number}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (err) {
                  toast.error(err?.response?.data?.message ?? "Could not download PDF");
                }
              }}
              className="px-3 py-1.5 text-[12px] font-semibold text-text-muted border border-border rounded-full bg-surface-container-low/60 hover:text-text hover:border-white/20 transition-colors flex items-center gap-1.5"
              aria-label="Download PDF"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Admin reopen — undo a rejection so the chain can re-flow ── */}
      <div className="mb-4 print:hidden">
        <ReopenRejectedButton
          endpoint={`/grns/${grn.number}/reopen`}
          entityLabel="GRN"
          status={grn.status}
          onReopened={(updated) => setGrn(updated)}
        />
      </div>

      {/* ── Admin chain override — flip ANY approve/reject in the chain
            (past or present). Admin-only, full audit. Hidden from vendor. */}
      {isAdmin && !isVendor && (
        <div className="mb-4 print:hidden">
          <AdminGrnChainOverridePanel
            grn={grn}
            onUpdated={(updated) => setGrn(updated)}
          />
        </div>
      )}

      {/* ── Chain banner + stepper ────────────────────────────────────
          Hidden from vendor — the internal PM → HOD → CFO → CEO chain is
          buyer-side state. Vendor instead gets the replacement / "just
          received" banners and the activity feed of their own touches. */}
      {!isVendor && (
        <>
          <ChainBanner cfg={chainCfg} canAct={canAct} onActionClick={() => setShowPmModal(true)} acting={acting} stage={grn.chain_stage} />
          <ChainStepper
            stage={grn.chain_stage}
            status={grn.status}
            pmName={grn.pm_approver?.name}
            history={grn.approval_history}
            replacementStatus={grn.replacement_status}
            targetDateAgreed={!!grn.target_date_agreed}
          />
        </>
      )}

      {/* ── Vendor replacement banner — Case 2 ──────────────────────
          Opens at pending_vendor_replacement (after Purchase HOD approves
          a damaged GRN) and stays available on legacy GRNs that reached
          'done' with an open replacement. */}
      {inReplacementStage && grn.replacement_status && (
        <ReplacementBanner
          grn={grn}
          isVendor={isVendor}
          canVendorRespond={canRespondToReplacement}
          canSiteRespond={canSiteRespondToCounter}
          onVendorAcceptSiteDate={onVendorAcceptSiteDate}
          onVendorCounter={() => setShowAcceptModal(true)}
          onVendorReject={() => setShowRejectModal(true)}
          onSiteAcceptVendorDate={onSiteAcceptVendorDate}
          onSiteCounter={() => setShowSiteCounterModal(true)}
          acting={acting}
          totalDamaged={totalDamaged}
          accountableVendor={accountableVendor}
        />
      )}

      {/* Item 48 — Replacement Chain card: connects original ↔ replacement
         GRN(s) with a plain-English breakdown ("10 ordered · 7 accepted ·
         3 damaged"). Renders on EITHER side of the relationship. */}
      {(grn.original_grn || (Array.isArray(grn.replaced_by) && grn.replaced_by.length > 0)) && (
        <ReplacementChainCard
          grn={grn}
          listPath={listPath}
        />
      )}

      {/* Item 48 — Log replacement: visible once vendor has committed and both
         sides agreed on a date. One click takes the site person to a prefilled
         GRN-create page that links back to this original. */}
      {canLogReplacement && grn.replacement_status !== "replaced" && (
        <section className="bg-warning-soft/30 border border-warning/30 rounded-2xl p-4 mb-4 sm:mb-6 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <CalendarCheck className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm min-w-0">
                <div className="font-bold text-text">Awaiting replacement delivery</div>
                <p className="text-text-muted truncate">
                  {accountableVendor} committed to redeliver by{" "}
                  <span className="font-semibold text-text">
                    {grn.replacement_target_date
                      ? new Date(grn.replacement_target_date).toLocaleDateString()
                      : "—"}
                  </span>. Log a new GRN when the goods arrive.
                </p>
              </div>
            </div>
            <Link
              to={`/app/grn/new?po=${grn.po_number}&replaces=${grn.number}`}
              className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md whitespace-nowrap inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <Package className="h-4 w-4" /> Log replacement receipt
            </Link>
          </div>
        </section>
      )}

      {/* ── Receipt info ───────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-3 sm:p-6 mb-4 sm:mb-6 print-reset print:bg-surface-container-lowest print:border print:border-border print:rounded-md">
        <h2 className="text-sm font-semibold text-text mb-4 sm:mb-5 flex items-center gap-2">
          <Package className="h-4 w-4 text-text-muted print:hidden" strokeWidth={2} />
          Receipt Info
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-4 sm:gap-y-6 print-meta-grid">
          <Meta label="PO" value={
            <Link to={`/app/purchase-orders/${grn.po_number}`} className="text-info hover:underline">{grn.po_number}</Link>
          } />
          <Meta label="Vendor" value={grn.vendor} />
          <Meta label="Receipt Date" value={grn.received_date} />
          <Meta label="Challan / DN" value={grn.challan_no} />
          <Meta
            label="Invoice Type"
            value={
              grn.invoice_type ? (() => {
                const t = docChipTone(grn.invoice_type);
                return (
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold tracking-wider ${t.chip}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${t.strip}`} />
                    {INVOICE_LABEL[grn.invoice_type] ?? t.label}
                  </span>
                );
              })() : "—"
            }
          />
          {grn.pm_approved_at && (
            <Meta label="PM Approved" value={new Date(grn.pm_approved_at).toLocaleString()} />
          )}
        </div>
      </section>

      {/* ── Items table — Order/Received/Damaged/Accepted/Balance ──── */}
      <section className="glass-card rounded-2xl overflow-hidden mb-4 sm:mb-6 print-reset print:bg-surface-container-lowest print:border print:border-border print:rounded-md">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border flex justify-between items-center print:p-0 print:border-0 print:mb-2">
          <h2 className="text-sm font-semibold text-text flex items-center gap-2">
            <Package className="h-4 w-4 text-text-muted print:hidden" strokeWidth={2} />
            Line Items
          </h2>
          <span className="text-xs text-text-muted print:text-[8pt]">
            {items.length} line{items.length === 1 ? "" : "s"}
          </span>
        </div>
        {items.length === 0 ? (
          <div className="px-6 py-12 text-center text-text-muted text-sm">No items on this GRN.</div>
        ) : (
          <>
            {/* Mobile cards — cleaner than horizontal-scroll on phones */}
            <div className="md:hidden divide-y divide-border print:hidden">
              {items.map((it, i) => {
                const ordered = Number(it.ordered) || 0;
                const received = Number(it.received) || 0;
                const damaged = Number(it.damaged) || 0;
                const accepted = Math.max(0, received - damaged);
                const balance = Math.max(0, ordered - accepted);
                return (
                  <div key={i} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-text-muted">#{i + 1}</span>
                          <span className="font-semibold text-text text-sm truncate">{it.name}</span>
                        </div>
                        {it.code && (
                          <div className="text-xs text-info font-mono mt-0.5">{it.code}</div>
                        )}
                      </div>
                      {damaged > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-soft text-warning text-[10px] font-bold border border-warning/30 shrink-0">
                          <AlertTriangle className="h-3 w-3" /> {damaged}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-[10.5px] mt-2">
                      <Stat label="Order" value={ordered} muted />
                      <Stat label="Recv" value={received} />
                      <Stat label="Dmg" value={damaged} tone={damaged > 0 ? "warning" : "muted"} />
                      <Stat label="Accept" value={accepted} tone="success" />
                      <Stat label="Balance" value={balance} tone={balance === 0 ? "success" : "warning"} />
                    </div>
                    {it.remark && (
                      <div className="mt-2 text-[11px] text-text-muted italic border-l-2 border-border pl-2">
                        {it.remark}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop / print — table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-low/40 text-[11px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-3 py-3 text-right">Ordered</th>
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
                      <tr key={i} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-text">{it.name}</div>
                          {it.code && <div className="text-xs text-info font-mono mt-0.5">{it.code}</div>}
                        </td>
                        <td className="px-3 py-3 text-right text-text-muted tabular-nums">{ordered}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{received}</td>
                        <td className={`px-3 py-3 text-right font-semibold tabular-nums ${damaged > 0 ? "text-warning" : "text-text-subtle"}`}>{damaged}</td>
                        <td className="px-3 py-3 text-right font-bold tabular-nums text-success">{accepted}</td>
                        <td className={`px-3 py-3 text-right font-semibold tabular-nums ${balance === 0 ? "text-success" : "text-warning"}`}>{balance}</td>
                        <td className="px-3 py-3 text-xs text-text-muted">{it.remark ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── Damage report ───────────────────────────────────────────── */}
      {totalDamaged > 0 && (
        <section className="glass-card rounded-2xl overflow-hidden mb-4 sm:mb-6 ring-1 ring-warning/20">
          {/* Header */}
          <div className="bg-warning-soft/30 px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-text">Damage Report</h2>
              <p className="text-xs text-text-muted mt-0.5">
                <span className="font-semibold text-warning">{totalDamaged} unit{totalDamaged === 1 ? "" : "s"}</span> flagged across {damagedLines.length} line{damagedLines.length === 1 ? "" : "s"}.
              </p>
            </div>
            {grn.replacement_status && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                grn.replacement_status === "accepted" ? "bg-info-soft text-info border-info/30"
                : grn.replacement_status === "rejected" ? "bg-danger-soft text-danger border-danger/30"
                : grn.replacement_status === "replaced" ? "bg-success-soft text-success border-success/30"
                : "bg-warning-soft text-warning border-warning/30"
              }`}>
                {grn.replacement_status.toUpperCase()}
              </span>
            )}
          </div>

          {/* Transportation accountability (item 27) */}
          <div className="px-4 sm:px-6 py-3 border-b border-border bg-info-soft/20 flex items-center gap-3">
            <Truck className="h-4 w-4 text-info shrink-0" />
            <div className="text-sm">
              <span className="text-text-muted">Accountable for damage:</span>{" "}
              <span className="font-semibold text-text">{accountableVendor}</span>
              <span className="text-xs text-text-subtle ml-2">
                {transportArrangedBy === "buyer"
                  ? "(transport arranged by buyer — carrier is responsible)"
                  : "(transport arranged by vendor — supplier is responsible)"}
              </span>
            </div>
          </div>

          {/* Damaged-line summary */}
          <div className="px-4 sm:px-6 py-4 border-b border-border">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Damaged lines</h3>
            <ul className="space-y-1.5">
              {damagedLines.map((it, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                  <span className="font-medium text-text truncate">{it.name}</span>
                  {it.code && <span className="text-xs text-info">{it.code}</span>}
                  <span className="ml-auto text-xs font-bold text-warning">{Number(it.damaged)} damaged</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Reporter details */}
          <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border">
            {grn.damage_by && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Damaged by
                </div>
                <div className="text-sm text-text">{prettyDamageBy(grn.damage_by)}</div>
              </div>
            )}
            {grn.damage_remark && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  <FileText className="h-3.5 w-3.5" /> Short remark
                </div>
                <div className="text-sm text-text">{grn.damage_remark}</div>
              </div>
            )}
          </div>

          {grn.damage_comment && (
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                <MessageSquare className="h-3.5 w-3.5" /> Detailed comment
              </div>
              <p className="text-sm text-text bg-surface-container-low border border-border rounded-md p-3">{grn.damage_comment}</p>
            </div>
          )}

          {/* Vendor reply, if any */}
          {grn.replacement_target_date && (
            <div className="px-6 py-4 border-b border-border bg-success-soft/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                <CalendarCheck className="h-3.5 w-3.5 text-success" /> Replacement committed
              </div>
              <div className="text-sm text-text font-semibold">
                Target delivery: {new Date(grn.replacement_target_date).toLocaleDateString()}
              </div>
              {grn.replacement_comment && (
                <p className="text-xs text-text-muted mt-1 italic">"{grn.replacement_comment}"</p>
              )}
            </div>
          )}
          {grn.replacement_status === "rejected" && grn.replacement_comment && (
            <div className="px-6 py-4 border-b border-border bg-danger-soft/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                <XCircle className="h-3.5 w-3.5 text-danger" /> Vendor disputed
              </div>
              <p className="text-sm text-text italic">"{grn.replacement_comment}"</p>
            </div>
          )}

          {/* Photo evidence */}
          {damagePhotos.length > 0 && (
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                <Camera className="h-3.5 w-3.5" /> Photo evidence
                <span className="text-text-subtle normal-case tracking-normal font-normal">
                  ({damagePhotos.length})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {damagePhotos.map((d) => (
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
        <section className="glass-card rounded-2xl p-3 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-text-muted" strokeWidth={2} />
            Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.filter((d) => d.doc_type !== "damage_photo").map((d) => (
              <GrnDocumentCard
                key={d.id}
                doc={d}
                onPreview={() => previewDoc(d)}
                onDownload={() => downloadDoc(d)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Standalone send-voice-note for the vendor (or admin acting for
          them). Hidden once the GRN is rejected — no point chatting on a
          dead record. Posts straight into approval_history; both panels
          below pick it up on the next render. */}
      {(isVendor || isAdmin) && grn.status !== "rejected" && (
        <div className="mb-4 sm:mb-6">
          <SendGrnVoiceNotePanel
            grnNumber={grn.number}
            onSent={(updated) => setGrn(updated)}
          />
        </div>
      )}

      {/* ── Consolidated voice notes ─────────────────────────────────
          Every voice clip the vendor (or anyone else) attached to this
          GRN in one place, so PM / HOD / CFO / CEO / admin can play them
          without scanning the activity timeline. Pulled from
          approval_history.voice_note. */}
      {(() => {
        const hist = Array.isArray(grn.approval_history) ? grn.approval_history : [];
        const notes = hist
          .filter((h) => h?.voice_note)
          .map((h) => ({
            audio: h.voice_note,
            by: h.by_user_name ?? "Vendor",
            role: h.by_role ?? null,
            source: h.action === "vendor_accepted_date" ? "Accepted site's date"
              : h.action === "vendor_countered_date" ? "Counter-proposed date"
              : h.action === "vendor_rejected" ? "Disputed damage report"
              : h.stage === "vendor_note" ? "Voice message"
              : `Stage: ${(h.stage ?? "").replace(/_/g, " ")}`,
            at: h.at ?? null,
            comment: h.comment ?? null,
          }));
        if (notes.length === 0) return null;
        return (
          <div className="mb-4 sm:mb-6">
            <VoiceNotesPanel
              title={isVendor ? "Your voice notes" : "Voice notes from vendor"}
              notes={notes}
            />
          </div>
        );
      })()}

      {/* ── PM approval history ────────────────────────────────────── */}
      {grn.approval_history?.length > 0 && (
        <section className="glass-card rounded-2xl p-3 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-text-muted" strokeWidth={2} />
            Activity
          </h2>
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
                  {h.voice_note && (
                    <div className="mt-1.5 bg-surface-container-low border border-border rounded-md px-2 py-1.5">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-1">
                        Voice note
                      </div>
                      <audio
                        src={h.voice_note}
                        controls
                        preload="metadata"
                        className="w-full h-8"
                      />
                    </div>
                  )}
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
        <PmActionModal
          stage={grn.chain_stage}
          // Case 2: when a Purchase HOD is approving a damaged GRN that
          // hasn't been agreed yet, the next stop isn't Finance HOD — it's
          // the vendor agreement detour. The modal copy needs to match.
          needsVendorReplacement={
            grn.replacement_status === "pending" && !grn.target_date_agreed
          }
          acting={acting}
          onCancel={() => setShowPmModal(false)}
          onSubmit={onPmAction}
        />
      )}

      {showAcceptModal && (
        <AcceptReplacementModal
          items={items}
          damagePhotos={damagePhotos}
          accountableVendor={accountableVendor}
          acting={acting}
          onCancel={() => setShowAcceptModal(false)}
          onSubmit={onAcceptReplacement}
          onPreview={previewDoc}
        />
      )}

      {showRejectModal && (
        <RejectReplacementModal
          acting={acting}
          onCancel={() => setShowRejectModal(false)}
          onSubmit={onRejectReplacement}
        />
      )}

      {showSiteCounterModal && (
        <SiteCounterModal
          vendorProposedDate={grn.replacement_target_date}
          acting={acting}
          onCancel={() => setShowSiteCounterModal(false)}
          onSubmit={onSiteCounter}
        />
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

// ── Damage photo tile — auto-loads real thumbnail (item 33) ───────────────
// Auth-gated blob fetch on mount; the URL is revoked on unmount so we don't
// leak object URLs across remounts.
// PR-style document card — typed placeholder, hover-reveal preview overlay,
// tone-coded chip (Tax Invoice = success, Proforma = warning), download icon.
// Thumbnails are intentionally lazy here; the blob is fetched only when the
// user actually clicks Preview (each invoice can be several MB).
function GrnDocumentCard({ doc, onPreview, onDownload }) {
  const tone = docChipTone(doc.doc_type);
  const isImage = doc.mime_type?.startsWith("image/")
    || /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.original_name ?? "");
  const isPdf = doc.mime_type === "application/pdf"
    || /\.pdf$/i.test(doc.original_name ?? "");

  return (
    <div className={`rounded-lg border bg-surface-container-low/40 overflow-hidden flex flex-col ${tone.border}`}>
      <button
        type="button"
        onClick={onPreview}
        className="group relative h-36 bg-surface-container-low overflow-hidden flex flex-col items-center justify-center cursor-pointer gap-2"
      >
        {/* Left strip — tone tag for instant recognition */}
        <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${tone.strip}`} />
        {isImage ? (
          <ImageIcon className={`h-10 w-10 ${tone.icon}`} />
        ) : isPdf ? (
          <FileText className={`h-10 w-10 ${tone.icon}`} />
        ) : (
          <FileWarning className="h-10 w-10 text-text-subtle" />
        )}
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider ${tone.chip}`}>
          {tone.label}
        </span>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-lg">
            <Eye className="h-3.5 w-3.5" /> Preview
          </div>
        </div>
      </button>
      <div className="p-3 border-t border-border flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text truncate" title={doc.original_name}>
            {doc.original_name}
          </div>
          <div className="text-[10px] text-text-muted">
            {isPdf ? "PDF" : isImage ? "Image" : (doc.mime_type ?? "file")}
            {" · "}
            {(Number(doc.size_bytes) / 1024).toFixed(1)} KB
            {doc.uploaded_at && <> · {new Date(doc.uploaded_at).toLocaleDateString()}</>}
          </div>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-surface-container-low"
          title="Download"
          aria-label="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function DamagePhotoTile({ doc, items, onPreview }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);

  // Parent keys these by doc.id so we get a fresh component (and fresh
  // initial state) for each doc — no need to reset state inside the effect.
  useEffect(() => {
    let cancelled = false;
    let createdUrl = null;
    grnApi.documents.getBlob(doc.id)
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setUrl(createdUrl);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [doc.id]);

  const linkedItem = (doc.item_index !== null && doc.item_index !== undefined)
    ? items[doc.item_index] : null;

  return (
    <button
      type="button"
      onClick={onPreview}
      className="group relative block text-left bg-surface-container-lowest border border-border rounded-lg overflow-hidden hover:border-primary hover:shadow-md transition-all w-full"
      title={doc.original_name}
    >
      <div className="aspect-square bg-surface-container-low relative overflow-hidden">
        {url ? (
          <img
            src={url}
            alt={doc.caption || doc.original_name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-danger">
            <Camera className="h-8 w-8" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-text-subtle animate-spin" />
          </div>
        )}

        {/* Linked-line chip floats top-left */}
        {linkedItem && (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-warning-soft/95 text-warning border border-warning/40 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
            {linkedItem.code ?? linkedItem.name}
          </span>
        )}

        {/* Hover-reveal preview overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
          <div className="bg-bg/95 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-text inline-flex items-center gap-1 shadow-md">
            <Eye className="h-3 w-3" /> Click to enlarge
          </div>
        </div>
      </div>
      {doc.caption && (
        <div className="px-2 py-1.5 text-xs text-text-muted truncate border-t border-border bg-surface-container-lowest">
          {doc.caption}
        </div>
      )}
    </button>
  );
}

// Item 35 — translate the constrained damage_by tokens to friendly labels.
// Legacy free-text values (pre-item-35 GRNs) pass through as-is so old
// detail pages still read correctly.
function prettyDamageBy(v) {
  if (v === "vendor") return "Vendor (supplier-side)";
  if (v === "self")   return "Self (our side / in-transit)";
  return v;
}

function actionVerb(a) {
  if (a === "approve") return "approved";
  if (a === "reject") return "rejected";
  if (a === "vendor_accepted") return "accepted replacement";
  if (a === "vendor_accepted_date") return "accepted site's date";
  if (a === "vendor_countered_date") return "countered with new date";
  if (a === "vendor_rejected") return "disputed damage report";
  if (a === "site_proposed_date") return "proposed redelivery date";
  if (a === "site_accepted_vendor_date") return "accepted vendor's date";
  if (a === "site_countered_date") return "countered with new date";
  return a;
}

function ChainBanner({ cfg, canAct, onActionClick, acting }) {
  const tones = {
    success: { bg: "bg-success-soft/30", border: "border-success/30", icon: "text-success" },
    warning: { bg: "bg-warning-soft/30", border: "border-warning/30", icon: "text-warning" },
    info:    { bg: "bg-info-soft/30",    border: "border-info/30",    icon: "text-info" },
    danger:  { bg: "bg-danger-soft/30",  border: "border-danger/30",  icon: "text-danger" },
  };
  const t = tones[cfg.tone] ?? tones.warning;
  const Icon = cfg.Icon;
  return (
    <section className={`${t.bg} border ${t.border} rounded-2xl p-4 mb-3 print:hidden`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${t.icon} shrink-0 mt-0.5`} strokeWidth={2.25} />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text">{cfg.title}</h3>
          <p className="text-sm text-text-muted">{cfg.body}</p>
        </div>
        {canAct && cfg.actionLabel && (
          <button
            onClick={onActionClick}
            disabled={acting}
            className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-full flex items-center gap-2 disabled:opacity-60 shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" /> {cfg.actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Approval-chain timeline for the GRN page.
 *
 * Layout: single vertical timeline at every breakpoint. Dot column on the
 * left (with a connector line threading the dots together), content column
 * on the right. Phase groupings (Round 1 / Round 2) appear for damaged GRNs
 * so the user can see that PM and Purchase HOD acted twice.
 *
 * Header: gradient hero with the current step name, a status chip, and a
 * progress bar showing completion percentage.
 */
function ChainStepper({
  stage,
  status,
  pmName,
  history,
  replacementStatus,
  targetDateAgreed = false,
}) {
  const rejected = status === "rejected";
  const lastActor = (s) =>
    (history ?? []).slice().reverse().find((h) => h.stage === s && h.action === "approve");

  const labelFor = (stageKey, defaultText) => {
    const actor = lastActor(stageKey);
    return actor ? `by ${actor.by_user_name}` : defaultText;
  };

  // ── State classification ────────────────────────────────────────────────
  const hadReplacementLoop =
    !!replacementStatus
    || (history ?? []).some((h) => h?.stage === "replacement")
    || stage === "pending_vendor_replacement";

  // Phase 1 = damage detour open (negotiating). Phase 2 = chain restarted.
  const phase1Open =
    hadReplacementLoop
    && (replacementStatus === "pending" || replacementStatus === "rejected")
    && !targetDateAgreed;

  // ── Build the step groups ───────────────────────────────────────────────
  // groups: [{ label, sublabel, accent, items: Step[] }]
  // Step: { key, title, sub, IconRole, IconDone, IconActive, IconPending }
  let groups;
  if (!hadReplacementLoop) {
    groups = [
      {
        label: null,
        sublabel: null,
        accent: "primary",
        items: [
          { key: "pending_pm",            title: "PM Inspection",  sub: pmName ? `by ${pmName}` : "Project Manager",                role: Package },
          { key: "pending_purchase_hod",  title: "Purchase HOD",   sub: labelFor("pending_purchase_hod", "Purchase Department"),    role: ShieldCheck },
          { key: "pending_finance_hod",   title: "Finance HOD",    sub: labelFor("pending_finance_hod",  "Finance Department"),     role: Wallet },
          { key: "pending_cfo",           title: "CFO Review",     sub: labelFor("pending_cfo",          "Chief Financial Officer"),role: Building2 },
          { key: "pending_ceo",           title: "CEO Approval",   sub: labelFor("pending_ceo",          "Chief Executive Officer"),role: Crown },
          { key: "done",                  title: "Finalised",      sub: "Ready for payment",                                        role: Sparkles },
        ],
      },
    ];
  } else if (phase1Open) {
    groups = [
      {
        label: "Damage Review",
        sublabel: "Waiting on vendor + site to agree on a replacement plan",
        accent: "warning",
        items: [
          { key: "pending_pm@1",                title: "PM Inspection",   sub: pmName ? `by ${pmName}` : "Project Manager",             role: Package },
          { key: "pending_purchase_hod@1",      title: "Purchase HOD",    sub: labelFor("pending_purchase_hod", "Purchase Department"), role: ShieldCheck },
          { key: "pending_vendor_replacement",  title: "Vendor Agreement",sub: "Replacement plan negotiation",                          role: Handshake },
        ],
      },
    ];
  } else {
    groups = [
      {
        label: "Round 1 · Damage Review",
        sublabel: "Resolved — vendor + site agreed on a replacement plan",
        accent: "warning",
        items: [
          { key: "pending_pm@1",                title: "PM Inspection",   sub: pmName ? `by ${pmName}` : "Project Manager",             role: Package },
          { key: "pending_purchase_hod@1",      title: "Purchase HOD",    sub: labelFor("pending_purchase_hod", "Purchase Department"), role: ShieldCheck },
          { key: "pending_vendor_replacement",  title: "Vendor Agreement",sub: "Replacement plan accepted",                             role: Handshake },
        ],
      },
      {
        label: "Round 2 · Post-Agreement Approval",
        sublabel: "Re-running the chain with the agreed replacement plan",
        accent: "primary",
        items: [
          { key: "pending_pm@2",                title: "PM (round 2)",          sub: "Post-agreement inspection",                       role: Package },
          { key: "pending_purchase_hod@2",      title: "Purchase HOD (round 2)",sub: "Post-agreement approval",                         role: ShieldCheck },
          { key: "pending_finance_hod",         title: "Finance HOD",           sub: labelFor("pending_finance_hod",  "Finance Department"),      role: Wallet },
          { key: "pending_cfo",                 title: "CFO Review",            sub: labelFor("pending_cfo",          "Chief Financial Officer"), role: Building2 },
          { key: "pending_ceo",                 title: "CEO Approval",          sub: labelFor("pending_ceo",          "Chief Executive Officer"), role: Crown },
          { key: "done",                        title: "Finalised",             sub: "Ready for payment",                                role: Sparkles },
        ],
      },
    ];
  }

  // Flatten + resolve current step
  const flat = groups.flatMap((g) => g.items);
  const indexOfStage = (s) => {
    if (s === "done") return flat.length - 1;
    if (!hadReplacementLoop) return flat.findIndex((x) => x.key === s);
    if (s === "pending_pm") {
      return flat.findIndex((x) => x.key === (phase1Open ? "pending_pm@1" : "pending_pm@2"));
    }
    if (s === "pending_purchase_hod") {
      return flat.findIndex((x) => x.key === (phase1Open ? "pending_purchase_hod@1" : "pending_purchase_hod@2"));
    }
    return flat.findIndex((x) => x.key === s);
  };
  const currentIdx = Math.max(0, indexOfStage(stage));
  const failedIdx = rejected ? currentIdx : -1;
  const totalSteps = flat.length;
  const progressPct = stage === "done"
    ? 100
    : Math.round((currentIdx / Math.max(totalSteps - 1, 1)) * 100);

  // ── Overall status badge + headline ────────────────────────────────────
  const headline = (() => {
    if (rejected) {
      const at = flat[failedIdx]?.title ?? "an earlier stage";
      return {
        chipTone: "danger",
        chipLabel: "Blocked",
        title: `Rejected at ${at}`,
        body: "The chain is locked. An admin can reopen or override.",
      };
    }
    if (stage === "done") {
      return {
        chipTone: "success",
        chipLabel: "Complete",
        title: "Fully approved",
        body: "All approvals received — receipt is ready for payment.",
      };
    }
    if (phase1Open && stage === "pending_vendor_replacement") {
      return {
        chipTone: "warning",
        chipLabel: "Awaiting Vendor",
        title: "Vendor agreement pending",
        body: "Vendor and site are negotiating the replacement plan.",
      };
    }
    const cur = flat[currentIdx];
    return {
      chipTone: phase1Open ? "warning" : "info",
      chipLabel: "In Progress",
      title: `Currently with ${cur?.title ?? "next approver"}`,
      body: cur?.sub ?? "",
    };
  })();

  // ── State resolver per step ────────────────────────────────────────────
  const stateFor = (i) => {
    if (i === failedIdx) return "rejected";
    if (rejected && i > failedIdx) return "dimmed";
    if (i < currentIdx) return "done";
    if (i === currentIdx) return stage === "done" ? "done" : "active";
    return "pending";
  };

  return (
    <section className="glass-card rounded-2xl overflow-hidden mb-4 sm:mb-6 print:hidden">
      <StepperHeader
        headline={headline}
        rejected={rejected}
        done={stage === "done"}
        progressPct={progressPct}
        stepNumber={stage === "done" ? totalSteps : currentIdx + 1}
        totalSteps={totalSteps}
      />

      <div className="p-4 sm:p-5">
        {groups.map((group, gi) => {
          const groupOffset = groups
            .slice(0, gi)
            .reduce((sum, g) => sum + g.items.length, 0);
          return (
            <div key={gi} className={gi > 0 ? "mt-4" : ""}>
              {group.label && (
                <PhaseDivider
                  label={group.label}
                  sublabel={group.sublabel}
                  accent={group.accent}
                  collapsed={false}
                />
              )}
              <ol className="relative">
                {group.items.map((step, i) => {
                  const flatIdx = groupOffset + i;
                  const myState = stateFor(flatIdx);
                  const nextIdx = flatIdx + 1;
                  // Is there a NEXT item to draw a connector to? Yes if not
                  // the last item in the whole document.
                  const hasConnector = nextIdx < flat.length;
                  const nextState = hasConnector ? stateFor(nextIdx) : null;
                  return (
                    <TimelineRow
                      key={step.key}
                      step={step}
                      state={myState}
                      nextState={nextState}
                      hasConnector={hasConnector}
                    />
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Stepper sub-components ────────────────────────────────────────────────

function StepperHeader({
  headline,
  rejected,
  done,
  progressPct,
  stepNumber,
  totalSteps,
}) {
  const tone = headline.chipTone;
  const barColor = rejected
    ? "bg-danger"
    : done
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : "bg-primary";
  return (
    <header className="px-5 py-4 border-b border-border bg-gradient-to-br from-surface-container-low/50 via-transparent to-transparent">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-text-muted mb-1.5">
            Approval Progress
          </div>
          <h3 className="text-base sm:text-lg font-bold text-text leading-snug truncate">
            {headline.title}
          </h3>
          {headline.body && (
            <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
              {headline.body}
            </p>
          )}
        </div>
        <StatusChip tone={tone}>{headline.chipLabel}</StatusChip>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="relative h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out ${barColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] tabular-nums">
          <span className="text-text-subtle font-semibold uppercase tracking-wider">
            Step {stepNumber} of {totalSteps}
          </span>
          <span className="font-black text-text-muted">{progressPct}%</span>
        </div>
      </div>
    </header>
  );
}

function StatusChip({ tone, children }) {
  const map = {
    success: "bg-success-soft text-success border-success/30",
    warning: "bg-warning-soft text-warning border-warning/30",
    info:    "bg-info-soft text-info border-info/30",
    danger:  "bg-danger-soft text-danger border-danger/30",
  };
  const dotColor = {
    success: "bg-success",
    warning: "bg-warning",
    info:    "bg-info animate-pulse",
    danger:  "bg-danger",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] border shrink-0 ${
        map[tone] ?? map.info
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor[tone] ?? dotColor.info}`} />
      {children}
    </span>
  );
}

function PhaseDivider({ label, sublabel, accent }) {
  const accentMap = {
    warning: "bg-warning",
    primary: "bg-primary",
    info:    "bg-info",
    success: "bg-success",
  };
  return (
    <div className="flex items-center gap-3 mb-3 mt-1">
      <span className={`h-1 w-1 rounded-full ${accentMap[accent] ?? accentMap.primary}`} />
      <span className={`h-px w-3 ${accentMap[accent] ?? accentMap.primary} opacity-60`} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-text">
          {label}
        </div>
        {sublabel && (
          <div className="text-[10.5px] text-text-subtle leading-tight mt-0.5">
            {sublabel}
          </div>
        )}
      </div>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function TimelineRow({ step, state, nextState, hasConnector }) {
  // Tone-by-state — picks the right dot fill, icon, type label, and the
  // colour of the connector line that hangs below this row.
  const tone = (() => {
    switch (state) {
      case "done":
        return {
          dot: "bg-success text-white shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--color-success)_60%,transparent)]",
          ring: "",
          title: "text-text",
          sub: "text-text-muted",
          chip: "bg-success-soft text-success border-success/30",
          chipLabel: "Approved",
          Icon: CheckCircle2,
          connector: nextState === "done"
            ? "bg-success/50"
            : nextState === "active"
              ? "bg-gradient-to-b from-success/50 via-primary/40 to-primary"
              : "bg-gradient-to-b from-success/40 to-border",
        };
      case "active":
        return {
          dot: "bg-primary text-primary-foreground",
          ring: "ring-[6px] ring-primary/15",
          title: "text-primary",
          sub: "text-text-muted",
          chip: "bg-primary text-primary-foreground",
          chipLabel: "Current",
          Icon: step.role ?? Clock,
          connector: "bg-gradient-to-b from-primary/40 to-border",
          pulse: true,
        };
      case "pending":
        return {
          dot: "bg-surface-container-lowest text-text-subtle border border-border",
          ring: "",
          title: "text-text-subtle",
          sub: "text-text-subtle/70",
          chip: null,
          chipLabel: null,
          Icon: step.role ?? Circle,
          connector: "bg-border",
        };
      case "rejected":
        return {
          dot: "bg-danger text-white",
          ring: "ring-[6px] ring-danger/20",
          title: "text-danger",
          sub: "text-danger/80",
          chip: "bg-danger-soft text-danger border-danger/30",
          chipLabel: "Rejected",
          Icon: XCircle,
          connector: "bg-danger/30",
        };
      case "dimmed":
      default:
        return {
          dot: "bg-surface-container-low text-text-subtle/60 border border-border/60",
          ring: "",
          title: "text-text-subtle/60",
          sub: "text-text-subtle/40",
          chip: null,
          chipLabel: null,
          Icon: Circle,
          connector: "bg-border/40",
        };
    }
  })();
  const Icon = tone.Icon;
  return (
    <li className="relative flex gap-3 pb-4 last:pb-1">
      {/* Vertical connector line. Sits behind the dot via z-index, aligned
          to the dot's centre (dot is 36px tall → 18px from top). */}
      {hasConnector && (
        <span
          className={`absolute left-[17.5px] top-[36px] bottom-0 w-px ${tone.connector}`}
          aria-hidden
        />
      )}

      {/* Dot */}
      <div
        className={`relative z-10 h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all ${tone.dot} ${tone.ring}`}
      >
        {tone.pulse && (
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
        )}
        <Icon className="relative z-10 h-4 w-4" strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h4 className={`text-sm font-bold leading-tight ${tone.title}`}>
            {step.title}
          </h4>
          {tone.chip && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.12em] border whitespace-nowrap ${tone.chip}`}
            >
              {tone.chipLabel}
            </span>
          )}
        </div>
        <div className={`text-[11.5px] mt-0.5 leading-snug ${tone.sub}`}>
          {step.sub}
        </div>
      </div>
    </li>
  );
}

/**
 * Two-click confirm for the vendor "Accept <date>" button. Locking the
 * replacement date is irreversible (chain restarts at pending_pm), so we
 * make the vendor click twice — first click arms the action, second click
 * fires it. Auto-disarms after 5s of inactivity.
 */
function ConfirmAcceptButton({ acting, proposed, onConfirm }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  const handle = () => {
    if (!armed) { setArmed(true); return; }
    setArmed(false);
    onConfirm?.();
  };
  return (
    <button
      onClick={handle}
      disabled={acting}
      title={armed ? "Click again to confirm — this locks the replacement date and restarts the approval chain at PM." : undefined}
      className={`px-3 py-2 text-sm font-bold rounded-md disabled:opacity-60 transition-all inline-flex items-center gap-1.5 ${
        armed
          ? "bg-success text-white hover:brightness-110 ring-2 ring-success/40"
          : "bg-success/15 text-success hover:bg-success/25"
      }`}
    >
      <CalendarCheck className="h-3.5 w-3.5" />
      {armed ? `Confirm — accept ${proposed}` : `Accept ${proposed}`}
    </button>
  );
}

function ReplacementBanner({
  grn, isVendor, canVendorRespond, canSiteRespond,
  onVendorAcceptSiteDate, onVendorCounter, onVendorReject,
  onSiteAcceptVendorDate, onSiteCounter,
  acting, totalDamaged, accountableVendor,
}) {
  const s = grn.replacement_status;
  const proposer = grn.target_date_proposed_by;
  const proposed = grn.replacement_target_date
    ? new Date(grn.replacement_target_date).toLocaleDateString()
    : null;
  const dateAgreed = !!grn.target_date_agreed;

  // Terminal states first — no negotiation to show.
  if (s === "rejected") {
    return <BannerShell tone="danger" Icon={XCircle}
      title="Vendor disputed the damage report"
      body="Internal review needed — see vendor's comment below." />;
  }
  if (s === "replaced") {
    return <BannerShell tone="success" Icon={CheckCircle2}
      title="Replacement delivered"
      body="Replacement stock has been delivered." />;
  }
  if (s === "accepted" && dateAgreed) {
    return <BannerShell tone="info" Icon={CalendarCheck}
      title="Replacement date locked"
      body={`${accountableVendor} will redeliver on ${proposed ?? "—"}.`} />;
  }

  // Pending negotiation. Build status text based on who proposed.
  const title = !proposer
    ? "Damage report — vendor to propose date"
    : proposer === "site"
      ? "Awaiting vendor confirmation of site's proposed date"
      : "Vendor counter-proposed a date";

  const body = !proposer
    ? `${totalDamaged} unit${totalDamaged === 1 ? "" : "s"} flagged. Site hasn't suggested a date yet — the vendor will propose one.`
    : proposer === "site"
      ? `Site suggests ${proposed}. The vendor can agree or counter with another date.`
      : `Vendor suggests ${proposed}. Site can confirm or counter back.`;

  return (
    <BannerShell tone="warning" Icon={AlertTriangle} title={title} body={body}>
      {/* Vendor controls */}
      {canVendorRespond && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {proposer === "site" && (
            <ConfirmAcceptButton
              acting={acting}
              proposed={proposed}
              onConfirm={onVendorAcceptSiteDate}
            />
          )}
          <button
            onClick={onVendorCounter}
            disabled={acting}
            className="px-3 py-2 text-sm font-bold text-text border border-border hover:border-primary rounded-md disabled:opacity-60"
          >
            {proposer === "site" ? "Counter" : proposer === "vendor" ? "Revise" : "Propose date"}
          </button>
          <button
            onClick={onVendorReject}
            disabled={acting}
            className="px-3 py-2 text-sm font-bold text-danger border border-danger/30 hover:bg-danger-soft rounded-md disabled:opacity-60"
          >
            Dispute
          </button>
        </div>
      )}

      {/* Site/PM controls — vendor has countered, site can accept or counter back */}
      {!isVendor && canSiteRespond && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onSiteAcceptVendorDate}
            disabled={acting}
            className="px-3 py-2 text-sm font-bold text-success-foreground bg-success hover:brightness-110 rounded-md disabled:opacity-60"
          >
            <CalendarCheck className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
            Accept {proposed}
          </button>
          <button
            onClick={onSiteCounter}
            disabled={acting}
            className="px-3 py-2 text-sm font-bold text-text border border-border hover:border-primary rounded-md disabled:opacity-60"
          >
            Counter back
          </button>
        </div>
      )}
    </BannerShell>
  );
}

// Item 48 — Replacement Chain card.
// Renders a clear visual lineage between an original damaged GRN and its
// replacement(s). Shows up on both sides:
//   - On the original GRN: "you received N, M were damaged → Replacement: GRN-Y"
//   - On the replacement GRN: "Replacing M units from GRN-X (was N received, M damaged)"
function ReplacementChainCard({ grn, listPath }) {
  const orig = grn.original_grn;
  const reps = Array.isArray(grn.replaced_by) ? grn.replaced_by : [];

  // Compute this GRN's own totals from items[] so we can mention them inline
  // in the "as replacement" view (lets us show "replacing N out of M").
  const items = Array.isArray(grn.items) ? grn.items : [];
  const myReceived = items.reduce((s, it) => s + (Number(it.received) || 0), 0);
  const myDamaged  = items.reduce((s, it) => s + (Number(it.damaged)  || 0), 0);

  const linkOf = (number) => `${listPath.replace(/\/grn$/, "")}/grn/${number}`;

  return (
    <section className="glass-card rounded-2xl overflow-hidden mb-4 sm:mb-6 ring-1 ring-info/20 print:hidden">
      <div className="bg-info-soft/30 px-4 sm:px-6 py-3 border-b border-info/20 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-info" strokeWidth={2.25} />
        <h2 className="text-sm font-bold text-text uppercase tracking-wider">Replacement chain</h2>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* This GRN IS a replacement — show the original's totals + back-link */}
        {orig && (
          <ChainNode
            isCurrent={false}
            title="Original receipt"
            grnNumber={orig.number}
            href={linkOf(orig.number)}
            ordered={orig.ordered}
            received={orig.received}
            damaged={orig.damaged}
            accepted={orig.accepted}
            stage={orig.chain_stage}
            replacementStatus={orig.replacement_status}
          />
        )}

        {/* Always show the current GRN as the middle node so the chain reads
           top-to-bottom (Original → This → Replacement). */}
        <ChainNode
          isCurrent={true}
          title={orig ? "This GRN (replacement)" : "This GRN (original)"}
          grnNumber={grn.number}
          ordered={items.reduce((s, it) => s + (Number(it.ordered) || 0), 0)}
          received={myReceived}
          damaged={myDamaged}
          accepted={Math.max(0, myReceived - myDamaged)}
          stage={grn.chain_stage}
          replacementStatus={grn.replacement_status}
        />

        {/* This GRN HAS replacement(s) — list each with link + status */}
        {reps.map((r) => (
          <ChainNode
            key={r.number}
            isCurrent={false}
            title="Replacement receipt"
            grnNumber={r.number}
            href={linkOf(r.number)}
            ordered={r.ordered}
            received={r.received}
            damaged={r.damaged}
            accepted={r.accepted}
            stage={r.chain_stage}
            replacementStatus={r.replacement_status}
          />
        ))}

        {/* Plain-English summary that explains the entire chain in one sentence */}
        <p className="text-xs text-text-muted leading-relaxed border-t border-border pt-3">
          {orig && reps.length === 0 && (
            <>This receipt is logging <strong className="text-text">{myReceived - myDamaged}</strong> replacement
              {(myReceived - myDamaged) === 1 ? "" : "s"} from{" "}
              <Link to={linkOf(orig.number)} className="font-mono font-bold text-info hover:underline">{orig.number}</Link>
              {" "}(originally {orig.received} received, {orig.damaged} damaged).</>
          )}
          {!orig && reps.length > 0 && (
            <>This receipt found <strong className="text-text">{myDamaged}</strong> damaged unit
              {myDamaged === 1 ? "" : "s"} out of {myReceived} received. A replacement was logged as{" "}
              {reps.map((r, i) => (
                <span key={r.number}>
                  {i > 0 && ", "}
                  <Link to={linkOf(r.number)} className="font-mono font-bold text-info hover:underline">{r.number}</Link>
                </span>
              ))}.</>
          )}
        </p>
      </div>
    </section>
  );
}

/**
 * One step in the replacement chain. Compact horizontal layout that fits
 * three "x of y" facts in a single line on most viewports.
 */
function ChainNode({ isCurrent, title, grnNumber, href, ordered, received, damaged, accepted, stage, replacementStatus }) {
  const stageLabel =
    stage === "pending_pm"            ? "Awaiting PM"
    : stage === "pending_purchase_hod"? "Awaiting Purchase HOD"
    : stage === "done"                ? "Approved"
    : stage ?? "—";
  const stageTone =
    stage === "done"                  ? "bg-success-soft text-success border-success/30"
    : stage === "pending_pm"          ? "bg-warning-soft text-warning border-warning/30"
    : stage === "pending_purchase_hod"? "bg-info-soft text-info border-info/30"
    : "bg-surface-container text-text-muted border-border";

  const numberCls = `text-base font-mono font-bold ${href ? "text-info hover:underline" : "text-text"}`;

  return (
    <div className={`relative rounded-md border p-4 ${
      isCurrent
        ? "border-primary/40 bg-primary-soft/30 ring-1 ring-primary/20"
        : "border-border bg-surface-container-low hover:border-info/40 transition-colors"
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">{title}</span>
          {isCurrent && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-soft px-1.5 py-0.5 rounded">You are here</span>
          )}
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider ${stageTone}`}>
          {stageLabel}
        </span>
      </div>
      <div className="flex items-baseline gap-3 flex-wrap">
        {href
          ? <Link to={href} className={numberCls}>{grnNumber}</Link>
          : <span className={numberCls}>{grnNumber}</span>}
        {replacementStatus && (
          <span className="text-[10px] text-text-subtle">
            (replacement {replacementStatus})
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
        <NumStat label="Ordered" value={ordered} />
        <NumStat label="Received" value={received} tone={received >= ordered ? "text-success" : "text-warning"} />
        <NumStat label="Damaged" value={damaged} tone={damaged > 0 ? "text-warning" : "text-text-muted"} />
        <NumStat label="Accepted" value={accepted} tone="text-success" />
      </div>
    </div>
  );
}

function NumStat({ label, value, tone = "text-text" }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-subtle">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${tone}`}>{Number(value) || 0}</div>
    </div>
  );
}

function BannerShell({ tone, Icon, title, body, children }) {
  const tones = {
    success: { bg: "bg-success-soft/30", border: "border-success/30", icon: "text-success" },
    warning: { bg: "bg-warning-soft/30", border: "border-warning/30", icon: "text-warning" },
    info:    { bg: "bg-info-soft/30",    border: "border-info/30",    icon: "text-info" },
    danger:  { bg: "bg-danger-soft/30",  border: "border-danger/30",  icon: "text-danger" },
  };
  const t = tones[tone] ?? tones.warning;
  return (
    <section className={`${t.bg} border ${t.border} rounded-2xl p-4 mb-4 sm:mb-6 print:hidden`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${t.icon}`} strokeWidth={2.25} />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text">{title}</h3>
          <p className="text-sm text-text-muted">{body}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function AcceptReplacementModal({ items, damagePhotos, accountableVendor, acting, onCancel, onSubmit, onPreview }) {
  const today = new Date().toISOString().slice(0, 10);
  const [targetDate, setTargetDate] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [note, setNote] = useState("");
  const [voiceNote, setVoiceNote] = useState(null);
  const damaged = items.filter((it) => (Number(it.damaged) || 0) > 0);

  // Item 28 — vendor can inspect and change the replacement qty per line.
  // Seeded with the originally-reported damaged qty; capped at that value.
  const [replaceQtys, setReplaceQtys] = useState(() =>
    Object.fromEntries(
      damaged.map((it) => [it.code || it.name, String(Number(it.damaged) || 0)]),
    ),
  );
  const setQty = (key, raw, max) => {
    let next = raw;
    if (raw !== "") {
      const n = Math.max(0, Math.min(Number(raw) || 0, max));
      next = String(n);
    }
    setReplaceQtys((p) => ({ ...p, [key]: next }));
  };

  const totalToReplace = damaged.reduce(
    (s, it) => s + (Number(replaceQtys[it.code || it.name]) || 0),
    0,
  );
  // Item 46 — vendor revising/countering must always include a note. The
  // modal opens only for counter/propose actions (one-click accept of an
  // existing proposal skips it entirely). Item 36 was a stricter subset
  // (mandatory when reducing qty); item 46 broadens this to always.
  const hasReduction = damaged.some((it) => {
    const reported = Number(it.damaged) || 0;
    const adjusted = Number(replaceQtys[it.code || it.name]) || 0;
    return adjusted + 0.0001 < reported;
  });
  const noteOk = note.trim().length >= 3;
  const valid = targetDate && targetDate >= today && totalToReplace > 0 && noteOk;

  const submit = () => {
    const payloadItems = damaged.map((it) => ({
      code: it.code ?? null,
      name: it.name,
      replace_qty: Number(replaceQtys[it.code || it.name]) || 0,
    }));
    onSubmit(targetDate, note, payloadItems, voiceNote);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-surface-container-lowest border border-border rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-success" />
          <h3 className="text-lg font-bold text-text">Accept &amp; schedule replacement</h3>
        </div>
        <div className="p-5 space-y-5">
          <p className="text-sm text-text-muted">
            You ({accountableVendor}) are committing to replace the damaged stock. Inspect each line and adjust the quantity you will replace if needed.
          </p>

          {/* Editable replacement qty per line (item 28) */}
          <div>
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Replacement quantity per line</h4>
            <ul className="bg-surface-container-low border border-border rounded-md divide-y divide-border">
              {damaged.map((it, i) => {
                const key = it.code || it.name;
                const reported = Number(it.damaged) || 0;
                const raw = replaceQtys[key] ?? "";
                const n = Number(raw) || 0;
                return (
                  <li key={i} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text truncate">{it.name}</div>
                      <div className="text-xs text-text-subtle">
                        {it.code && <span className="text-info">{it.code} · </span>}
                        Reported damaged: <span className="font-bold text-warning">{reported}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max={reported}
                        value={raw}
                        onChange={(e) => setQty(key, e.target.value, reported)}
                        className={`w-20 bg-surface-container-lowest border-b-2 focus:border-primary px-2 py-1 text-right text-sm font-bold outline-none ${
                          n > reported ? "border-danger text-danger" : "border-warning/50 text-warning"
                        }`}
                      />
                      <span className="text-[10px] text-text-subtle">/ {reported}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-text-muted mt-2">
              Reduce a line if you've inspected the returned units and confirmed only some are defective. You can't exceed the originally-reported damage.
            </p>
          </div>

          {/* Damage photos preview */}
          {damagePhotos.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" /> Damage photos
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {damagePhotos.map((d) => (
                  <DamagePhotoTile key={d.id} doc={d} items={items} onPreview={() => onPreview(d)} />
                ))}
              </div>
            </div>
          )}

          {/* Target date — highlighted per item 25 */}
          <div className="bg-primary-soft/40 border-2 border-primary/30 rounded-lg p-4 ring-2 ring-primary/15">
            <label className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-2">
              <CalendarCheck className="h-4 w-4" /> Target replacement date *
            </label>
            <input
              type="date"
              required
              value={targetDate}
              min={today}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-surface-container-lowest border-2 border-primary/40 focus:border-primary rounded-md px-3 py-2 text-sm font-semibold text-text outline-none"
            />
            <p className="text-xs text-text-muted mt-2">
              When will the replacement stock reach the site? This date is binding.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-warning mb-1 uppercase tracking-wider">
              <MessageSquare className="h-3.5 w-3.5" /> Commitment note *
              <span className="text-text-subtle normal-case font-normal tracking-normal">
                (speak or type)
              </span>
            </label>
            {hasReduction && (
              <p className="text-[11px] text-warning mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                You're reducing the replacement quantity — explain why.
              </p>
            )}
            <VoiceRecorder
              onTranscript={(text) => setNote(text)}
              onAudioChange={(b64) => setVoiceNote(b64)}
              disabled={acting}
              language="en-IN"
              maxSeconds={90}
              className="mb-2"
            />
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={hasReduction
                ? "Why fewer units will be replaced (e.g. inspection showed only N are actually defective)"
                : "Why this date / batch reference / shipping carrier — at least a short note"}
              className={`w-full bg-surface-container-low border focus:border-primary rounded-md px-3 py-2 text-sm outline-none resize-none ${
                note.trim().length < 3 ? "border-warning/60" : "border-border"
              }`}
            />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-surface-container-low">
          <button onClick={onCancel} disabled={acting} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface-container-lowest">Cancel</button>
          <button
            onClick={submit}
            disabled={acting || !valid}
            className="px-5 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md flex items-center gap-2 disabled:opacity-60"
          >
            {acting && <Loader2 className="h-4 w-4 animate-spin" />}
            Commit {totalToReplace} unit{totalToReplace === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectReplacementModal({ acting, onCancel, onSubmit }) {
  const [comment, setComment] = useState("");
  const [voiceNote, setVoiceNote] = useState(null);
  const trimmed = comment.trim();
  const hasReason = trimmed.length >= 3 || !!voiceNote;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-surface-container-lowest border border-border rounded-lg w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <XCircle className="h-5 w-5 text-danger" />
          <h3 className="text-lg font-bold text-text">Dispute damage report</h3>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-text-muted">
            Tell us why you believe the damage report is incorrect. The team will review your dispute internally.
          </p>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
            <MessageSquare className="h-3.5 w-3.5" /> Reason
            <span className="text-danger normal-case font-normal tracking-normal">*</span>
            <span className="text-text-subtle normal-case font-normal tracking-normal">(speak or type)</span>
          </label>
          <VoiceRecorder
            onTranscript={(text) => setComment(text)}
            onAudioChange={(b64) => setVoiceNote(b64)}
            disabled={acting}
            language="en-IN"
            maxSeconds={90}
          />
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Reason for dispute"
            className={`w-full bg-surface-container-low border focus:border-danger rounded-md px-3 py-2 text-sm outline-none resize-none ${
              hasReason ? "border-border" : "border-warning/60"
            }`}
          />
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-surface-container-low">
          <button onClick={onCancel} disabled={acting} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface-container-lowest">Cancel</button>
          <button
            onClick={() => onSubmit(trimmed, voiceNote)}
            disabled={acting || !hasReason}
            className="px-5 py-2 text-sm font-bold text-primary-foreground bg-danger hover:brightness-110 rounded-md flex items-center gap-2 disabled:opacity-60"
          >
            {acting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit dispute
          </button>
        </div>
      </div>
    </div>
  );
}

// Site / PM counter-proposes a new date after the vendor's counter (item 38).
function SiteCounterModal({ vendorProposedDate, acting, onCancel, onSubmit }) {
  const today = new Date().toISOString().slice(0, 10);
  const [targetDate, setTargetDate] = useState(() => vendorProposedDate || today);
  const [note, setNote] = useState("");
  const valid = targetDate && targetDate >= today;
  const sameAsVendor = vendorProposedDate && targetDate === vendorProposedDate;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-surface-container-lowest border border-border rounded-lg w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-text">Counter the vendor's date</h3>
        </div>
        <div className="p-5 space-y-4">
          {vendorProposedDate && (
            <p className="text-sm text-text-muted">
              Vendor proposed <span className="font-semibold text-text">
                {new Date(vendorProposedDate).toLocaleDateString()}
              </span>. Pick a date you'd prefer — they'll see your counter from their portal.
            </p>
          )}
          <div className="bg-primary-soft/40 border-2 border-primary/30 rounded-lg p-4 ring-2 ring-primary/15">
            <label className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-2">
              <CalendarCheck className="h-4 w-4" /> Your proposed date *
            </label>
            <input
              type="date"
              required
              value={targetDate}
              min={today}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-surface-container-lowest border-2 border-primary/40 focus:border-primary rounded-md px-3 py-2 text-sm font-semibold outline-none"
            />
            {sameAsVendor && (
              <p className="text-[11px] text-warning mt-2">
                Same as the vendor's date — use "Accept" instead to lock it.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">Note (optional)</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. site availability, dependent order"
              className="w-full bg-surface-container-low border border-border focus:border-primary rounded-md px-3 py-2 text-sm outline-none resize-none"
            />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-surface-container-low">
          <button onClick={onCancel} disabled={acting} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface-container-lowest">Cancel</button>
          <button
            onClick={() => onSubmit(targetDate, note)}
            disabled={acting || !valid || sameAsVendor}
            className="px-5 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md flex items-center gap-2 disabled:opacity-60"
          >
            {acting && <Loader2 className="h-4 w-4 animate-spin" />}
            Send counter
          </button>
        </div>
      </div>
    </div>
  );
}

function PmActionModal({ stage, needsVendorReplacement = false, acting, onCancel, onSubmit }) {
  const [comments, setComments] = useState("");
  const [action, setAction] = useState("approve");
  const isFinal = stage === "pending_ceo";
  // Per-stage copy for the chain. On Case 2 (damaged GRN at Purchase HOD),
  // the next stop is the vendor agreement detour — not Finance HOD — so
  // the button reads as a generic "Approve" rather than passing forward.
  const stageCopy = {
    pending_pm: needsVendorReplacement
      ? { title: "PM Inspection",          submitNext: "Approve",                notes: "Inspection notes" }
      : { title: "PM Inspection",          submitNext: "Pass to Purchase HOD",   notes: "Inspection notes" },
    pending_purchase_hod: needsVendorReplacement
      ? { title: "Purchase HOD Approval",  submitNext: "Approve",                notes: "Approval notes" }
      : { title: "Purchase HOD Approval",  submitNext: "Pass to Finance HOD",    notes: "Approval notes" },
    pending_finance_hod:  { title: "Finance HOD Approval",   submitNext: "Pass to CFO",            notes: "Approval notes" },
    pending_cfo:          { title: "CFO Approval",           submitNext: "Pass to CEO",            notes: "Approval notes" },
    pending_ceo:          { title: "CEO — Final Approval",   submitNext: "Approve & finalise",     notes: "Final approval notes" },
  }[stage] ?? { title: "Approval", submitNext: "Approve & forward", notes: "Notes" };
  const title = stageCopy.title;
  const subtitle = isFinal
    ? "Approving here finalises the GRN — once approved, the receipt is eligible for payment."
    : needsVendorReplacement
      ? "Damaged receipt — approving passes it to the vendor for a replacement decision before the chain continues."
      : "Approving passes the GRN to the next approver in the chain.";
  const submitLabel = action === "approve" ? stageCopy.submitNext : "Reject GRN";
  const notesLabel = stageCopy.notes;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-surface-container-lowest border border-border rounded-lg w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-text">{title}</h3>
          <p className="text-xs text-text-muted">{subtitle}</p>
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
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">{notesLabel}</label>
            <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)}
              placeholder={isFinal ? "Any final notes for the record?" : "What did you check? Any concerns?"}
              className="w-full bg-surface-container-low border border-border focus:border-primary rounded-md px-3 py-2 text-sm outline-none resize-none" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onCancel} disabled={acting} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
          <button onClick={() => onSubmit(action, comments)} disabled={acting}
            className="px-5 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md flex items-center gap-2 disabled:opacity-60">
            {acting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
