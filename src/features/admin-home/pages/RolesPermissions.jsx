import PageHeader from "../../../components/data/PageHeader.jsx";
import { Check, Shield } from "lucide-react";

const ROLES = ["Employee", "Manager", "HOD", "Admin"];
const PERMS = [
  { module: "Purchase Requests", matrix: [["View own", "Create"], ["+ Approve L1", "+ View team"], ["+ Approve L2", "+ View dept"], ["All"]] },
  { module: "Purchase Orders", matrix: [["View own"], ["+ Create"], ["+ Approve"], ["All"]] },
  { module: "Quotations", matrix: [["—"], ["View, Create RFQ"], ["+ Award"], ["All"]] },
  { module: "GRN", matrix: [["Create"], ["+ Approve"], ["+ Approve"], ["All"]] },
  { module: "Invoices / Payments", matrix: [["—"], ["View"], ["Approve"], ["Process Payment"]] },
  { module: "Masters", matrix: [["—"], ["—"], ["—"], ["Full CRUD"]] },
  { module: "System Admin", matrix: [["—"], ["—"], ["—"], ["Users, Roles, Settings"]] },
];

export default function RolesPermissionsPage() {
  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Matrix of what each role can do"
      />
      <div className="bg-surface-container-lowest rounded-lg overflow-x-auto border border-border">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-surface-container-low text-xs font-semibold text-text-muted uppercase">
              <th className="px-6 py-3 text-left">Module</th>
              {ROLES.map((r) => (
                <th key={r} className="px-6 py-3 text-left">
                  <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> {r}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PERMS.map((p) => (
              <tr key={p.module} className="hover:bg-surface-container-low">
                <td className="px-6 py-4 font-semibold text-text">{p.module}</td>
                {p.matrix.map((caps, i) => (
                  <td key={i} className="px-6 py-4">
                    {caps[0] === "—" ? (
                      <span className="text-text-subtle text-xs">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {caps.map((c) => (
                          <li key={c} className="flex items-center gap-1.5 text-xs text-text">
                            <Check className="h-3.5 w-3.5 text-success" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-muted mt-4">
        Edits are role-wide. For per-user overrides, open a user from <span className="text-primary font-semibold">Users</span> and click the shield icon.
      </p>
    </div>
  );
}
