/**
 * Print-only letterhead — appears at the top of every printable detail page
 * (PR, PO, RFQ, GRN, Payment). Reuses the `print-only` utility class wired
 * up in `index.css` so it's hidden on screen but rendered when the user
 * triggers Print or "Save as PDF".
 */
export default function PrintLetterhead({ docType, docNumber, subtitle }) {
  return (
    <div className="print-only mb-6">
      <div className="flex items-start justify-between pb-4 border-b-2 border-black">
        <div>
          <div className="text-[10pt] font-bold tracking-tight">
            Suppliers First · Meka Group
          </div>
          <div className="text-[8pt] text-gray-600 mt-0.5">
            Procurement
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8pt] uppercase tracking-[0.1em] font-bold text-gray-600">
            {docType}
          </div>
          {docNumber && (
            <div className="text-[13pt] font-bold tracking-tight">
              {docNumber}
            </div>
          )}
          {subtitle && (
            <div className="text-[8pt] text-gray-700 mt-0.5">{subtitle}</div>
          )}
          <div className="text-[8pt] text-gray-600 mt-0.5">
            Printed: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
