import { useState } from "react";
import { Building2, Palette, Plug, User } from "lucide-react";
import PageHeader from "../../../components/data/PageHeader.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

const TABS = [
  { key: "company", label: "Company", icon: Building2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "profile", label: "My Profile", icon: User },
];

const inputCls = "w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm text-text outline-none";

export default function SettingsPage() {
  const [tab, setTab] = useState("company");
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

        <main className="flex-1 bg-surface-container-lowest p-8 rounded-lg border border-border">
          {tab === "company" && <CompanyTab />}
          {tab === "branding" && <BrandingTab />}
          {tab === "integrations" && <IntegrationsTab />}
          {tab === "profile" && <ProfileTab />}

        </main>
      </div>
    </div>
  );
}

function SaveButton({ label = "Save" }) {
  const toast = useToast();
  return (
    <button onClick={() => toast.success(`${label === "Save" ? "Settings" : label.replace("Save ", "")} saved`)} className="px-6 py-2 bg-primary hover:brightness-110 text-primary-foreground rounded-md font-bold text-sm">
      {label}
    </button>
  );
}

function CompanyTab() {
  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">Company Details</h2>
      <div className="space-y-5 max-w-xl">
        <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Legal Name *</label><input className={inputCls} defaultValue="Meka Industries Pvt Ltd" /></div>
        <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Registered Address</label><textarea rows={3} className={`${inputCls} resize-none`} defaultValue="Plot 12, Industrial Area, Sector 58, Noida, UP 201301" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">GSTIN</label><input className={`${inputCls} font-mono`} defaultValue="09AADCB2230M1Z2" /></div>
          <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">PAN</label><input className={`${inputCls} font-mono`} defaultValue="AADCB2230M" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Default Currency</label>
            <select className={inputCls}><option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option></select></div>
          <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Fiscal Year Start</label>
            <select className={inputCls}><option>April</option><option>January</option></select></div>
        </div>
        <SaveButton label="Save Changes" />
      </div>
    </div>
  );
}

function BrandingTab() {
  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">Branding</h2>
      <div className="space-y-6 max-w-xl">
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-2 uppercase">Company Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded bg-surface-container-high flex items-center justify-center text-primary font-black text-2xl">M</div>
            <div>
              <button className="px-4 py-2 border border-border rounded-md text-sm font-semibold hover:bg-surface-container-low">Upload New</button>
              <p className="text-xs text-text-muted mt-2">PNG or SVG, max 500 KB</p>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-2 uppercase">Primary Color</label>
          <div className="flex gap-3">
            {["#dc2626", "#2563eb", "#16a34a", "#9333ea", "#f97316"].map((c) => (
              <button key={c} className="w-10 h-10 rounded-full border-2 border-transparent hover:border-text" style={{ background: c }} />
            ))}
          </div>
        </div>
        <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Email Footer Text</label><textarea rows={3} className={`${inputCls} resize-none`} defaultValue="This is an automated message from Meka SCM." /></div>
        <SaveButton />
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const toast = useToast();
  const [integrations, setIntegrations] = useState([
    { name: "Gmail / SMTP", status: "connected" },
    { name: "Slack Notifications", status: "not-connected" },
    { name: "Tally ERP", status: "connected" },
    { name: "Razorpay Payments", status: "not-connected" },
    { name: "SAP", status: "not-connected" },
  ]);

  const toggle = (name) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.name === name
          ? { ...i, status: i.status === "connected" ? "not-connected" : "connected" }
          : i,
      ),
    );
    const after = integrations.find((i) => i.name === name)?.status === "connected" ? "disconnected" : "connected";
    toast.success(`${name} ${after}`);
  };
  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">Integrations</h2>
      <div className="space-y-3">
        {integrations.map((i) => (
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
  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">My Profile &amp; Security</h2>
      <div className="space-y-5 max-w-xl">
        <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Name</label><input className={inputCls} defaultValue="Rahul Sharma" /></div>
        <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Email</label><input className={inputCls} defaultValue="rahul@meka.in" disabled /></div>
        <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Phone</label><input className={inputCls} defaultValue="+91 98765 43210" /></div>
        <hr className="border-border" />
        <h3 className="text-lg font-bold text-text">Change Password</h3>
        <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Current Password</label><input type="password" className={inputCls} /></div>
        <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">New Password</label><input type="password" className={inputCls} /></div>
        <div><label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Confirm New</label><input type="password" className={inputCls} /></div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded text-primary" />
          <span className="text-sm text-text">Enable two-factor authentication</span>
        </label>
        <SaveButton />
      </div>
    </div>
  );
}
