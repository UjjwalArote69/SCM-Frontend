import { useEffect, useRef, useState } from "react";
import {
  User as UserIcon,
  Mail,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Building2,
  FileText,
  Calendar,
  Briefcase,
  Camera,
  X,
} from "lucide-react";
import { useAuthStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";
import authApi from "../api.js";
import { labelForRole } from "../../../data/roles.js";
import client from "../../../api/client.js";
import VendorAssetsCard from "../../masters/vendors/VendorAssetsCard.jsx";

function formatDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitial(name) {
  if (!name) return "?";
  const trimmed = name.trim();
  return trimmed[0]?.toUpperCase() ?? "?";
}

function getDepartmentLabel(department) {
  if (!department) return null;
  if (typeof department === "string") return department;
  return department.name ?? department.code ?? null;
}

// ── Shared form bits ─────────────────────────────────────────────────────────
function InputLine({ label, icon: Icon, children, error, help }) {
  return (
    <div className="min-w-0">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </label>
      {children}
      {error && (
        <p className="text-xs text-danger mt-1 font-medium flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {help && !error && (
        <p className="text-xs text-text-subtle mt-1">{help}</p>
      )}
    </div>
  );
}

const inputCls = (error) =>
  `w-full bg-surface-container-lowest border-0 border-b-2 ${
    error ? "border-danger bg-danger-soft/30" : "border-outline-variant"
  } focus:border-primary px-3 py-2.5 sm:py-2 text-sm text-text outline-none transition-colors disabled:opacity-60`;

function SectionCard({ children, className = "" }) {
  return (
    <section
      className={`bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-border shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({ icon: Icon, title, subtitle, trailing }) {
  return (
    <div className="flex flex-wrap items-start gap-3 mb-4 sm:mb-5">
      <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base sm:text-lg font-bold text-text leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-xs text-text-muted mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="shrink-0 self-center">{trailing}</div>}
    </div>
  );
}

// ── Profile Summary (left rail) ──────────────────────────────────────────────
function ProfileSummaryCard({ user }) {
  const setUser     = useAuthStore((s) => s.setUser);
  const toast       = useToast();
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const initial    = getInitial(user.name);
  const roleLabel  = labelForRole(user.role);
  const department = getDepartmentLabel(user.department);
  const memberSince = formatDate(user.created_at);
  const avatarUrl  = user.avatar_url;

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2 MB");
      e.target.value = "";
      return;
    }
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      toast.error("Only JPG, PNG, or WebP images are allowed");
      e.target.value = "";
      return;
    }

    setBusy(true);
    try {
      const updated = await authApi.uploadAvatar(file);
      setUser(updated);
      toast.success("Profile picture updated");
    } catch (err) {
      const m = err?.response?.data?.message ?? "Could not upload image";
      toast.error(m);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!avatarUrl || busy) return;
    setBusy(true);
    try {
      const updated = await authApi.removeAvatar();
      setUser(updated);
      toast.success("Profile picture removed");
    } catch {
      toast.error("Could not remove photo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5 sm:p-6">
        {/* Avatar — click to upload, hover overlay shows camera icon */}
        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => !busy && fileInputRef.current?.click()}
            disabled={busy}
            className="group relative w-20 h-20 rounded-2xl bg-primary-soft text-primary shadow-sm overflow-hidden disabled:opacity-80 transition-shadow hover:shadow-md shrink-0"
            aria-label="Change profile picture"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.name ?? "avatar"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-3xl font-black leading-none">
                {initial}
              </span>
            )}

            {/* Hover overlay (only visible on hover when idle) */}
            {!busy && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" strokeWidth={2.25} />
              </div>
            )}

            {/* Loading state */}
            {busy && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-text leading-tight truncate">
              {user.name ?? "—"}
            </h2>
            <p className="text-xs text-text-muted truncate mt-0.5">
              {user.email ?? "—"}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container text-text-muted text-[10px] font-bold uppercase tracking-widest border border-border">
              <Shield className="h-3 w-3" strokeWidth={2.5} />
              {roleLabel}
            </div>
          </div>
        </div>

        {/* Upload helper line */}
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => !busy && fileInputRef.current?.click()}
            disabled={busy}
            className="text-[11px] font-semibold text-text-muted hover:text-text disabled:opacity-60 inline-flex items-center gap-1"
          >
            <Camera className="h-3 w-3" /> {avatarUrl ? "Change photo" : "Upload photo"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="text-[11px] font-semibold text-text-muted hover:text-danger disabled:opacity-60 inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          )}
        </div>

        {(department || memberSince) && (
          <div className="mt-5 pt-5 border-t border-border space-y-3">
            {department && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-info-soft flex items-center justify-center shrink-0">
                  <Briefcase className="h-3.5 w-3.5 text-info" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                    Department
                  </div>
                  <div className="text-sm text-text font-semibold truncate">
                    {department}
                  </div>
                </div>
              </div>
            )}
            {memberSince && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-success-soft flex items-center justify-center shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                    Member since
                  </div>
                  <div className="text-sm text-text font-semibold truncate">
                    {memberSince}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Account section ──────────────────────────────────────────────────────────
function AccountSection({ user }) {
  const setUser = useAuthStore((s) => s.setUser);
  const toast = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Name is required");
      return;
    }
    if (trimmed === user?.name) {
      toast.info("No changes to save.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const updated = await authApi.updateMe({ name: trimmed });
      setUser(updated);
      toast.success("Profile updated");
    } catch (error) {
      const m = error?.response?.data?.message ?? "Could not save";
      toast.error(m);
      setErr(m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard>
      <SectionHeading
        icon={UserIcon}
        title="Account Information"
        subtitle="Update your name. Email and role are managed by admin."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <InputLine label="Full Name" icon={UserIcon} error={err}>
          <input
            className={inputCls(err)}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (err) setErr(null);
            }}
          />
        </InputLine>
        <InputLine label="Email" icon={Mail} help="Email is managed by admin">
          <input
            className={inputCls(false)}
            value={user?.email ?? ""}
            readOnly
            disabled
          />
        </InputLine>
      </div>
      <div className="pt-4 sm:pt-5 mt-4 sm:mt-5 border-t border-border">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-primary hover:brightness-110 text-primary-foreground rounded-md font-bold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </SectionCard>
  );
}

// ── Password section ─────────────────────────────────────────────────────────
function PasswordSection() {
  const toast = useToast();
  const [cur,     setCur]     = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [show,    setShow]    = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [errors,  setErrors]  = useState({});

  const reset = () => {
    setCur("");
    setNext("");
    setConfirm("");
    setErrors({});
  };

  const save = async () => {
    const e = {};
    if (!cur) e.current_password = "Current password is required";
    if (!next || next.length < 8) e.password = "New password must be at least 8 characters";
    if (confirm !== next) e.confirm = "Passwords don't match";
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      await authApi.updateMe({ current_password: cur, password: next });
      toast.success("Password updated");
      reset();
    } catch (error) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors) {
        const flat = Object.fromEntries(
          Object.entries(serverErrors).map(([k, v]) => [
            k,
            Array.isArray(v) ? v[0] : v,
          ]),
        );
        setErrors(flat);
      }
      toast.error(error?.response?.data?.message ?? "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard>
      <SectionHeading
        icon={Lock}
        title="Security"
        subtitle="Change your password. Use at least 8 characters."
        trailing={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-xs font-semibold text-text-muted hover:text-primary flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-surface-container transition-colors"
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{show ? "Hide" : "Show"}</span>
          </button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <div className="sm:col-span-2">
          <InputLine label="Current Password" error={errors.current_password}>
            <input
              type={show ? "text" : "password"}
              className={inputCls(errors.current_password)}
              value={cur}
              onChange={(e) => {
                setCur(e.target.value);
                if (errors.current_password)
                  setErrors((p) => ({ ...p, current_password: undefined }));
              }}
              autoComplete="current-password"
            />
          </InputLine>
        </div>
        <InputLine label="New Password" error={errors.password} help="Minimum 8 characters">
          <input
            type={show ? "text" : "password"}
            className={inputCls(errors.password)}
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
            }}
            autoComplete="new-password"
          />
        </InputLine>
        <InputLine label="Confirm New Password" error={errors.confirm}>
          <input
            type={show ? "text" : "password"}
            className={inputCls(errors.confirm)}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
            }}
            autoComplete="new-password"
          />
        </InputLine>
      </div>
      <div className="pt-4 sm:pt-5 mt-4 sm:mt-5 border-t border-border flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-primary hover:brightness-110 text-primary-foreground rounded-md font-bold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Updating…" : "Update Password"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="w-full sm:w-auto px-5 py-2.5 sm:py-2 border border-border text-text hover:bg-surface-container-low rounded-md font-medium text-sm disabled:opacity-60"
        >
          Clear
        </button>
      </div>
    </SectionCard>
  );
}

// ── Vendor business card ─────────────────────────────────────────────────────
function VendorField({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest font-bold text-text-subtle mb-1">
        {label}
      </div>
      <div className="text-sm font-medium text-text break-words">{value || "—"}</div>
    </div>
  );
}

function VendorBusinessCard({ user }) {
  const [vendor,  setVendor]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client
      .get("/vendors", { params: { q: user?.email ?? "" } })
      .then((r) => {
        if (cancelled) return;
        const v = (r.data?.data ?? []).find((x) => x.email_address_1 === user?.email);
        setVendor(v ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.email]);

  if (loading) {
    return (
      <SectionCard>
        <div className="flex items-center justify-center py-6 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading vendor info…
        </div>
      </SectionCard>
    );
  }
  if (!vendor) {
    return (
      <section className="bg-warning-soft/40 p-4 sm:p-6 rounded-xl border border-warning/30">
        <div className="text-sm text-warning">
          No vendor profile is linked to your account. Contact admin.
        </div>
      </section>
    );
  }

  const statusBadge = (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
        vendor.approval_status === "approved"
          ? "bg-success-soft text-success"
          : vendor.approval_status === "pending"
            ? "bg-warning-soft text-warning"
            : "bg-danger-soft text-danger"
      }`}
    >
      {vendor.approval_status}
    </span>
  );

  return (
    <SectionCard>
      <SectionHeading
        icon={Building2}
        title="Business Details"
        subtitle="Managed by admin — contact procurement to update"
        trailing={statusBadge}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        <VendorField label="Vendor Code"     value={vendor.code} />
        <VendorField label="Vendor Name"     value={vendor.vendor_name} />
        <VendorField label="Deals In"        value={vendor.deals_in} />
        <VendorField label="Legal Status"    value={vendor.vendor_status} />
        <VendorField label="Primary Contact" value={vendor.contact_person_1} />
        <VendorField label="Phone"           value={vendor.contact_no} />
        <VendorField label="GST"             value={vendor.gst} />
        <VendorField label="PAN"             value={vendor.pan} />
        <VendorField
          label="Bank"
          value={vendor.bank_name ? `${vendor.bank_name} · ${vendor.branch_name ?? ""}` : "—"}
        />
        <VendorField
          label="Account / IFSC"
          value={
            vendor.account_number && vendor.ifsc_code
              ? `••••${String(vendor.account_number).slice(-4)} · ${vendor.ifsc_code}`
              : "—"
          }
        />
        <div className="sm:col-span-2 xl:col-span-3">
          <VendorField
            label="Address"
            value={
              [vendor.address, vendor.city, vendor.state, vendor.country, vendor.zipcode]
                .filter(Boolean)
                .join(", ") || "—"
            }
          />
        </div>
      </div>
      <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-border text-xs text-text-muted flex items-start gap-2">
        <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Vendor-company details (GST, PAN, bank, address) are managed by admin.
          Contact procurement to update these.
        </span>
      </div>
    </SectionCard>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const user    = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading profile…
      </div>
    );
  }

  const isVendor = user.role === "vendor";

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Page header — matches PR/Quotations/PO list pattern */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
          My Profile
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Manage your account, security, and personal information
        </p>
      </div>

      {/* Two-pane settings layout:
          — Mobile: rail stacks on top of content
          — md/lg: rail collapses back to top (still narrow content area)
          — xl+: rail anchors to the left at 300px, content fills the rest */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-4 sm:gap-6">

        {/* Left rail */}
        <aside className="min-w-0">
          <div className="xl:sticky xl:top-6">
            <ProfileSummaryCard user={user} />
          </div>
        </aside>

        {/* Right pane */}
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <AccountSection user={user} />
          <PasswordSection />
          {isVendor && <VendorBusinessCard user={user} />}
          {isVendor && <VendorAssetsCard userEmail={user.email} />}
        </div>
      </div>
    </div>
  );
}
