import Drawer from "../../../components/feedback/Drawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

const MODULES = [
  { key: "pr", label: "Purchase Requests", actions: ["View", "Create", "Approve L1", "Approve L2", "Delete"] },
  { key: "po", label: "Purchase Orders", actions: ["View", "Create", "Approve", "Cancel"] },
  { key: "quote", label: "Quotations", actions: ["View", "Create RFQ", "Compare", "Award"] },
  { key: "grn", label: "GRN", actions: ["View", "Create", "Approve"] },
  { key: "invoice", label: "Invoices", actions: ["View", "Approve", "Process Payment"] },
  { key: "master", label: "Masters", actions: ["View", "Create", "Edit", "Delete"] },
  { key: "admin", label: "System Admin", actions: ["Users", "Roles", "Settings"] },
];

export default function AssignPermissionsDrawer({ open, user, onClose }) {
  const toast = useToast();
  const save = () => {
    toast.success(`Permissions updated for ${user?.name ?? "user"}`);
    onClose?.();
  };
  return (
    <Drawer
      open={open}
      title={`Permissions — ${user?.name ?? ""}`}
      onClose={onClose}
      width="620px"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low">Cancel</button>
          <button onClick={save} className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md">Save Permissions</button>
        </>
      }
    >
      <div className="mb-6 p-4 bg-info-soft text-info rounded text-sm">
        Permissions below are in addition to the role-default permissions for <strong className="capitalize">{user?.role}</strong>.
      </div>
      <div className="space-y-6">
        {MODULES.map((m) => (
          <div key={m.key}>
            <h3 className="text-sm font-bold text-text mb-3 uppercase tracking-wider">{m.label}</h3>
            <div className="flex flex-wrap gap-2">
              {m.actions.map((a) => (
                <label key={a} className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-border rounded-full cursor-pointer hover:border-primary">
                  <input type="checkbox" className="h-4 w-4 rounded text-primary" />
                  <span className="text-sm">{a}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
