import { CheckCircle2, Clock, XCircle, Mail } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { useVendorIdentity } from "../useVendorIdentity.js";

const STATUS_META = {
  approved: {
    Icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success-soft",
    title: "Approved",
    blurb:
      "Your vendor account is active. You can now receive RFQs and submit quotes.",
  },
  pending: {
    Icon: Clock,
    color: "text-warning",
    bg: "bg-warning-soft",
    title: "Pending Review",
    blurb:
      "Your application is being reviewed by our procurement team. We'll notify you once it's approved.",
  },
  suspended: {
    Icon: XCircle,
    color: "text-danger",
    bg: "bg-danger-soft",
    title: "Suspended",
    blurb:
      "Your vendor account is suspended. Reach out to procurement to resolve this.",
  },
};

function fmtDate(s) {
  if (!s) return null;
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

export default function VendorApplicationStatusPage() {
  const { vendor, loading } = useVendorIdentity();

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <PageHeader title="Application Status" subtitle="Track your onboarding" />
        <div className="bg-surface-container-lowest p-8 rounded-lg border border-border space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-2xl mx-auto">
        <PageHeader title="Application Status" subtitle="Track your onboarding" />
        <div className="bg-warning-soft/40 p-8 rounded-lg border border-warning/30">
          <h2 className="text-lg font-bold text-warning mb-2">
            No vendor profile linked
          </h2>
          <p className="text-sm text-text-muted">
            We couldn&apos;t find a vendor profile linked to your sign-in email.
            Contact procurement so they can connect or create your vendor record.
          </p>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[vendor.approval_status] ?? STATUS_META.pending;
  const submitted = fmtDate(vendor.created_at);
  const updated = fmtDate(vendor.updated_at);
  const isApproved = vendor.approval_status === "approved";

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Application Status"
        subtitle="Track your vendor onboarding progress"
      />

      <div className="bg-surface-container-lowest p-8 rounded-lg border border-border">
        {/* Status banner */}
        <div className="text-center mb-8">
          <div
            className={`w-20 h-20 rounded-full ${meta.bg} flex items-center justify-center mx-auto mb-4`}
          >
            <meta.Icon className={`h-12 w-12 ${meta.color}`} />
          </div>
          <h2 className="text-2xl font-bold text-text mb-1">{meta.title}</h2>
          <p className="text-text-muted text-sm max-w-md mx-auto">{meta.blurb}</p>
        </div>

        {/* Vendor identity */}
        <div className="grid grid-cols-2 gap-4 mb-8 pb-6 border-b border-border">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-subtle mb-1">
              Vendor Code
            </div>
            <div className="text-sm font-mono font-semibold">{vendor.code}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-subtle mb-1">
              Vendor Name
            </div>
            <div className="text-sm font-semibold">{vendor.vendor_name}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-subtle mb-1">
              Deals In
            </div>
            <div className="text-sm">{vendor.deals_in ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-subtle mb-1">
              Email
            </div>
            <div className="text-sm">{vendor.email_address_1 ?? "—"}</div>
          </div>
        </div>

        {/* Timeline (built from real events on the vendor record) */}
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">
          Timeline
        </h3>
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            <div>
              <div className="font-medium text-text">Application submitted</div>
              <div className="text-xs text-text-muted">
                {submitted ?? "—"}
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            {isApproved ? (
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            ) : vendor.approval_status === "suspended" ? (
              <XCircle className="h-5 w-5 text-danger mt-0.5" />
            ) : (
              <Clock className="h-5 w-5 text-warning mt-0.5" />
            )}
            <div>
              <div className="font-medium text-text">
                {isApproved
                  ? "Approved by procurement"
                  : vendor.approval_status === "suspended"
                    ? "Suspended"
                    : "Awaiting procurement review"}
              </div>
              <div className="text-xs text-text-muted">
                {updated && updated !== submitted
                  ? `Last updated ${updated}`
                  : "—"}
              </div>
            </div>
          </li>
        </ul>

        {!isApproved && (
          <div className="mt-8 pt-6 border-t border-border text-xs text-text-muted flex items-start gap-2">
            <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Questions about your application? Reach out to procurement —
              they can flag your record for priority review.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
