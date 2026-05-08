import { useEffect, useRef, useState } from "react";
import { Building2, Palette, Plug, User, Loader2, Upload, Trash2 } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { useToast } from "../../../hooks/useToast.jsx";
import useSettingsStore from "../settings/store.js";
import { useAuthStore } from "../../auth/store.js";
import authApi from "../../auth/api.js";

const TABS = [
  { key: "company", label: "Company", icon: Building2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "profile", label: "My Profile", icon: User },
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

      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <nav className="flex flex-col gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${active ? "bg-primary-soft text-primary font-semibold" : "text-text-muted hover:bg-surface-container-low"}`}>
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 bg-surface-container-lowest p-8 rounded-lg border border-border min-h-[400px]">
          {loading && !data ? (
            <div className="text-center py-12 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
            </div>
          ) : (
            <>
              {tab === "company" && <CompanyTab />}
              {tab === "branding" && <BrandingTab />}
              {tab === "integrations" && <IntegrationsTab />}
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
      <h2 className="text-xl font-bold text-text mb-6">Company Details</h2>
      <div className="space-y-5 max-w-xl">
        <Field label="Legal Name *">
          <input className={inputCls} value={form.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} />
        </Field>
        <Field label="Registered Address">
          <textarea rows={3} className={`${inputCls} resize-none`} value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="GSTIN"><input className={`${inputCls} font-mono`} value={form.gstin ?? ""} onChange={(e) => set("gstin", e.target.value)} /></Field>
          <Field label="PAN"><input className={`${inputCls} font-mono`} value={form.pan ?? ""} onChange={(e) => set("pan", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
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
      <h2 className="text-xl font-bold text-text mb-6">Branding</h2>
      <div className="space-y-6 max-w-xl">
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-2 uppercase">Company Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded bg-surface-container-high flex items-center justify-center overflow-hidden">
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
          <div className="flex gap-3 items-center mt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => set("primary_color", c)}
                className={`w-10 h-10 rounded-full border-2 ${form.primary_color === c ? "border-text" : "border-transparent hover:border-text-muted"}`}
                style={{ background: c }}
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

function IntegrationsTab() {
  const toast = useToast();
  const { data, save, saving } = useSettingsStore();
  const [list, setList] = useState(data?.integrations ?? []);

  useEffect(() => { setList(data?.integrations ?? []); }, [data]);

  const toggle = (name) => {
    setList((prev) =>
      prev.map((i) =>
        i.name === name
          ? { ...i, status: i.status === "connected" ? "not-connected" : "connected" }
          : i,
      ),
    );
  };

  const onSave = async () => {
    try { await save({ integrations: list }); toast.success("Integrations saved"); }
    catch (e) { toast.error(e?.response?.data?.message ?? "Save failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text">Integrations</h2>
        <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-primary hover:brightness-110 text-primary-foreground rounded-md font-bold text-sm disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="text-xs text-text-muted mb-4">Toggle availability, then click Save. (Wiring to actual integrations is a follow-up phase.)</p>
      <div className="space-y-3">
        {list.map((i) => (
          <div key={i.name} className="flex items-center justify-between p-4 bg-surface-container-low rounded border border-border">
            <div className="flex items-center gap-3">
              <Plug className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium text-text">{i.name}</div>
                <div className="text-xs text-text-muted capitalize">{i.status.replace("-", " ")}</div>
              </div>
            </div>
            <button onClick={() => toggle(i.name)} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${i.status === "connected" ? "border border-border text-text hover:bg-surface-container" : "bg-primary text-primary-foreground"}`}>
              {i.status === "connected" ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileTab() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

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

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">My Profile &amp; Security</h2>
      <div className="space-y-5 max-w-xl">
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
