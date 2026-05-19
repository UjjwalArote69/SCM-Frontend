import { useEffect, useRef, useState } from "react";
import {
  Building2, Palette, Plug, User, Loader2, Upload, Trash2, ShieldCheck,
  Check, Camera, Lock, Smartphone,
} from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import Skeleton from "../../../components/feedback/Skeleton.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import useSettingsStore from "../settings/store.js";
import { useAuthStore } from "../../auth/store.js";
import authApi from "../../auth/api.js";
import InstallAppButton from "../../../components/pwa/InstallAppButton.jsx";

function SkSettingsForm() {
  return (
    <div>
      <Skeleton className="h-6 w-48 mb-6" />
      <div className="space-y-5 max-w-xl">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-32 mt-6" />
      </div>
    </div>
  );
}

const TABS = [
  { key: "company",      label: "Company",        icon: Building2 },
  { key: "branding",     label: "Branding",       icon: Palette },
  { key: "integrations", label: "Integrations",   icon: Plug },
  { key: "access",       label: "Access Control", icon: ShieldCheck },
  { key: "install",      label: "Install App",    icon: Smartphone },
  { key: "profile",      label: "My Profile",     icon: User },
];

const inputCls =
  "w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm text-text outline-none";

export default function SettingsPage() {
  const [tab, setTab] = useState("company");
  const { data, loading, fetch } = useSettingsStore();

  useEffect(() => { fetch().catch(() => {}); }, [fetch]);

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader title="Settings" subtitle="Configure your organization and preferences" />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <aside className="lg:w-56 shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors shrink-0 lg:shrink ${
                    active
                      ? "bg-primary-soft text-primary font-semibold"
                      : "text-text-muted hover:bg-surface-container-low"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 bg-surface-container-lowest p-5 sm:p-8 rounded-lg border border-border min-h-[400px]">
          {loading && !data ? (
            <SkSettingsForm />
          ) : (
            <>
              {tab === "company" && <CompanyTab />}
              {tab === "branding" && <BrandingTab />}
              {tab === "integrations" && <IntegrationsTab />}
              {tab === "access" && <AccessTab />}
              {tab === "install" && <InstallTab />}
              {tab === "profile" && <ProfileTab />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function CompanyTab() {
  const toast = useToast();
  const { data, save, saving } = useSettingsStore();
  const [form, setForm] = useState(() => pick(data, ["legal_name", "address", "gstin", "pan", "currency", "fiscal_year_start"]));

  useEffect(() => { setForm(pick(data, ["legal_name", "address", "gstin", "pan", "currency", "fiscal_year_start"])); }, [data]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onSave = async () => {
    try { await save(form); toast.success("Company settings saved"); }
    catch (e) { toast.error(e?.response?.data?.message ?? "Save failed"); }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-1">Company Details</h2>
      <p className="text-sm text-text-muted mb-6">
        These values appear on PDFs (PR/PO/RFQ/GRN/Payment/Invoice letterheads), email footers, and the sidebar wordmark.
      </p>
      <div className="space-y-5 max-w-xl">
        <Field label="Legal Name *">
          <input className={inputCls} value={form.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} />
        </Field>
        <Field label="Registered Address">
          <textarea rows={3} className={`${inputCls} resize-none`} value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="GSTIN"><input className={`${inputCls} font-mono`} value={form.gstin ?? ""} onChange={(e) => set("gstin", e.target.value)} /></Field>
          <Field label="PAN"><input className={`${inputCls} font-mono`} value={form.pan ?? ""} onChange={(e) => set("pan", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Default Currency">
            <select className={inputCls} value={form.currency ?? "INR"} onChange={(e) => set("currency", e.target.value)}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </Field>
          <Field label="Fiscal Year Start">
            <select className={inputCls} value={form.fiscal_year_start ?? "April"} onChange={(e) => set("fiscal_year_start", e.target.value)}>
              <option>April</option><option>January</option><option>July</option>
            </select>
          </Field>
        </div>
        <button onClick={onSave} disabled={saving} className="px-6 py-2 bg-primary hover:brightness-110 text-primary-foreground rounded-md font-bold text-sm disabled:opacity-50">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

const PRESET_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#9333ea", "#f97316", "#0ea5e9"];

function BrandingTab() {
  const toast = useToast();
  const { data, save, saving, uploadLogo, deleteLogo } = useSettingsStore();
  const [form, setForm] = useState(() => pick(data, ["primary_color", "email_footer"]));
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => { setForm(pick(data, ["primary_color", "email_footer"])); }, [data]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    try { await save(form); toast.success("Branding saved"); }
    catch (e) { toast.error(e?.response?.data?.message ?? "Save failed"); }
  };

  const onUpload = async (file) => {
    if (!file) return;
    if (file.size > 512 * 1024) { toast.error("Logo must be < 512 KB"); return; }
    setUploading(true);
    try { await uploadLogo(file); toast.success("Logo uploaded"); }
    catch (e) { toast.error(e?.response?.data?.message ?? "Upload failed"); }
    finally { setUploading(false); }
  };

  const onRemoveLogo = async () => {
    if (!window.confirm("Remove logo?")) return;
    try { await deleteLogo(); toast.success("Logo removed"); }
    catch (e) { toast.error(e?.response?.data?.message ?? "Remove failed"); }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-1">Branding</h2>
      <p className="text-sm text-text-muted mb-6">
        These values drive PDF letterheads (PR/PO/RFQ/GRN/Payment/Invoice) and email footers.
        The live app's chrome (sidebar, topbar) uses the canonical theme defined in
        <code className="font-mono text-xs bg-surface-container-low px-1 mx-1 rounded">DESIGN.md</code>
        and is not affected by changes here.
      </p>
      <div className="space-y-6 max-w-xl">
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-2 uppercase">Company Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded bg-surface-container-high flex items-center justify-center overflow-hidden border border-border">
              {data?.logo_url
                ? <img src={data.logo_url} alt="logo" className="w-full h-full object-contain" />
                : <span className="text-primary font-black text-2xl">M</span>}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="file" ref={fileInput} accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => onUpload(e.target.files?.[0])} className="hidden" />
                <button
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-semibold hover:bg-surface-container-low disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {data?.logo_url ? "Replace" : "Upload"}
                </button>
                {data?.logo_url && (
                  <button onClick={onRemoveLogo} className="flex items-center gap-2 px-3 py-2 border border-danger/30 text-danger rounded-md text-sm font-semibold hover:bg-danger-soft/40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-text-muted">PNG, JPG, SVG, or WebP. Max 512 KB.</p>
            </div>
          </div>
        </div>

        <Field label="Primary Color">
          <div className="flex flex-wrap gap-3 items-center mt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => set("primary_color", c)}
                className={`w-10 h-10 rounded-full border-2 transition-transform ${
                  form.primary_color === c ? "border-text scale-110" : "border-transparent hover:border-text-muted"
                }`}
                style={{ background: c }}
                title={c}
              />
            ))}
            <input
              type="text"
              value={form.primary_color ?? ""}
              onChange={(e) => set("primary_color", e.target.value)}
              placeholder="#hex"
              className={`${inputCls} font-mono w-32`}
            />
          </div>
          <p className="text-xs text-text-muted mt-2">
            Live preview is active. Click <strong className="text-text">Save</strong> below to persist.
          </p>
        </Field>

        <Field label="Email Footer Text">
          <textarea rows={3} className={`${inputCls} resize-none`} value={form.email_footer ?? ""} onChange={(e) => set("email_footer", e.target.value)} />
        </Field>

        <button onClick={onSave} disabled={saving} className="px-6 py-2 bg-primary hover:brightness-110 text-primary-foreground rounded-md font-bold text-sm disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Integrations ─────────────────────────────────────────────────────────
//
// Locked read-only roadmap. The transport wiring for these integrations
// (real SMTP send, Slack webhook POST, Tally bridge, etc.) hasn't been
// implemented yet, so the tab is intentionally non-interactive — admins
// can see what's planned without configuring credentials that won't be
// honoured. Replace this block with the live UI when transport code lands.

const INTEGRATION_ROADMAP = [
  { name: "Gmail / SMTP",        blurb: "Outbound email for password resets and document delivery." },
  { name: "Slack Notifications", blurb: "Post approval events and damage alerts into a Slack channel." },
  { name: "Tally ERP",           blurb: "Push approved POs and GRNs into Tally for financial accounting." },
  { name: "Razorpay Payments",   blurb: "Process vendor payments via Razorpay Payouts." },
  { name: "SAP",                 blurb: "Sync purchase orders and invoices with an SAP S/4HANA backend." },
];

function IntegrationsTab() {
  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-1 flex items-center gap-2">
        Integrations
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-warning-soft text-warning">
          <Lock className="h-3 w-3" /> Locked
        </span>
      </h2>
      <p className="text-sm text-text-muted mb-6">
        Outbound integrations for email, notifications, and ERP / payments
        are on the roadmap. Configuration is disabled until the transport
        layer is wired — this avoids storing credentials that wouldn't
        actually be used.
      </p>

      <div className="bg-warning-soft/40 border border-warning/30 rounded-lg p-3 mb-6 flex gap-2 items-start text-sm">
        <Lock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div className="text-text-muted">
          <span className="font-bold text-text">Why is this locked?</span> The integrations
          below need server-side transport code (SMTP send, Slack webhook POST, ERP bridge)
          before saving credentials makes sense. Once that lands, this tab will be re-opened
          with per-integration configuration drawers.
        </div>
      </div>

      <div className="space-y-3">
        {INTEGRATION_ROADMAP.map((i) => (
          <div
            key={i.name}
            className="bg-surface-container-low rounded-lg border border-border p-4 flex items-center gap-3 sm:gap-4 opacity-90"
          >
            <div className="h-10 w-10 rounded-lg bg-surface-container text-text-muted flex items-center justify-center shrink-0">
              <Plug className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-text truncate">{i.name}</span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-surface-container text-text-muted">
                  Planned
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">{i.blurb}</p>
            </div>
            <span
              className="text-text-subtle p-2"
              title="Configuration unavailable while the integration is locked"
            >
              <Lock className="h-4 w-4" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Access Control ───────────────────────────────────────────────────────

const GRN_ROLE_OPTIONS = [
  { value: "admin",            label: "Administrator" },
  { value: "site_person",      label: "Site Person" },
  { value: "project_manager",  label: "Project Manager" },
  { value: "purchase_officer", label: "Purchase Officer" },
  { value: "hod",              label: "Head of Department" },
  { value: "manager",          label: "Manager" },
  { value: "employee",         label: "Employee" },
  { value: "accountant",       label: "Accountant" },
  { value: "cfo",              label: "CFO" },
  { value: "ceo",              label: "CEO" },
  { value: "director",         label: "Director" },
];

function AccessTab() {
  const toast = useToast();
  const { data, save, saving } = useSettingsStore();

  const initial = Array.isArray(data?.grn_creator_roles) && data.grn_creator_roles.length > 0
    ? data.grn_creator_roles
    : ["admin", "site_person", "project_manager"];

  const [selected, setSelected] = useState(() => new Set(initial));

  useEffect(() => {
    const next = Array.isArray(data?.grn_creator_roles) && data.grn_creator_roles.length > 0
      ? data.grn_creator_roles
      : ["admin", "site_person", "project_manager"];
    setSelected(new Set(next));
  }, [data]);

  const toggle = (role) => {
    if (role === "admin") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const onSave = async () => {
    const roles = Array.from(selected);
    if (!roles.includes("admin")) roles.push("admin");
    try {
      await save({ grn_creator_roles: roles });
      toast.success("GRN access updated");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Save failed");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-2">Access Control</h2>
      <p className="text-sm text-text-muted mb-6">
        Pick the roles allowed to create GRNs (Goods Receipt Notes). This is mirrored in
        Roles & Permissions — both views write to the same role-permissions matrix.
        Administrators always have access.
      </p>

      <div className="bg-surface-container-low rounded-lg border border-border p-5 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text">Who can create a GRN</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GRN_ROLE_OPTIONS.map((opt) => {
            const checked = selected.has(opt.value);
            const locked = opt.value === "admin";
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                  checked
                    ? "bg-primary-soft border-primary/40"
                    : "bg-surface-container-lowest border-border hover:bg-surface-container-low"
                } ${locked ? "opacity-90 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  disabled={locked}
                  onChange={() => toggle(opt.value)}
                />
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border ${
                    checked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-outline-variant bg-surface-container-lowest"
                  }`}
                >
                  {checked && <Check className="h-3.5 w-3.5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text font-medium">{opt.label}</div>
                  <div className="text-xs text-text-muted">{opt.value}</div>
                </div>
                {locked && (
                  <span className="text-[10px] uppercase tracking-wider text-text-subtle">
                    Always
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-5 py-2 rounded-md disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setName(user?.name ?? ""); }, [user?.name]);

  const onSaveProfile = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const updated = await authApi.updateMe({ name });
      setUser?.(updated);
      toast.success("Profile saved");
    } catch (e) { toast.error(e?.response?.data?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword) { toast.error("Both passwords required"); return; }
    if (newPassword !== confirm) { toast.error("Passwords don't match"); return; }
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      await authApi.updateMe({ current_password: currentPassword, password: newPassword, password_confirmation: confirm });
      toast.success("Password changed");
      setCurrent(""); setNew(""); setConfirm("");
    } catch (e) { toast.error(e?.response?.data?.message ?? "Password change failed"); }
    finally { setSaving(false); }
  };

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be < 2 MB"); return; }
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) { toast.error("JPG, PNG, or WebP only"); return; }
    setAvatarBusy(true);
    try {
      const updated = await authApi.uploadAvatar(file);
      setUser?.(updated);
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not upload image");
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onRemoveAvatar = async () => {
    if (!user?.avatar_url) return;
    if (!window.confirm("Remove your profile picture?")) return;
    setAvatarBusy(true);
    try {
      const updated = await authApi.removeAvatar();
      setUser?.(updated);
      toast.success("Profile picture removed");
    } catch {
      toast.error("Could not remove photo");
    } finally {
      setAvatarBusy(false);
    }
  };

  const initials = (user?.name ?? "?")
    .split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-1">My Profile &amp; Security</h2>
      <p className="text-sm text-text-muted mb-6">
        These are your personal account settings, not the company's.
      </p>

      <div className="space-y-6 max-w-xl">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => !avatarBusy && fileRef.current?.click()}
            disabled={avatarBusy}
            className="group relative w-20 h-20 rounded-2xl bg-primary-soft text-primary shadow-sm overflow-hidden disabled:opacity-80 transition-shadow hover:shadow-md shrink-0"
            aria-label="Change profile picture"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-black">
                {initials}
              </span>
            )}
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" strokeWidth={2.25} />
            </span>
            {avatarBusy && (
              <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPickAvatar}
          />
          <div className="space-y-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm font-semibold hover:bg-surface-container-low disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" /> {user?.avatar_url ? "Change" : "Upload"}
              </button>
              {user?.avatar_url && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={avatarBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-danger/30 text-danger text-sm font-semibold hover:bg-danger-soft/40 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted">JPG, PNG, or WebP. Max 2 MB.</p>
          </div>
        </div>

        <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><input className={inputCls} value={user?.email ?? ""} disabled /></Field>
        <Field label="Role"><input className={inputCls} value={user?.role ?? ""} disabled /></Field>
        <button onClick={onSaveProfile} disabled={saving} className="px-6 py-2 bg-primary hover:brightness-110 text-primary-foreground rounded-md font-bold text-sm disabled:opacity-50">
          {saving ? "Saving…" : "Save Profile"}
        </button>

        <hr className="border-border" />
        <h3 className="text-lg font-bold text-text">Change Password</h3>
        <Field label="Current Password"><input type="password" className={inputCls} value={currentPassword} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field label="New Password"><input type="password" className={inputCls} value={newPassword} onChange={(e) => setNew(e.target.value)} /></Field>
        <Field label="Confirm New"><input type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        <button onClick={onChangePassword} disabled={saving || !currentPassword || !newPassword} className="px-6 py-2 bg-primary hover:brightness-110 text-primary-foreground rounded-md font-bold text-sm disabled:opacity-50">
          {saving ? "Saving…" : "Change Password"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">{label}</label>
      {children}
    </div>
  );
}

function pick(obj, keys) {
  const out = {};
  if (!obj) return out;
  keys.forEach((k) => (out[k] = obj[k] ?? ""));
  return out;
}

function InstallTab() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold text-text mb-1 tracking-tight">
          Install Suppliers First
        </h3>
        <p className="text-sm text-text-muted">
          Add the app to your device for a faster, full-screen experience.
          Works on Windows, macOS, Android, and iPhone / iPad.
        </p>
      </div>
      <InstallAppButton />
    </div>
  );
}
