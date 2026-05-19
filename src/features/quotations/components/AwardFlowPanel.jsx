import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Banknote,
  Crown,
  Gavel,
  AlertCircle,
  Loader2,
  Handshake,
  Users as UsersIcon,
  Building2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Card, { SectionTitle } from "../../../components/ui/Card.jsx";
import { useRFQStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";

/* =========================================================================
 * Award Flow Panel — implements FLOW.md §3 client-side.
 *
 *   Phase 1 (consensus):
 *     Three HOD slots — Respective / Finance / Purchase. Each clicks the
 *     vendor they support. When all three agree, chain_stage advances.
 *
 *   Phase 2 (approval tree):
 *     CFO Review → CEO Review. Each approver gets approve / hold / reject.
 *     Hold or reject sends the RFQ back to consensus.
 *
 *   Phase 3 (award):
 *     Once chain_stage = 'done', the Purchase HOD sees the unlocked Award
 *     button on the agreed vendor card (rendered separately by Comparison).
 *
 * The panel is a sticky-friendly Card meant to live alongside the vendor
 * cards. It's read-only for non-stakeholder roles (employees, vendors, etc.)
 * but becomes interactive for the user who matches the current stage.
 * ========================================================================= */

const SLOT_DEFS = [
  { key: "respective", label: "Respective Dept HOD", Icon: Building2 },
  { key: "finance",    label: "Finance HOD",         Icon: Banknote },
  { key: "purchase",   label: "Purchase HOD",        Icon: UsersIcon },
];

/** Which slots can a user fill, given the RFQ's respective dept code? */
function slotsForUser(user, respectiveDeptCode) {
  if (!user || user.role !== "hod" || !user.department?.code) return [];
  const dept = user.department.code;
  const slots = [];
  if (dept === "PURCH" || dept === "PROC") slots.push("purchase");
  if (dept === "FIN") slots.push("finance");
  if (respectiveDeptCode && dept === respectiveDeptCode) slots.push("respective");
  return [...new Set(slots)];
}

/**
 * Classify each HOD vote against the rest, so the UI can show *agreement*
 * vs *dissent* at a glance instead of painting every filled slot green.
 *
 * Returns a map { slotKey: "aligned" | "dissent" | "first" } where:
 *   - "aligned" = vote matches the leading (majority) vendor — green
 *   - "dissent" = vote disagrees with the leading vendor — red
 *   - "first"   = only one vote exists so nothing to compare — neutral/info
 *
 * `consensusVendor` (if non-null) is the vendor the majority is settling on,
 * used to label the banner above the slot list. When the split is even
 * (e.g. three-way disagreement), every vote reads as dissent and the
 * banner shows "No agreement yet".
 */
function classifyVotes(consents) {
  const filled = SLOT_DEFS
    .map((s) => ({ key: s.key, vote: consents[s.key] }))
    .filter((s) => s.vote);

  if (filled.length === 0) {
    return { states: {}, consensusVendor: null, isSplit: false, voteCount: 0 };
  }

  // Single vote — too early to call it agreement or dissent.
  if (filled.length === 1) {
    return {
      states: { [filled[0].key]: "first" },
      consensusVendor: filled[0].vote.vendor,
      isSplit: false,
      voteCount: 1,
    };
  }

  // Tally votes per vendor.
  const counts = {};
  filled.forEach((s) => {
    counts[s.vote.vendor] = (counts[s.vote.vendor] || 0) + 1;
  });
  const vendors = Object.keys(counts);
  const maxCount = Math.max(...Object.values(counts));
  const leaders = vendors.filter((v) => counts[v] === maxCount);
  const isSplit = leaders.length > 1; // no clear leader
  const consensusVendor = isSplit ? null : leaders[0];

  const states = {};
  filled.forEach((s) => {
    if (isSplit) {
      states[s.key] = "dissent"; // nobody agrees with anybody
    } else if (s.vote.vendor === consensusVendor) {
      states[s.key] = "aligned";
    } else {
      states[s.key] = "dissent";
    }
  });
  return { states, consensusVendor, isSplit, voteCount: filled.length };
}

function SlotRow({ slot, vote, currentUserId, state }) {
  const filled = !!vote;
  const isMine = filled && vote.user_id === currentUserId;
  const Icon = slot.Icon;

  // Three filled states + one empty state. "aligned" = green, "dissent" =
  // red, "first" = info (single vote, neutral). Empty stays muted.
  const tileCls = !filled
    ? "bg-surface-container-high text-text-subtle"
    : state === "dissent"
      ? "bg-danger-soft text-danger ring-1 ring-danger/30"
      : state === "first"
        ? "bg-info-soft text-info"
        : "bg-success-soft text-success";

  const TileIcon = !filled
    ? Icon
    : state === "dissent"
      ? XCircle
      : state === "first"
        ? Circle
        : CheckCircle2;

  const vendorCls = !filled
    ? ""
    : state === "dissent"
      ? "text-danger font-bold"
      : "text-text font-semibold";

  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tileCls}`}
      >
        <TileIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-text">{slot.label}</span>
          {isMine && (
            <span className="text-[9px] uppercase tracking-widest font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
              you
            </span>
          )}
          {filled && state === "dissent" && (
            <span className="text-[9px] uppercase tracking-widest font-bold text-danger bg-danger-soft px-1.5 py-0.5 rounded inline-flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              Dissent
            </span>
          )}
        </div>
        {filled ? (
          <div className="text-xs mt-0.5">
            <span className={vendorCls}>{vote.vendor}</span>
            <span className="text-text-subtle"> · {vote.user_name}</span>
          </div>
        ) : (
          <div className="text-xs text-text-subtle mt-0.5">Awaiting vote</div>
        )}
      </div>
    </div>
  );
}

function ConsensusPhase({ rfq, user, candidateVendors, onChange }) {
  const consents = rfq.consents ?? {};
  const respectiveCode = consents.respective_dept_code;
  const userSlots = slotsForUser(user, respectiveCode);
  const canVote =
    userSlots.length > 0 &&
    ["compared", "consensus"].includes(rfq.chain_stage);

  const myCurrentVote = userSlots
    .map((s) => consents[s])
    .find((v) => v && v.user_id === user?.id);

  const agree = useRFQStore((s) => s.agree);
  const withdraw = useRFQStore((s) => s.withdrawAgreement);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  const cast = async (vendor) => {
    setBusy(true);
    try {
      const res = await agree(rfq.number, vendor);
      onChange?.(res); // sync parent local state
      const reached = (res?.consents?.agreed_vendor ?? null) !== null;
      toast.success(
        reached
          ? `Consensus reached on ${vendor}`
          : `Vote recorded for ${vendor}`,
      );
      setPicking(false);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not record vote");
    } finally {
      setBusy(false);
    }
  };

  const doWithdraw = async () => {
    setBusy(true);
    try {
      const res = await withdraw(rfq.number);
      onChange?.(res);
      toast.success("Vote withdrawn");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not withdraw");
    } finally {
      setBusy(false);
    }
  };

  const { states: voteStates, consensusVendor, isSplit, voteCount } =
    classifyVotes(consents);
  const hasDissent = Object.values(voteStates).some((v) => v === "dissent");
  const fullyAgreed = !!consents.agreed_vendor;

  return (
    <div>
      {/* Disagreement banner — surfaces split votes so users don't think
          "three green check-marks" means "everyone agrees" when they don't. */}
      {!fullyAgreed && hasDissent && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-danger-soft/60 border border-danger/30 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" strokeWidth={2.25} />
          <div className="text-xs text-text leading-snug">
            <span className="font-bold text-danger">
              {isSplit
                ? "No agreement yet"
                : `${voteCount - 1} of ${voteCount} agree on ${consensusVendor}`}
            </span>
            <span className="block text-text-muted mt-0.5">
              {isSplit
                ? "HODs are voting for different vendors. Discuss and re-vote to reach consensus."
                : "One HOD is voting differently. Consensus requires all three on the same vendor."}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-1 mb-3">
        {SLOT_DEFS.filter(
          (s) => s.key !== "respective" || !!respectiveCode,
        ).map((s) => (
          <SlotRow
            key={s.key}
            slot={s}
            vote={consents[s.key]}
            currentUserId={user?.id}
            state={voteStates[s.key]}
          />
        ))}
      </div>

      {canVote && (
        <div className="mt-3 pt-3 border-t border-border">
          {myCurrentVote ? (
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-text">
                Your vote:{" "}
                <span className="font-semibold">{myCurrentVote.vendor}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  disabled={busy}
                  className="px-2.5 py-1 text-xs font-semibold border border-border rounded hover:bg-surface-container-low disabled:opacity-60"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={doWithdraw}
                  disabled={busy}
                  className="px-2.5 py-1 text-xs font-semibold text-danger border border-danger/30 bg-danger-soft/30 rounded hover:bg-danger-soft disabled:opacity-60"
                >
                  Withdraw
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPicking(true)}
              disabled={busy || candidateVendors.length === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-md disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="h-3.5 w-3.5" />}
              Cast Your Vote
            </button>
          )}
          {picking && (
            <div className="mt-3 p-3 bg-surface-container/40 border border-border rounded-md">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">
                Pick a vendor
              </p>
              <div className="space-y-1">
                {candidateVendors.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => cast(v)}
                    disabled={busy}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-primary-soft hover:text-primary disabled:opacity-60"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPicking(false)}
                disabled={busy}
                className="mt-2 text-[11px] text-text-muted hover:text-text"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {!canVote && userSlots.length === 0 && (
        <p className="text-[11px] text-text-subtle mt-3 pt-3 border-t border-border italic">
          Read-only view. Only the Respective / Finance / Purchase HODs can vote.
        </p>
      )}
    </div>
  );
}

/**
 * Action button cluster for an approval stage. The Approve button uses a
 * two-click "armed → confirm" pattern so a mis-tap doesn't push the chain
 * forward. First click swaps the button to a yellow "Confirm Approve" with
 * a 5-second auto-disarm timer; second click within the window commits the
 * approval. Hold and Reject still trigger their reason-modal directly.
 */
function ApprovalActions({ stage, state, onAct, isAdminOverride = false }) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef(null);

  // 5-second auto-disarm so the page doesn't sit with a misleading
  // "Confirm Approve" forever if the user walks away.
  useEffect(() => {
    if (!armed) return;
    timerRef.current = setTimeout(() => setArmed(false), 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [armed]);

  const handleApprove = () => {
    if (armed) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setArmed(false);
      onAct(stage, "approve");
    } else {
      setArmed(true);
    }
  };

  return (
    <div className="mt-2">
      {isAdminOverride && (
        <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning-soft text-warning text-[9px] font-bold uppercase tracking-[0.16em] border border-warning/30">
          <AlertTriangle className="h-2.5 w-2.5" />
          Admin override
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
      <button
        type="button"
        onClick={handleApprove}
        className={`px-2.5 py-1 text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors ${
          armed
            ? "text-white bg-warning hover:brightness-110 ring-2 ring-warning/30 animate-pulse"
            : "text-success bg-success-soft hover:bg-success/20"
        }`}
        aria-pressed={armed}
        title={armed ? "Click again to confirm — auto-cancels in 5 s" : "Approve"}
      >
        {armed ? (
          <>
            <AlertCircle className="h-3 w-3" />
            Confirm Approve?
          </>
        ) : (
          "Approve"
        )}
      </button>
      {armed && (
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="px-2 py-1 text-[11px] font-medium text-text-muted hover:text-text underline-offset-2 hover:underline"
          title="Cancel approval"
        >
          Cancel
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setArmed(false);
          onAct(stage, "hold");
        }}
        className="px-2.5 py-1 text-xs font-semibold text-warning bg-warning-soft hover:bg-warning/20 rounded"
      >
        {state === "hold" ? "Update Hold" : "Hold"}
      </button>
      <button
        type="button"
        onClick={() => {
          setArmed(false);
          onAct(stage, "reject");
        }}
        className="px-2.5 py-1 text-xs font-semibold text-danger bg-danger-soft hover:bg-danger/20 rounded"
      >
        Reject
      </button>
      </div>
    </div>
  );
}

function ApprovalRow({ stage, label, Icon, rfq, user, onAct }) {
  const current = rfq.chain_stage;
  const consents = rfq.consents ?? {};
  const history = consents.approval_history ?? [];
  const isClosed = rfq.status === "closed" || rfq.status === "awarded";

  // Stage states: approved (we're past this stage), active (chain is here),
  // waiting (haven't reached it yet). When the RFQ is closed (rejected) we
  // mark the rejecting stage as 'rejected' and downstream stages stay waiting.
  const order = ["consensus", "cfo", "ceo", "done"];
  const currentIdx = order.indexOf(current);
  const stageIdx = order.indexOf(stage);
  const lastEntry = [...history].reverse().find((e) => e.stage === stage);
  const lastAction = lastEntry?.action;

  let state;
  if (rfq.status === "closed" && lastAction === "reject") {
    state = "rejected";
  } else if (currentIdx > stageIdx) {
    state = "approved";
  } else if (currentIdx === stageIdx) {
    // If the latest action at this stage is a hold, surface that distinctly.
    state = lastAction === "hold" ? "hold" : "active";
  } else {
    state = "waiting";
  }

  // Admin can act on EVERY non-terminal stage (deliberate override — the
  // matching backend route accepts admin actions at any chain_stage and
  // tags them with `admin_override: true` in the audit history). Non-admin
  // users still need their role to match the stage and the chain to be
  // currently AT this stage.
  const isAdmin = user?.role === "admin";
  const matchesRole = user?.role === stage;
  const canActHere = !isClosed && (isAdmin || (current === stage && matchesRole));

  const stateBadge = {
    approved: { text: "Approved", cls: "text-success" },
    rejected: { text: "Rejected", cls: "text-danger" },
    hold:     { text: "On Hold",  cls: "text-warning" },
    active:   { text: "In Review", cls: "text-warning" },
    waiting:  { text: "Waiting",  cls: "text-text-subtle" },
  }[state];

  const iconBg =
    state === "approved"
      ? "bg-success-soft text-success"
      : state === "rejected"
        ? "bg-danger-soft text-danger"
        : state === "hold"
          ? "bg-warning-soft text-warning ring-2 ring-warning/30"
          : state === "active"
            ? "bg-warning-soft text-warning ring-2 ring-warning/20"
            : "bg-surface-container-high text-text-subtle";

  const NodeIcon =
    state === "approved" ? CheckCircle2 : state === "rejected" ? AlertCircle : Icon;

  return (
    <div className="flex gap-3 py-2">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <NodeIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-text">{label}</span>
          <span className={`text-[10px] uppercase tracking-widest font-bold ${stateBadge.cls}`}>
            {stateBadge.text}
          </span>
        </div>
        {lastEntry?.comment && (
          <div
            className={`text-xs mt-1.5 px-2.5 py-1.5 rounded border-l-2 italic ${
              state === "rejected"
                ? "bg-danger-soft/40 border-danger text-danger"
                : state === "hold"
                  ? "bg-warning-soft/40 border-warning text-text"
                  : "bg-surface-container/40 border-border text-text-muted"
            }`}
          >
            {state === "hold" && (
              <span className="not-italic font-bold uppercase tracking-wider text-[9px] mr-1.5 text-warning">
                On hold:
              </span>
            )}
            "{lastEntry.comment}"
            {lastEntry.by_user_name && (
              <span className="not-italic block text-[10px] text-text-subtle mt-0.5 font-medium">
                — {lastEntry.by_user_name}
              </span>
            )}
          </div>
        )}
        {canActHere && onAct && (
          <ApprovalActions
            stage={stage}
            state={state}
            onAct={onAct}
            isAdminOverride={isAdmin && current !== stage}
          />
        )}
      </div>
    </div>
  );
}

export default function AwardFlowPanel({ rfq, user, candidateVendors, onChange }) {
  const updateStatus = useRFQStore((s) => s.updateStatus);
  const toast = useToast();
  // Pending hold/reject action waiting for a reason. null when no modal.
  // Shape: { stage: "cfo"|"ceo", action: "hold"|"reject" }
  const [reasonPrompt, setReasonPrompt] = useState(null);
  const [reasonText, setReasonText] = useState("");
  const [reasonSubmitting, setReasonSubmitting] = useState(false);

  const runAction = async (stage, action, comments) => {
    try {
      const updated = await updateStatus(rfq.number, action, comments);
      onChange?.(updated);
      toast.success(`${stage.toUpperCase()} ${action}ed`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Action failed");
    }
  };

  const onAct = (stage, action) => {
    if (action === "hold" || action === "reject") {
      // Force a non-empty reason via modal — the audit trail is useless
      // if reviewers can hold/reject with no explanation.
      setReasonPrompt({ stage, action });
      setReasonText("");
      return;
    }
    runAction(stage, action, null);
  };

  const submitReason = async () => {
    const trimmed = reasonText.trim();
    if (!trimmed || !reasonPrompt) return;
    setReasonSubmitting(true);
    try {
      await runAction(reasonPrompt.stage, reasonPrompt.action, trimmed);
      setReasonPrompt(null);
      setReasonText("");
    } finally {
      setReasonSubmitting(false);
    }
  };

  const consents = rfq.consents ?? {};
  const agreedVendor = consents.agreed_vendor;
  const stage = rfq.chain_stage;
  const isAwarded = rfq.status === "awarded";
  const isClosed = rfq.status === "closed";

  const stageBanner = isAwarded
    ? { tone: "success", text: "Awarded" }
    : isClosed
      ? { tone: "danger", text: "Rejected / Closed" }
      : ({
          open:      { tone: "neutral", text: "Awaiting first quote" },
          compared:  { tone: "info",    text: "Vendors are bidding" },
          consensus: { tone: "warning", text: "Consensus required" },
          cfo:       { tone: "info",    text: "Awaiting CFO" },
          ceo:       { tone: "info",    text: "Awaiting CEO" },
          done:      { tone: "success", text: "Ready to award" },
        }[stage] ?? { tone: "neutral", text: stage });

  const banner = (
    <span
      className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${
        stageBanner.tone === "success"
          ? "bg-success-soft text-success"
          : stageBanner.tone === "danger"
            ? "bg-danger-soft text-danger"
            : stageBanner.tone === "warning"
              ? "bg-warning-soft text-warning"
              : stageBanner.tone === "info"
                ? "bg-info-soft text-info"
                : "bg-surface-container-high text-text-muted"
      }`}
    >
      {stageBanner.text}
    </span>
  );

  return (
    <Card padding="md">
      <SectionTitle icon={Gavel} action={banner}>
        Award Flow
      </SectionTitle>

      {/* Phase 1: consensus */}
      <div className="mb-1">
        <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">
          Phase 1 · Consensus
        </h3>
        <ConsensusPhase
          rfq={rfq}
          user={user}
          candidateVendors={candidateVendors}
          onChange={onChange}
        />
        {agreedVendor && (
          <div className="mt-3 p-2.5 bg-success-soft rounded text-xs text-success font-semibold flex items-center gap-2">
            <Handshake className="h-3.5 w-3.5" /> All three agree on{" "}
            <span className="font-bold">{agreedVendor}</span>
          </div>
        )}
      </div>

      {/* Phase 2: approval tree */}
      <div className="mt-5 pt-4 border-t border-border">
        <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">
          Phase 2 · Financial Approval
        </h3>
        <ApprovalRow
          stage="cfo"
          label="CFO Review"
          Icon={Banknote}
          rfq={rfq}
          user={user}
          onAct={onAct}
        />
        <ApprovalRow
          stage="ceo"
          label="CEO Review"
          Icon={Crown}
          rfq={rfq}
          user={user}
          onAct={onAct}
        />
      </div>

      {/* Phase 3: award unlock indicator */}
      {stage === "done" && (
        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-success font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Award button unlocked
          </div>
          <p className="text-[11px] text-text-subtle mt-1">
            Only the Purchase HOD can fire the award on{" "}
            <span className="font-semibold">{agreedVendor}</span>.
          </p>
        </div>
      )}

      {/* Read-only audit trail */}
      {(consents.approval_history ?? []).length > 0 && (
        <details className="mt-4 pt-3 border-t border-border">
          <summary className="text-[10px] font-bold text-text-subtle uppercase tracking-widest cursor-pointer hover:text-text">
            History ({consents.approval_history.length})
          </summary>
          <ul className="mt-2 space-y-2 text-[11px]">
            {consents.approval_history.map((h, idx) => (
              <li key={idx} className="flex gap-2">
                <Clock className="h-3 w-3 text-text-subtle shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div>
                    <span className="font-semibold text-text">
                      {h.by_user_name}
                    </span>{" "}
                    <span className="text-text-muted">{h.action}d</span>
                    {h.vendor && (
                      <span className="text-text-muted"> · {h.vendor}</span>
                    )}
                    {h.stage && h.stage !== "consensus" && (
                      <span className="text-text-subtle">
                        {" "}
                        @ {h.stage.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {h.comment && (
                    <p className="text-text-muted italic">"{h.comment}"</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Hold / Reject reason modal — forces a non-empty comment because
          a blank reject in the audit trail tells future reviewers nothing.
          Submit button stays disabled until trimmed text exists. */}
      {reasonPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reason-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !reasonSubmitting) {
              setReasonPrompt(null);
            }
          }}
        >
          <div className="w-full max-w-[480px] bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  reasonPrompt.action === "reject"
                    ? "bg-danger-soft text-danger"
                    : "bg-warning-soft text-warning"
                }`}
              >
                <AlertTriangle className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  id="reason-modal-title"
                  className="text-base font-bold text-text"
                >
                  {reasonPrompt.action === "reject"
                    ? `Reject at ${reasonPrompt.stage.toUpperCase()}`
                    : `Hold at ${reasonPrompt.stage.toUpperCase()}`}
                </h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  This reason is recorded in the audit trail and visible to
                  every reviewer. It's required.
                </p>
              </div>
            </div>
            <div className="p-5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                Reason <span className="text-danger">*</span>
              </label>
              <textarea
                autoFocus
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={4}
                placeholder={
                  reasonPrompt.action === "reject"
                    ? "Why is this being rejected? Be specific so the chain can act on it."
                    : "What needs to change before this can proceed?"
                }
                className="w-full bg-surface-container-lowest border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-subtle outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
              />
              {!reasonText.trim() && (
                <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  A reason is required before you can submit.
                </p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-border bg-surface-container-low/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReasonPrompt(null)}
                disabled={reasonSubmitting}
                className="px-4 py-2 text-[12px] font-semibold text-text-muted border border-border bg-surface-container-low/60 rounded-full hover:text-text disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReason}
                disabled={!reasonText.trim() || reasonSubmitting}
                className={`px-5 py-2 text-[12px] font-bold rounded-full transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                  reasonPrompt.action === "reject"
                    ? "bg-danger hover:brightness-110"
                    : "bg-warning hover:brightness-110"
                }`}
              >
                {reasonSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : reasonPrompt.action === "reject" ? (
                  <XCircle className="h-3.5 w-3.5" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                {reasonSubmitting
                  ? "Submitting…"
                  : reasonPrompt.action === "reject"
                    ? "Confirm reject"
                    : "Confirm hold"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
