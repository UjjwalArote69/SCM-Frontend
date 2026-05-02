import { useState } from "react";
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

function SlotRow({ slot, vote, currentUserId }) {
  const filled = !!vote;
  const isMine = filled && vote.user_id === currentUserId;
  const Icon = slot.Icon;
  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          filled
            ? "bg-success-soft text-success"
            : "bg-surface-container-high text-text-subtle"
        }`}
      >
        {filled ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text">{slot.label}</span>
          {isMine && (
            <span className="text-[9px] uppercase tracking-widest font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
              you
            </span>
          )}
        </div>
        {filled ? (
          <div className="text-xs text-text-muted mt-0.5">
            <span className="font-semibold text-text">{vote.vendor}</span>
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

  return (
    <div>
      <div className="space-y-1 mb-3">
        {SLOT_DEFS.filter(
          (s) => s.key !== "respective" || !!respectiveCode,
        ).map((s) => (
          <SlotRow
            key={s.key}
            slot={s}
            vote={consents[s.key]}
            currentUserId={user?.id}
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

  // Admin can act on the currently-active stage; otherwise role must match.
  // We key off the chain_stage directly (not the derived `state`) so any
  // discrepancy between the two — e.g. an unexpected `lastAction` value —
  // can't accidentally hide the buttons. As long as the RFQ is NOT closed
  // and the chain is currently AT this stage, the buttons should render.
  const isAdmin = user?.role === "admin";
  const matchesRole = user?.role === stage;
  const canActHere = !isClosed && current === stage && (isAdmin || matchesRole);

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
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onAct(stage, "approve")}
              className="px-2.5 py-1 text-xs font-semibold text-success bg-success-soft hover:bg-success/20 rounded"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => onAct(stage, "hold")}
              className="px-2.5 py-1 text-xs font-semibold text-warning bg-warning-soft hover:bg-warning/20 rounded"
            >
              {state === "hold" ? "Update Hold" : "Hold"}
            </button>
            <button
              type="button"
              onClick={() => onAct(stage, "reject")}
              className="px-2.5 py-1 text-xs font-semibold text-danger bg-danger-soft hover:bg-danger/20 rounded"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AwardFlowPanel({ rfq, user, candidateVendors, onChange }) {
  const updateStatus = useRFQStore((s) => s.updateStatus);
  const toast = useToast();

  const onAct = async (stage, action) => {
    let comments = null;
    if (action === "hold" || action === "reject") {
      comments = window.prompt(
        action === "hold"
          ? "Reason for hold (visible to all reviewers):"
          : "Reason for reject (visible to all reviewers):",
        "",
      );
      if (comments === null) return; // cancelled
    }
    try {
      const updated = await updateStatus(rfq.number, action, comments);
      onChange?.(updated);
      toast.success(`${stage.toUpperCase()} ${action}ed`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Action failed");
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
    </Card>
  );
}
